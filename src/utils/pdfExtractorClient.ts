import {
  extractTextFromPdfBuffer,
  extractTextFromPdfRawStreams,
  cleanExtractedPdfText,
  ExtractedPdfResult,
} from '../server/pdfExtractor';

export type ClientPdfResult = ExtractedPdfResult;

/**
 * Extracts plain text from an ArrayBuffer containing a PDF document.
 * Safe for both browser and server runtimes without Buffer, DOMMatrix, or canvas dependencies.
 */
export async function extractTextFromPdfArrayBuffer(arrayBuffer: ArrayBuffer): Promise<ExtractedPdfResult> {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('PDF ArrayBuffer is empty.');
  }

  const uint8 = new Uint8Array(arrayBuffer);

  // 1. Try PDFParse first
  try {
    const result = await extractTextFromPdfBuffer(uint8);
    if (result && typeof result.text === 'string' && result.text.trim().length > 0) {
      return result;
    }
  } catch (err) {
    console.warn('PDFParse client extraction error, trying raw stream fallback:', err);
  }

  // 2. Direct stream extraction fallback
  try {
    const rawText = extractTextFromPdfRawStreams(arrayBuffer);
    if (rawText && rawText.trim().length > 0) {
      const cleaned = cleanExtractedPdfText(rawText);
      return {
        text: cleaned,
        pageCount: 1,
        wordCount: cleaned.split(/\s+/).filter(Boolean).length,
        characterCount: cleaned.length,
      };
    }
  } catch (fallbackErr) {
    console.warn('Raw stream extraction fallback failed:', fallbackErr);
  }

  return {
    text: '',
    pageCount: 1,
    wordCount: 0,
    characterCount: 0,
  };
}
