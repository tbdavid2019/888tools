/**
 * CIEDE2000 (Delta E 2000) Color Difference Algorithm & Color Space Conversions
 * Standard formulation based on Sharma et al. (2005)
 */

export interface Lab {
  l: number; // 0 to 100
  a: number; // -128 to 128
  b: number; // -128 to 128
}

export interface Rgb {
  r: number; // 0 to 255
  g: number; // 0 to 255
  b: number; // 0 to 255
}

export interface Cmyk {
  c: number; // 0 to 100
  m: number; // 0 to 100
  y: number; // 0 to 100
  k: number; // 0 to 100
}

/**
 * Convert standard hex string (#RGB, #RRGGBB, #RRGGBBAA) to RGB
 */
export function hexToRgb(hex: string): Rgb {
  let cleaned = hex.replace(/^#/, '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map(c => c + c).join('');
  }
  if (cleaned.length >= 6) {
    cleaned = cleaned.slice(0, 6);
  }
  const num = parseInt(cleaned, 16);
  if (isNaN(num)) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convert RGB to 6-digit hex string (#RRGGBB)
 */
export function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (val: number) => Math.min(255, Math.max(0, Math.round(val)));
  const toHex = (val: number) => clamp(val).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert RGB (sRGB, D65 illuminant) to CIE L*a*b*
 */
export function rgbToLab(r: number, g: number, b: number): Lab {
  // 1. Pivot sRGB to linear RGB
  const pivotRgb = (c: number): number => {
    const v = c / 255;
    return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92;
  };

  const rLin = pivotRgb(r);
  const gLin = pivotRgb(g);
  const bLin = pivotRgb(b);

  // 2. Linear sRGB to CIE XYZ (Standard Observer 2°, Illuminant D65)
  // Reference White D65: Xn = 0.95047, Yn = 1.00000, Zn = 1.08883
  const x = (rLin * 0.4124564 + gLin * 0.3575761 + bLin * 0.1804375) / 0.95047;
  const y = (rLin * 0.2126729 + gLin * 0.7151522 + bLin * 0.0721750) / 1.00000;
  const z = (rLin * 0.0193339 + gLin * 0.1191920 + bLin * 0.9503041) / 1.08883;

  // 3. CIE XYZ to CIE L*a*b*
  const pivotXyz = (t: number): number => {
    return t > 0.008856451679035631 ? Math.cbrt(t) : 7.787037037037037 * t + 16 / 116;
  };

  const fx = pivotXyz(x);
  const fy = pivotXyz(y);
  const fz = pivotXyz(z);

  const l = Math.max(0, 116 * fy - 16);
  const a = 500 * (fx - fy);
  const bVal = 200 * (fy - fz);

  return { l, a, b: bVal };
}

/**
 * Convert Hex to CIE L*a*b*
 */
export function hexToLab(hex: string): Lab {
  const { r, g, b } = hexToRgb(hex);
  return rgbToLab(r, g, b);
}

/**
 * Convert CMYK (0-100 each) to RGB
 */
export function cmykToRgb(c: number, m: number, y: number, k: number): Rgb {
  const cFrac = Math.min(100, Math.max(0, c)) / 100;
  const mFrac = Math.min(100, Math.max(0, m)) / 100;
  const yFrac = Math.min(100, Math.max(0, y)) / 100;
  const kFrac = Math.min(100, Math.max(0, k)) / 100;

  const r = Math.round(255 * (1 - cFrac) * (1 - kFrac));
  const g = Math.round(255 * (1 - mFrac) * (1 - kFrac));
  const b = Math.round(255 * (1 - yFrac) * (1 - kFrac));

  return { r, g, b };
}

/**
 * Convert RGB to CMYK (0-100 each)
 */
export function rgbToCmyk(r: number, g: number, b: number): Cmyk {
  const rFrac = r / 255;
  const gFrac = g / 255;
  const bFrac = b / 255;

  const kFrac = 1 - Math.max(rFrac, gFrac, bFrac);
  if (kFrac >= 0.9999) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = Math.round(((1 - rFrac - kFrac) / (1 - kFrac)) * 100);
  const m = Math.round(((1 - gFrac - kFrac) / (1 - kFrac)) * 100);
  const y = Math.round(((1 - bFrac - kFrac) / (1 - kFrac)) * 100);
  const k = Math.round(kFrac * 100);

  return {
    c: Math.max(0, Math.min(100, c)),
    m: Math.max(0, Math.min(100, m)),
    y: Math.max(0, Math.min(100, y)),
    k: Math.max(0, Math.min(100, k)),
  };
}

/**
 * Calculate CIEDE2000 (ΔE 2000) color difference between two Lab colors.
 * Formulation follows the CIE Technical Report and Sharma et al. (2005).
 */
export function deltaE2000(lab1: Lab, lab2: Lab): number {
  const { l: L1, a: a1, b: b1 } = lab1;
  const { l: L2, a: a2, b: b2 } = lab2;

  // Direct match optimization
  if (L1 === L2 && a1 === a2 && b1 === b2) {
    return 0;
  }

  const deg2rad = Math.PI / 180;
  const rad2deg = 180 / Math.PI;

  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar = (C1 + C2) / 2;

  const Cbar7 = Math.pow(Cbar, 7);
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 6103515625))); // 25^7 = 6103515625

  const a1Prime = (1 + G) * a1;
  const a2Prime = (1 + G) * a2;

  const C1Prime = Math.hypot(a1Prime, b1);
  const C2Prime = Math.hypot(a2Prime, b2);
  const CbarPrime = (C1Prime + C2Prime) / 2;

  let h1Prime = Math.atan2(b1, a1Prime) * rad2deg;
  if (h1Prime < 0) h1Prime += 360;

  let h2Prime = Math.atan2(b2, a2Prime) * rad2deg;
  if (h2Prime < 0) h2Prime += 360;

  let deltahPrime = 0;
  if (C1Prime * C2Prime !== 0) {
    const diff = h2Prime - h1Prime;
    if (Math.abs(diff) <= 180) {
      deltahPrime = diff;
    } else if (diff > 180) {
      deltahPrime = diff - 360;
    } else {
      deltahPrime = diff + 360;
    }
  }

  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;
  const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin((deltahPrime / 2) * deg2rad);

  const LbarPrime = (L1 + L2) / 2;

  let hbarPrime = 0;
  if (C1Prime * C2Prime === 0) {
    hbarPrime = h1Prime + h2Prime;
  } else {
    const diff = Math.abs(h1Prime - h2Prime);
    const sum = h1Prime + h2Prime;
    if (diff <= 180) {
      hbarPrime = sum / 2;
    } else if (sum < 360) {
      hbarPrime = (sum + 360) / 2;
    } else {
      hbarPrime = (sum - 360) / 2;
    }
  }

  const T = 1 - 0.17 * Math.cos((hbarPrime - 30) * deg2rad)
    + 0.24 * Math.cos((2 * hbarPrime) * deg2rad)
    + 0.32 * Math.cos((3 * hbarPrime + 6) * deg2rad)
    - 0.20 * Math.cos((4 * hbarPrime - 63) * deg2rad);

  const deltaTheta = 30 * Math.exp(-Math.pow((hbarPrime - 275) / 25, 2));
  const CbarPrime7 = Math.pow(CbarPrime, 7);
  const RC = 2 * Math.sqrt(CbarPrime7 / (CbarPrime7 + 6103515625));

  const LbarPrimeMinus50Sq = Math.pow(LbarPrime - 50, 2);
  const SL = 1 + (0.015 * LbarPrimeMinus50Sq) / Math.sqrt(20 + LbarPrimeMinus50Sq);
  const SC = 1 + 0.045 * CbarPrime;
  const SH = 1 + 0.015 * CbarPrime * T;

  const RT = -Math.sin(2 * deltaTheta * deg2rad) * RC;

  const kL = 1;
  const kC = 1;
  const kH = 1;

  const dL = deltaLPrime / (kL * SL);
  const dC = deltaCPrime / (kC * SC);
  const dH = deltaHPrime / (kH * SH);

  const dE = Math.sqrt(dL * dL + dC * dC + dH * dH + RT * dC * dH);
  return Number(dE.toFixed(2));
}

/**
 * Qualitative assessment of Delta E 2000 score
 */
export function getDeltaEAssessment(deltaE: number): {
  rating: 'perfect' | 'excellent' | 'good' | 'approximate';
  labelZh: string;
  labelEn: string;
  descriptionZh: string;
  descriptionEn: string;
  color: string;
} {
  if (deltaE <= 1.0) {
    return {
      rating: 'perfect',
      labelZh: '完美配對',
      labelEn: 'Perfect Match',
      descriptionZh: '肉眼幾乎無法分辨差異 (ΔE ≤ 1.0)',
      descriptionEn: 'Virtually imperceptible to the human eye',
      color: '#10B981',
    };
  }
  if (deltaE <= 2.0) {
    return {
      rating: 'excellent',
      labelZh: '極佳配對',
      labelEn: 'Close Match',
      descriptionZh: '非常接近，商業印刷與螢幕設計的高標準配對 (ΔE ≤ 2.0)',
      descriptionEn: 'Very close match acceptable for high-end graphic design',
      color: '#06B6D4',
    };
  }
  if (deltaE <= 3.5) {
    return {
      rating: 'good',
      labelZh: '良好配對',
      labelEn: 'Good Match',
      descriptionZh: '色彩感知和諧接近，適合一般設計與色卡選用 (ΔE ≤ 3.5)',
      descriptionEn: 'Perceptually close, suitable for standard design workflows',
      color: '#3B82F6',
    };
  }
  return {
    rating: 'approximate',
    labelZh: '近似參考',
    labelEn: 'Approximate',
    descriptionZh: '色系相近，但在明度或彩度上有些微肉眼可辨差異 (ΔE > 3.5)',
    descriptionEn: 'Closest available hue with perceivable tonal difference',
    color: '#F59E0B',
  };
}
