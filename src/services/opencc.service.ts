import * as OpenCC from 'opencc-js';

export type OpenCCDirection = 's2t' | 't2s' | 's2twp' | 's2tw';

let s2tConverter: ((text: string) => string) | null = null;
let s2twConverter: ((text: string) => string) | null = null;
let t2sConverter: ((text: string) => string) | null = null;

const PUNCTUATION_MAP: Record<string, string> = {
  '\u201C': '\u300C', // “ -> 「
  '\u201D': '\u300D', // ” -> 」
  '\u2018': '\u300E', // ‘ -> 『
  '\u2019': '\u300F', // ’ -> 』
};

export function convertOpenCC(text: string, direction: OpenCCDirection): string {
  if (!text) {
    return '';
  }
  if (direction === 's2t' || direction === 's2twp') {
    if (!s2tConverter) {
      s2tConverter = OpenCC.Converter({ from: 'cn', to: 'twp' });
    }
    return s2tConverter(text);
  }
  if (direction === 's2tw') {
    if (!s2twConverter) {
      s2twConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    }
    return s2twConverter(text);
  }
  if (!t2sConverter) {
    t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });
  }
  return t2sConverter(text);
}

/**
 * Converts curly quotation marks (“ ” ‘ ’) into Traditional Chinese corner brackets (「 」 『 』).
 */
export function convertPunctuation(text: string): string {
  if (!text) {
    return '';
  }
  return text.replace(/[\u201C\u201D\u2018\u2019]/g, ch => PUNCTUATION_MAP[ch] ?? ch);
}
