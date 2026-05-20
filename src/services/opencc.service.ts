import * as OpenCC from 'opencc-js';

export type OpenCCDirection = 's2t' | 't2s' | 's2twp' | 's2tw';

let s2tConverter: any = null;
let s2twConverter: any = null;
let t2sConverter: any = null;

export function convertOpenCC(text: string, direction: OpenCCDirection): string {
  if (!text) return '';
  if (direction === 's2t' || direction === 's2twp') {
    if (!s2tConverter) {
      s2tConverter = OpenCC.Converter({ from: 'cn', to: 'twp' });
    }
    return s2tConverter(text);
  } else if (direction === 's2tw') {
    if (!s2twConverter) {
      s2twConverter = OpenCC.Converter({ from: 'cn', to: 'tw' });
    }
    return s2twConverter(text);
  } else {
    if (!t2sConverter) {
      t2sConverter = OpenCC.Converter({ from: 'tw', to: 'cn' });
    }
    return t2sConverter(text);
  }
}

