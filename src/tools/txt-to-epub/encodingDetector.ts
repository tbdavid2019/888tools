function detectBOM(bytes: Uint8Array): string | null {
  if (bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return 'utf-8';
  }
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return 'utf-16le';
  }
  if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return 'utf-16be';
  }
  return null;
}

function isValidUTF8(bytes: Uint8Array): boolean {
  let i = 0;
  let invalidCount = 0;
  const maxCheck = Math.min(bytes.length, 10000);
  
  while (i < maxCheck) {
    const byte = bytes[i];
    
    if (byte <= 0x7F) {
      i++;
    } else if ((byte & 0xE0) === 0xC0) {
      if (i + 1 >= maxCheck || (bytes[i + 1] & 0xC0) !== 0x80) {
        invalidCount++;
        i++;
        continue;
      }
      i += 2;
    } else if ((byte & 0xF0) === 0xE0) {
      if (i + 2 >= maxCheck || 
          (bytes[i + 1] & 0xC0) !== 0x80 || 
          (bytes[i + 2] & 0xC0) !== 0x80) {
        invalidCount++;
        i++;
        continue;
      }
      i += 3;
    } else if ((byte & 0xF8) === 0xF0) {
      if (i + 3 >= maxCheck || 
          (bytes[i + 1] & 0xC0) !== 0x80 || 
          (bytes[i + 2] & 0xC0) !== 0x80 ||
          (bytes[i + 3] & 0xC0) !== 0x80) {
        invalidCount++;
        i++;
        continue;
      }
      i += 4;
    } else {
      invalidCount++;
      i++;
    }
  }
  
  return invalidCount < maxCheck * 0.01;
}

function detectGBK(bytes: Uint8Array): number {
  let gbkPairs = 0;
  let totalPairs = 0;
  const maxCheck = Math.min(bytes.length, 10000);
  
  for (let i = 0; i < maxCheck - 1; i++) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    
    if (b1 >= 0x81 && b1 <= 0xFE) {
      totalPairs++;
      if (b2 >= 0x40 && b2 <= 0xFE && b2 !== 0x7F) {
        gbkPairs++;
        i++;
      }
    }
  }
  
  if (totalPairs === 0) return 0;
  return Math.round((gbkPairs / totalPairs) * 100);
}

function detectBig5(bytes: Uint8Array): number {
  let big5Pairs = 0;
  let totalPairs = 0;
  const maxCheck = Math.min(bytes.length, 10000);
  
  for (let i = 0; i < maxCheck - 1; i++) {
    const b1 = bytes[i];
    const b2 = bytes[i + 1];
    
    if (b1 >= 0x81 && b1 <= 0xFE) {
      totalPairs++;
      if ((b2 >= 0x40 && b2 <= 0x7E) || (b2 >= 0xA1 && b2 <= 0xFE)) {
        big5Pairs++;
        i++;
      }
    }
  }
  
  if (totalPairs === 0) return 0;
  return Math.round((big5Pairs / totalPairs) * 100);
}

export function detectEncoding(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  
  const bomEncoding = detectBOM(bytes);
  if (bomEncoding) {
    return bomEncoding;
  }
  
  if (isValidUTF8(bytes)) {
    return 'utf-8';
  }
  
  const gbkScore = detectGBK(bytes);
  const big5Score = detectBig5(bytes);
  
  if (gbkScore >= 70 && gbkScore >= big5Score) {
    return 'gbk';
  }
  
  if (big5Score >= 70) {
    return 'big5';
  }
  
  return 'utf-8';
}

export function decodeWithEncoding(buffer: ArrayBuffer, encoding: string): string {
  const decoder = new TextDecoder(encoding, { fatal: false });
  return decoder.decode(buffer);
}

export interface ReadFileResult {
  text: string;
  encoding: string;
  encodingLabel: string;
}

export async function readFileWithAutoEncoding(
  file: File,
  onProgress?: (bytesRead: number) => void,
): Promise<ReadFileResult> {
  let buffer: ArrayBuffer;

  if (onProgress && file.size > 1024 * 1024) {
    buffer = await readFileWithProgress(file, onProgress);
  } else {
    buffer = await file.arrayBuffer();
  }

  const encoding = detectEncoding(buffer);
  const text = decodeWithEncoding(buffer, encoding);

  return {
    text,
    encoding,
    encodingLabel: getEncodingLabel(encoding),
  };
}

async function readFileWithProgress(
  file: File,
  onProgress: (bytesRead: number) => void,
): Promise<ArrayBuffer> {
  const reader = file.stream().getReader();
  const chunks: Uint8Array[] = [];
  let bytesRead = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      bytesRead += value.byteLength;
      onProgress(bytesRead);
    }
  }

  const result = new Uint8Array(bytesRead);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}

export function getEncodingLabel(encoding: string): string {
  const labels: Record<string, string> = {
    'utf-8': 'UTF-8',
    'utf-16le': 'UTF-16 LE',
    'utf-16be': 'UTF-16 BE',
    'gbk': 'GBK（簡體中文）',
    'gb2312': 'GB2312（簡體中文）',
    'gb18030': 'GB18030（簡體中文）',
    'big5': 'Big5（繁體中文）',
  };
  return labels[encoding.toLowerCase()] || encoding.toUpperCase();
}
