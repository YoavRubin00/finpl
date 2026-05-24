import { Platform } from 'react-native';
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

/** Decoded byte length of a base64 string — mirror of the server's
 *  `expectedByteSize` so the declared size always matches what the server
 *  computes. Eliminates a class of `parse_failed` errors caused by drift
 *  between the picker's reported `size` and the actual file payload. */
function base64DecodedSize(b64: string): number {
  const len = b64.length;
  if (len === 0) return 0;
  let padding = 0;
  if (b64.endsWith('==')) padding = 2;
  else if (b64.endsWith('=')) padding = 1;
  return Math.floor((len * 3) / 4) - padding;
}

/** Read a file URI as base64. On web, `expo-file-system/legacy` cannot read
 *  blob: URIs reliably; fall back to fetch+FileReader which handles them
 *  natively. */
async function readAsBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });
  }
  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function analyzePayslipFile(
  file: ChosenFile,
  options: AnalyzeOptions = {},
): Promise<PayslipAnalyzeResponse> {
  let fileBase64: string;
  try {
    fileBase64 = await readAsBase64(file.uri);
  } catch {
    return errorResponse('parse_failed', 'Could not read the chosen file.');
  }

  if (!fileBase64) {
    return errorResponse('parse_failed', 'Empty file payload.');
  }

  // Use the actual decoded byte length, not the picker's hint. Picker `size`
  // can be missing (web) or off by more than the server tolerance (±32B) for
  // some PDF readers — both surface as `parse_failed`.
  const computedByteSize = base64DecodedSize(fileBase64);
  const declaredByteSize = computedByteSize > 0 ? computedByteSize : file.byteSize;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${getApiBase()}/api/ai/payslip-analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64,
        mimeType: file.mimeType,
        byteSize: declaredByteSize,
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
