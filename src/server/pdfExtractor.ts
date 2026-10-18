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
 * Decodes standard PDF escape sequences in literal strings.
 */
function decodePdfString(str: string): string {
  return str
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

/**
 * Lightweight text stream extractor directly from raw PDF bytes.
 * Acts as a resilient fallback in environments where canvas or workers are unavailable.
 */
export function extractTextFromPdfRawStreams(arrayBuffer: ArrayBuffer): string {
  if (!arrayBuffer || arrayBuffer.byteLength === 0) return '';

  try {
    const bytes = new Uint8Array(arrayBuffer);
    const latin1Decoder = new TextDecoder('latin1');
    const rawPdf = latin1Decoder.decode(bytes);

    const extractedChunks: string[] = [];

    // 1. Match Tj strings: (text) Tj
    const tjPattern = /\(((?:[^()\\]|\\.)*)\)\s*(?:Tj|'|")/g;
    let match: RegExpExecArray | null;
    while ((match = tjPattern.exec(rawPdf)) !== null) {
      if (match[1] && match[1].length > 0) {
        extractedChunks.push(decodePdfString(match[1]));
      }
    }

    // 2. Match TJ array elements: [ (text1) -120 (text2) ... ] TJ
    const tjArrayPattern = /\[((?:[^\]\\]|\\.)*)\]\s*TJ/g;
    while ((match = tjArrayPattern.exec(rawPdf)) !== null) {
      const inner = match[1];
      const stringMatches = inner.match(/\(((?:[^()\\]|\\.)*)\)/g);
      if (stringMatches && stringMatches.length > 0) {
        const line = stringMatches
          .map((s) => decodePdfString(s.slice(1, -1)))
          .join('');
        if (line.trim().length > 0) {
          extractedChunks.push(line);
        }
      }
    }

    // 3. Match /Title, /Subject, /Keywords metadata if present
    const metaPattern = /\/(?:Title|Subject|Keywords)\s*\(((?:[^()\\]|\\.)*)\)/g;
    while ((match = metaPattern.exec(rawPdf)) !== null) {
      if (match[1]) {
        extractedChunks.push(decodePdfString(match[1]));
      }
    }

    const joined = extractedChunks
      .join('\n')
      .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ' ')
      .replace(/ {2,}/g, ' ')
      .trim();

    return joined;
  } catch (e) {
    console.warn('extractTextFromPdfRawStreams encountered an error:', e);
    return '';
  }
}

/**
 * Extracts plain text from a Node Buffer or browser Uint8Array containing a PDF document.
 */
export async function extractTextFromPdfBuffer(buffer: Uint8Array | Buffer): Promise<ExtractedPdfResult> {
  if (!buffer || buffer.length === 0) {
    throw new Error('Provided PDF buffer is empty.');
  }

  try {
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
  } catch (err: any) {
    // If PDFParse failed, try raw stream extraction before giving up
    const rawBuffer = buffer instanceof Uint8Array ? buffer.buffer : (buffer as Buffer).buffer;
    if (rawBuffer instanceof ArrayBuffer) {
      const rawText = extractTextFromPdfRawStreams(rawBuffer);
      if (rawText && rawText.trim().length > 0) {
        const cleanedText = cleanExtractedPdfText(rawText);
        return {
          text: cleanedText,
          pageCount: 1,
          wordCount: cleanedText.split(/\s+/).filter(Boolean).length,
          characterCount: cleanedText.length,
        };
      }
    }
    throw err;
  }
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
  const cleanBase64 = base64Data.replace(/^data:.*?;base64,/i, '').replace(/\s+/g, '');
  let buffer: Uint8Array | Buffer;
  if (typeof Buffer !== 'undefined') {
    buffer = Buffer.from(cleanBase64, 'base64');
  } else if (typeof atob === 'function') {
    const binary = atob(cleanBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    buffer = bytes;
  } else {
    throw new Error('No base64 decoder available in runtime.');
  }

  return extractTextFromPdfBuffer(buffer);
}
