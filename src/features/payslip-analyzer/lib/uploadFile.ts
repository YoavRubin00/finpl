import * as FileSystem from 'expo-file-system/legacy';
import { getApiBase } from '../../../db/apiBase';
import type {
  ChosenFile,
  PayslipAnalyzeResponse,
  PayslipErrorCode,
} from '../types';

const REQUEST_TIMEOUT_MS = 50_000;

interface AnalyzeOptions {
  name?: string;
  financialGoal?: string;
}

function errorResponse(
  code: PayslipErrorCode,
  message: string,
): PayslipAnalyzeResponse {
  return { ok: false, code, error: message };
}

function isPayslipResponse(value: unknown): value is PayslipAnalyzeResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.ok === 'boolean';
}

export async function analyzePayslipFile(
  file: ChosenFile,
  options: AnalyzeOptions = {},
): Promise<PayslipAnalyzeResponse> {
  let fileBase64: string;
  try {
    fileBase64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return errorResponse('parse_failed', 'Could not read the chosen file.');
  }

  if (!fileBase64) {
    return errorResponse('parse_failed', 'Empty file payload.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBase()}/api/ai/payslip-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64,
        mimeType: file.mimeType,
        byteSize: file.byteSize,
        name: options.name,
        financialGoal: options.financialGoal,
      }),
      signal: controller.signal,
    });

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return errorResponse('parse_failed', 'Malformed server response.');
    }

    if (!isPayslipResponse(data)) {
      return errorResponse('parse_failed', 'Unexpected server response.');
    }

    return data;
  } catch (err: unknown) {
    const name = err instanceof Error ? err.name : '';
    if (name === 'AbortError' || name === 'TimeoutError') {
      return errorResponse('timeout', 'Request timed out.');
    }
    return errorResponse('network', 'Network failure.');
  } finally {
    clearTimeout(timeoutId);
  }
}
