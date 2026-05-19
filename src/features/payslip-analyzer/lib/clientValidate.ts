import type { ChosenFile, PayslipErrorCode } from '../types';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
] as const;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PDF_BYTES = 8 * 1024 * 1024;

export type ClientValidationResult =
  | { ok: true }
  | { ok: false; code: PayslipErrorCode };

export function validateFile(file: ChosenFile): ClientValidationResult {
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimeType)) {
    return { ok: false, code: 'invalid_mime' };
  }

  if (!Number.isFinite(file.byteSize) || file.byteSize <= 0) {
    return { ok: false, code: 'parse_failed' };
  }

  const limit =
    file.mimeType === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  if (file.byteSize > limit) {
    return { ok: false, code: 'file_too_large' };
  }

  return { ok: true };
}
