import { extractTextFromPdfBuffer, ExtractedPdfResult } from '../server/pdfExtractor';

export type ClientPdfResult = ExtractedPdfResult;

/**
 * Extracts plain text from an ArrayBuffer containing a PDF document.
 * Safe for both serverless Node and local environments without DOMMatrix or canvas dependencies.
 */
export async function extractTextFromPdfArrayBuffer(arrayBuffer: ArrayBuffer): Promise<ExtractedPdfResult> {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('PDF ArrayBuffer is empty.');
  }
  const buffer = Buffer.from(arrayBuffer);
  return extractTextFromPdfBuffer(buffer);
}
