/**
 * POST /api/ai/payslip-analyze
 *
 * Multimodal Gemini extraction over an Israeli payslip (image or PDF).
 * Returns a strict PayslipResult shape that the client renders via
 * SharkAccountantBanner + ResultCard. Never logs the file contents.
 */

import { enforceRateLimit } from '../_shared/rateLimit';
import { safeErrorResponse } from '../_shared/safeError';
import { sanitizeString } from '../_shared/validate';
import {
  PAYSLIP_SYSTEM_PROMPT,
  buildPayslipUserPrompt,
} from './_prompts/payslipSharkPrompt';
import type {
  PayslipAnalyzeError,
  PayslipAnalyzeResponse,
  PayslipAnomaly,
  PayslipAnomalySeverity,
  PayslipDeduction,
  PayslipDeductionKind,
  PayslipErrorCode,
  PayslipMetric,
  PayslipMetricKind,
  PayslipMetricUnit,
  PayslipResult,
} from '../../../src/features/payslip-analyzer/types';

export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY ?? '';
const GEMINI_MODEL = 'gemini-2.5-flash';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;
type AllowedMime = typeof ALLOWED_MIME_TYPES[number];

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const MAX_PDF_BYTES = 8 * 1024 * 1024;   // 8MB
const MAX_BASE64_LENGTH = Math.ceil((MAX_PDF_BYTES * 4) / 3) + 16;

const MAX_DEDUCTIONS = 15;
const MAX_METRICS = 15;
const MAX_ANOMALIES = 10;
const MAX_ACTION_ITEMS = 5;

const DEDUCTION_KINDS: readonly PayslipDeductionKind[] = [
  'income_tax',
  'bituach_leumi',
  'mas_briut',
  'pension_employee',
  'keren_hishtalmut',
  'other',
];

const METRIC_KINDS: readonly PayslipMetricKind[] = [
  'pension_employer',
  'severance',
  'vacation_days',
  'sick_days',
  'credit_points',
  'employer_cost',
  'hourly_rate',
  'overtime_hours',
];

const METRIC_UNITS: readonly PayslipMetricUnit[] = [
  'ILS',
  'days',
  'points',
  'hours',
  'count',
];

const ANOMALY_SEVERITIES: readonly PayslipAnomalySeverity[] = [
  'info',
  'warn',
  'critical',
];

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
}

interface PayslipRequestBody {
  fileBase64?: unknown;
  mimeType?: unknown;
  byteSize?: unknown;
  name?: unknown;
  financialGoal?: unknown;
}

function errorResponse(
  code: PayslipErrorCode,
  message: string,
  status = 200,
): Response {
  const body: PayslipAnalyzeError = { ok: false, code, error: message };
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    },
  });
}

function isAllowedMime(value: unknown): value is AllowedMime {
  return (
    typeof value === 'string' &&
    (ALLOWED_MIME_TYPES as readonly string[]).includes(value)
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampFiniteNumber(value: unknown, min: number, max: number): number {
  if (!isNumber(value)) return 0;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function asTrimmedString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim().slice(0, max);
}

function checkMagicBytes(mimeType: AllowedMime, fileBase64: string): boolean {
  // Decode the first 16 base64 chars → up to 12 raw bytes.
  let header: Buffer;
  try {
    header = Buffer.from(fileBase64.slice(0, 16), 'base64');
  } catch {
    return false;
  }
  if (header.length < 3) return false;

  switch (mimeType) {
    case 'application/pdf':
      // %PDF
      return (
        header[0] === 0x25 &&
        header[1] === 0x50 &&
        header[2] === 0x44 &&
        header[3] === 0x46
      );
    case 'image/jpeg':
      return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    case 'image/png':
      return (
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4e &&
        header[3] === 0x47
      );
    case 'image/webp':
    case 'image/heic':
      // Light-touch: trust the declared mime, since these container headers
      // are more involved and the API gateway will reject malformed payloads.
      return true;
  }
}

function expectedByteSize(base64: string): number {
  // Base64 → raw byte length, accounting for `=` padding.
  const len = base64.length;
  if (len === 0) return 0;
  let padding = 0;
  if (base64.endsWith('==')) padding = 2;
  else if (base64.endsWith('=')) padding = 1;
  return Math.floor((len * 3) / 4) - padding;
}

function normalizeDeduction(value: unknown): PayslipDeduction | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.kind !== 'string') return null;
  const kind = (DEDUCTION_KINDS as readonly string[]).includes(v.kind)
    ? (v.kind as PayslipDeductionKind)
    : 'other';
  const label = asTrimmedString(v.label, 60);
  if (!label) return null;
  const amount = clampFiniteNumber(v.amount, 0, 1_000_000);
  return { kind, label, amount };
}

function normalizeMetric(value: unknown): PayslipMetric | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.kind !== 'string') return null;
  if (!(METRIC_KINDS as readonly string[]).includes(v.kind)) return null;
  if (typeof v.unit !== 'string') return null;
  if (!(METRIC_UNITS as readonly string[]).includes(v.unit)) return null;
  const label = asTrimmedString(v.label, 60);
  if (!label) return null;
  const value_ = clampFiniteNumber(v.value, -1_000_000, 1_000_000);
  return {
    kind: v.kind as PayslipMetricKind,
    label,
    value: value_,
    unit: v.unit as PayslipMetricUnit,
  };
}

function normalizeAnomaly(value: unknown): PayslipAnomaly | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (typeof v.severity !== 'string') return null;
  if (!(ANOMALY_SEVERITIES as readonly string[]).includes(v.severity)) return null;
  const code = asTrimmedString(v.code, 60);
  const title = asTrimmedString(v.title, 100);
  const description = asTrimmedString(v.description, 400);
  const suggestion = asTrimmedString(v.suggestion, 400);
  if (!code || !title || !description) return null;
  return {
    severity: v.severity as PayslipAnomalySeverity,
    code,
    title,
    description,
    suggestion,
  };
}

const SHARK_SUMMARY_FALLBACK =
  'הניתוח הושלם, אך השארק לא הצליח לכתוב סיכום מילולי הפעם. בדוק את הנתונים למטה — הם בידיים שלך.';

function normalizePayslipResult(parsed: unknown): PayslipResult | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;

  const confidence = clampFiniteNumber(p.confidence, 0, 1);

  const payPeriodRaw = asTrimmedString(p.payPeriod, 40);
  const brutto = clampFiniteNumber(p.brutto, 0, 10_000_000);
  const netto = clampFiniteNumber(p.netto, 0, 10_000_000);
  const totalDeductions = clampFiniteNumber(p.totalDeductions, 0, 10_000_000);

  const rawDeductions = Array.isArray(p.deductions) ? p.deductions : [];
  const deductions: PayslipDeduction[] = rawDeductions
    .slice(0, MAX_DEDUCTIONS)
    .map(normalizeDeduction)
    .filter((d): d is PayslipDeduction => d !== null);

  const rawMetrics = Array.isArray(p.metrics) ? p.metrics : [];
  const metrics: PayslipMetric[] = rawMetrics
    .slice(0, MAX_METRICS)
    .map(normalizeMetric)
    .filter((m): m is PayslipMetric => m !== null);

  const rawAnomalies = Array.isArray(p.anomalies) ? p.anomalies : [];
  const anomalies: PayslipAnomaly[] = rawAnomalies
    .slice(0, MAX_ANOMALIES)
    .map(normalizeAnomaly)
    .filter((a): a is PayslipAnomaly => a !== null);

  const sharkSummaryRaw = asTrimmedString(p.sharkSummary, 400);

  const rawActionItems = Array.isArray(p.actionItems) ? p.actionItems : [];
  const actionItems: string[] = rawActionItems
    .slice(0, MAX_ACTION_ITEMS)
    .map((item) => asTrimmedString(item, 200))
    .filter((item) => item.length > 0);

  // Only fail when the numeric core is unusable. A working Gemini call that
  // happens to drop the prose summary still produces a useful card — the
  // user gets the numbers + a fallback summary line rather than a hard error.
  const allCoreNumbersMissing = brutto === 0 && netto === 0 && totalDeductions === 0;
  if (allCoreNumbersMissing) return null;

  return {
    confidence,
    payPeriod: payPeriodRaw || '—',
    brutto,
    netto,
    totalDeductions,
    deductions,
    metrics,
    anomalies,
    sharkSummary: sharkSummaryRaw || SHARK_SUMMARY_FALLBACK,
    actionItems,
  };
}

export async function POST(request: Request): Promise<Response> {
  // Two-tier rate limit per the master plan.
  const blockedMinute = enforceRateLimit(request, 'ai-payslip-min', {
    limit: 3,
    windowSec: 60,
  });
  if (blockedMinute) return blockedMinute;

  const blockedHour = enforceRateLimit(request, 'ai-payslip-hour', {
    limit: 10,
    windowSec: 3600,
  });
  if (blockedHour) return blockedHour;

  if (!GEMINI_API_KEY) {
    return errorResponse('service_unavailable', 'AI service not configured.', 503);
  }

  let body: PayslipRequestBody;
  try {
    body = (await request.json()) as PayslipRequestBody;
  } catch {
    return errorResponse('parse_failed', 'Invalid JSON body.', 400);
  }

  const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : '';
  if (!fileBase64) {
    return errorResponse('parse_failed', 'Missing fileBase64.', 400);
  }
  if (fileBase64.length > MAX_BASE64_LENGTH) {
    return errorResponse('file_too_large', 'File exceeds the maximum size.', 413);
  }

  if (!isAllowedMime(body.mimeType)) {
    return errorResponse('invalid_mime', 'Unsupported file type.', 415);
  }
  const mimeType: AllowedMime = body.mimeType;

  if (!isNumber(body.byteSize) || body.byteSize <= 0) {
    return errorResponse('parse_failed', 'Missing byteSize.', 400);
  }
  const byteSize = Math.floor(body.byteSize);

  const sizeLimit = mimeType === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (byteSize > sizeLimit) {
    return errorResponse('file_too_large', 'File exceeds the maximum size.', 413);
  }

  const decodedLength = expectedByteSize(fileBase64);
  // Widened from ±4 to ±32: base64 size drift between client preprocessing
  // (preprocessImage) and server-side decode can exceed 4 bytes on edge cases
  // (e.g., padding variants) without indicating tampering.
  if (Math.abs(decodedLength - byteSize) > 32) {
    console.warn('[payslip-analyze] parse_failed', {
      reason: 'declared byteSize mismatch',
      declared: byteSize,
      decoded: decodedLength,
    });
    return errorResponse('parse_failed', 'Declared size does not match payload.', 400);
  }
  if (decodedLength > sizeLimit) {
    return errorResponse('file_too_large', 'File exceeds the maximum size.', 413);
  }

  if (!checkMagicBytes(mimeType, fileBase64)) {
    return errorResponse('invalid_mime', 'File header does not match declared type.', 415);
  }

  const sanitizedName = sanitizeString(body.name, 50) ?? 'משתמש';
  const sanitizedGoal = sanitizeString(body.financialGoal, 30);

  const requestBody = {
    system_instruction: { parts: [{ text: PAYSLIP_SYSTEM_PROMPT }] },
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildPayslipUserPrompt(sanitizedName, sanitizedGoal) },
          { inline_data: { mime_type: mimeType, data: fileBase64 } },
        ],
      },
    ],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.2,
      thinkingConfig: { thinkingBudget: 0 },
      responseMimeType: 'application/json',
    },
  };

  try {
    let response: Response;
    const abortController = new AbortController();
    const timeoutHandle = setTimeout(() => abortController.abort(), 45_000);
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: abortController.signal,
        },
      );
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : '';
      if (name === 'TimeoutError' || name === 'AbortError') {
        return errorResponse('timeout', 'Analysis timed out. Try again.');
      }
      return errorResponse('network', 'Network failure reaching AI service.');
    } finally {
      clearTimeout(timeoutHandle);
    }

    if (response.status === 429) {
      return errorResponse('rate_limited', 'AI rate limit reached.', 429);
    }
    if (response.status >= 500) {
      return errorResponse('service_unavailable', 'AI service unavailable.', 502);
    }
    if (!response.ok) {
      console.warn('[payslip-analyze] parse_failed', {
        reason: 'gemini non-2xx',
        status: response.status,
      });
      return errorResponse('parse_failed', 'AI service rejected the request.', 502);
    }

    let data: GeminiResponse;
    try {
      data = (await response.json()) as GeminiResponse;
    } catch {
      console.warn('[payslip-analyze] parse_failed', { reason: 'gemini envelope not JSON' });
      return errorResponse('parse_failed', 'Malformed AI response.', 502);
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    if (!rawText) {
      console.warn('[payslip-analyze] parse_failed', {
        reason: 'empty AI response',
        finishReason: data.candidates?.[0]?.finishReason ?? null,
      });
      return errorResponse('parse_failed', 'Empty AI response.', 502);
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      console.warn('[payslip-analyze] parse_failed', {
        reason: 'rawText not JSON',
        snippet: rawText.slice(0, 200),
      });
      return errorResponse('parse_failed', 'AI response was not valid JSON.', 502);
    }

    const result = normalizePayslipResult(parsed);
    if (!result) {
      console.warn('[payslip-analyze] parse_failed', {
        reason: 'schema check failed — numeric core missing',
        keys: parsed && typeof parsed === 'object' ? Object.keys(parsed) : null,
      });
      return errorResponse('parse_failed', 'AI response failed schema check.', 502);
    }

    // Lowered from 0.4 → 0.25: keep the safety net for obvious garbage (blank
    // photos, blurry shots) but let through borderline reads that still
    // produce usable numbers. ResultCard can surface a soft warning when the
    // value is in the 0.25-0.5 band if needed.
    if (result.confidence < 0.25) {
      return errorResponse(
        'unreadable',
        'Confidence too low to surface results.',
      );
    }

    const success: PayslipAnalyzeResponse = {
      ok: true,
      confidence: result.confidence,
      result,
    };

    return Response.json(success, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        Pragma: 'no-cache',
      },
    });
  } catch (err: unknown) {
    return safeErrorResponse(err, 'ai/payslip-analyze');
  }
}
