import './domMatrixPolyfill';

export interface ExtractedPdfResult {
  text: string;
  pageCount: number;
  wordCount: number;
  characterCount: number;
  info?: Record<string, any>;
}

/**
 * Normalizes and cleans raw text extracted from a PDF.
 * Removes pagination artifacts while keeping section headers, bullets, and paragraph structure.
 */
export function cleanExtractedPdfText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove page numbers or footer lines like "-- 1 of 2 --" or "Page 1 of 4"
  text = text.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '');
  text = text.replace(/^Page\s+\d+\s*(of\s+\d+)?\s*$/gim, '');

  // Fix spaced-out kerning artifact where every character is followed by a space
  // e.g. "T i e r - 1   C i t i e s" -> "Tier-1 Cities"
  text = text.replace(/([a-zA-Z0-9])\s([a-zA-Z0-9])\s([a-zA-Z0-9])\s([a-zA-Z0-9])\s([a-zA-Z0-9])/g, '$1$2$3$4$5');
  text = text.replace(/([a-zA-Z0-9])\s([a-zA-Z0-9])\s([a-zA-Z0-9])\s([a-zA-Z0-9])/g, '$1$2$3$4');
  text = text.replace(/([a-zA-Z0-9])\s([a-zA-Z0-9])\s([a-zA-Z0-9])/g, '$1$2$3');

  // Normalize multiple blank lines (keep at most 2 newlines for paragraph breaks)
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trim();
}

/**
 * Extracts plain text from a Node Buffer containing a PDF document.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<ExtractedPdfResult> {
  if (!buffer || buffer.length === 0) {
    throw new Error('Provided PDF buffer is empty.');
  }

  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const info = await parser.getInfo({ parsePageInfo: true }).catch(() => ({}));

  const cleanedText = cleanExtractedPdfText(result.text || '');
  const wordCount = cleanedText ? cleanedText.split(/\s+/).filter(Boolean).length : 0;
  const characterCount = cleanedText.length;
  const pageCount = (info as any)?.total || (info as any)?.numPages || 1;

  return {
    text: cleanedText,
    pageCount,
    wordCount,
    characterCount,
    info: info as any,
  };
}

/**
 * Extracts plain text from a Base64 encoded string representing a PDF document.
 * Supports standard data URLs (data:application/pdf;base64,...) as well as raw base64.
 */
export async function extractTextFromPdfBase64(base64Data: string): Promise<ExtractedPdfResult> {
  if (!base64Data) {
    throw new Error('Base64 PDF string is empty.');
  }

  // Strip data URL scheme prefix if present (e.g. data:application/pdf;filename=...;base64,...)
  const cleanBase64 = base64Data.replace(/^data:.*?;base64,/i, '').trim();
  const buffer = Buffer.from(cleanBase64, 'base64');

  return extractTextFromPdfBuffer(buffer);
}
