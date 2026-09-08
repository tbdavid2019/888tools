import type { MagikaDetection, ScoreItem, ToolSuggestion } from './types';
import { CONTENT_TYPE_REGISTRY, getMetaForLabel } from './content-types';

let magikaInstancePromise: Promise<any> | null = null;

/**
 * Initializes and retrieves the singleton Magika instance.
 * Dynamic import ensures TensorFlow.js & Magika are code-split into an on-demand bundle.
 */
export async function getMagikaInstance(): Promise<any> {
  if (magikaInstancePromise) {
    return magikaInstancePromise;
  }

  magikaInstancePromise = (async () => {
    const { Magika } = await import('magika');

    const origin = typeof window !== 'undefined' && window.location?.origin && !window.location.origin.startsWith('null')
      ? window.location.origin
      : '';

    if (origin) {
      try {
        return await Magika.create({
          modelURL: `${origin}/models/magika/model.json`,
          modelConfigURL: `${origin}/models/magika/config.min.json`,
        });
      } catch (err) {
        console.warn('Failed to load local Magika model, falling back to official CDN:', err);
      }
    }

    // Fallback to official Google GitHub Pages CDN
    return await Magika.create();
  })();

  return magikaInstancePromise;
}

/**
 * Extract an optimized byte slice from a File/Blob.
 * Magika deep learning model only inspects the first 1024 bytes (max 4096)
 * and last 1024 bytes (max 4096), so we never need to load huge files into memory.
 */
async function extractAnalysisBytes(file: File | Blob): Promise<Uint8Array> {
  const size = file.size;

  if (size <= 8192) {
    const buffer = await file.arrayBuffer();
    return new Uint8Array(buffer);
  }

  // File is large: read first 4096 and last 4096 bytes
  const headBlob = file.slice(0, 4096);
  const tailBlob = file.slice(size - 4096, size);

  const [headBuf, tailBuf] = await Promise.all([
    headBlob.arrayBuffer(),
    tailBlob.arrayBuffer(),
  ]);

  const combined = new Uint8Array(8192);
  combined.set(new Uint8Array(headBuf), 0);
  combined.set(new Uint8Array(tailBuf), 4096);

  return combined;
}

/**
 * Perform AI file type detection on an uploaded File or Blob.
 */
export async function detectFile(file: File | Blob, customFileName?: string): Promise<MagikaDetection> {
  const fileName = customFileName || (file instanceof File ? file.name : 'unknown_file');
  const bytes = await extractAnalysisBytes(file);
  return detectBytes(bytes, fileName);
}

/**
 * Perform AI file type detection directly on a Uint8Array byte sequence.
 */
export async function detectBytes(bytes: Uint8Array, fileName: string = ''): Promise<MagikaDetection> {
  const magika = await getMagikaInstance();
  const result = await magika.identifyBytes(bytes);

  const prediction = result.prediction;
  const label = prediction.output?.label || prediction.dl?.label || 'unknown';
  const score = prediction.score ?? 1.0;
  const isText = prediction.output?.is_text ?? prediction.dl?.is_text ?? false;
  const overwriteReason = prediction.overwrite_reason || 'none';

  const meta = getMetaForLabel(label);

  // Top alternative predictions from scores_map
  const topPredictions: ScoreItem[] = [];
  if (prediction.scores_map) {
    const sorted = Object.entries(prediction.scores_map as Record<string, number>)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    for (const [lbl, sc] of sorted) {
      const itemMeta = getMetaForLabel(lbl);
      topPredictions.push({
        label: lbl,
        name: itemMeta.name,
        score: sc,
        scorePercent: `${(sc * 100).toFixed(1)}%`,
      });
    }
  }

  // Check file extension mismatch
  let isExtensionMismatch = false;
  let detectedExtension: string | undefined;

  if (fileName) {
    const lastDotIndex = fileName.lastIndexOf('.');
    if (lastDotIndex !== -1) {
      detectedExtension = fileName.slice(lastDotIndex).toLowerCase();
      // If we have known extensions and the actual extension is not in list
      if (meta.extensions && meta.extensions.length > 0 && !meta.extensions.includes(detectedExtension)) {
        // Only warn if score is high enough to be confident
        if (score >= 0.7 && label !== 'unknown' && label !== 'empty' && label !== 'txt') {
          isExtensionMismatch = true;
        }
      }
    }
  }

  return {
    label,
    name: meta.name,
    nameEn: meta.nameEn,
    mimeType: meta.mimeType,
    extensions: meta.extensions,
    category: meta.category,
    description: meta.description,
    isText,
    score,
    scorePercent: `${Math.min(100, Math.max(0, score * 100)).toFixed(1)}%`,
    overwriteReason,
    topPredictions,
    suggestedTools: meta.suggestedTools || [],
    isExtensionMismatch,
    detectedExtension,
  };
}

/**
 * Fast helper to sniff whether an uploaded file is likely an EPUB ebook.
 */
export async function isEpubFile(file: File | Blob): Promise<{ isEpub: boolean; detection: MagikaDetection }> {
  const detection = await detectFile(file);
  const isEpub = detection.label === 'epub' || detection.mimeType === 'application/epub+zip';
  return { isEpub, detection };
}

/**
 * Fast helper to sniff whether an uploaded file is text-based (TXT, Markdown, source code, etc.).
 */
export async function isTextFile(file: File | Blob): Promise<{ isText: boolean; detection: MagikaDetection }> {
  const detection = await detectFile(file);
  const isText = detection.isText || detection.label === 'txt' || detection.label === 'markdown';
  return { isText, detection };
}
