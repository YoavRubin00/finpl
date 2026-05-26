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

  // byteSize == 0 means the picker (often web's DocumentPicker for PDFs)
  // couldn't determine the size. Don't block — the server enforces the cap
  // anyway, and `analyzePayslipFile` will derive the real size from the
  // base64 payload before sending. Only enforce the limit when we have a
  // trustworthy size to check.
  if (Number.isFinite(file.byteSize) && file.byteSize > 0) {
    const limit =
      file.mimeType === 'application/pdf' ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
    if (file.byteSize > limit) {
      return { ok: false, code: 'file_too_large' };
    }
  }

  return { ok: true };
}
