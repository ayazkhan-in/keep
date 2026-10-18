import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface ClientPdfResult {
  text: string;
  pageCount: number;
  wordCount: number;
  characterCount: number;
}

/**
 * Extracts plain text directly in the browser or Node runtime using pdfjs-dist.
 * Provides 100% offline, client-side resilience with zero server dependencies.
 */
export async function extractTextFromPdfArrayBuffer(arrayBuffer: ArrayBuffer): Promise<ClientPdfResult> {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('PDF ArrayBuffer is empty.');
  }

  const uint8Array = new Uint8Array(arrayBuffer);
  const loadingTask = pdfjs.getDocument({
    data: uint8Array,
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  const numPages = pdfDoc.numPages;
  let fullText = '';

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const content = await page.getTextContent();
    const strings: string[] = [];

    for (const item of content.items) {
      if ('str' in item && typeof item.str === 'string') {
        strings.push(item.str);
      }
    }

    // Join text items on the page while preserving word breaks
    const pageText = strings.join(' ').replace(/[ \t]{2,}/g, ' ').trim();
    if (pageText) {
      fullText += pageText + '\n\n';
    }
  }

  let cleanedText = fullText.trim();
  // Normalize line breaks
  cleanedText = cleanedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');

  const wordCount = cleanedText ? cleanedText.split(/\s+/).filter(Boolean).length : 0;
  const characterCount = cleanedText.length;

  return {
    text: cleanedText,
    pageCount: numPages,
    wordCount,
    characterCount,
  };
}
