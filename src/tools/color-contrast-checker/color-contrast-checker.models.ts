import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import namesPlugin from 'colord/plugins/names';

extend([a11yPlugin, namesPlugin]);

export interface RgbChannels {
  r: number;
  g: number;
  b: number;
}

export interface HslChannels {
  h: number;
  s: number;
  l: number;
}

export type OverallWcagGrade = 'AAA' | 'AA' | 'AA Large' | 'Fail';

export interface WcagEvaluation {
  aaLarge: boolean;
  aaNormal: boolean;
  aaaLarge: boolean;
  aaaNormal: boolean;
  uiComponents: boolean;
  overallGrade: OverallWcagGrade;
}

export interface AccessibleSuggestions {
  suggestedForeground: string | null;
  suggestedBackground: string | null;
  fgRatio: number | null;
  bgRatio: number | null;
}

export interface SavedSwatchPair {
  id: string;
  name?: string;
  backgroundHex: string;
  foregroundHex: string;
}

function clamp(value: number | null | undefined, min: number, max: number): number {
  if (value == null || typeof value !== 'number' || Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

/**
 * Check if the input string represents a valid color recognizable by colord.
 */
export function isValidColor(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return colord(trimmed).isValid();
}

/**
 * Normalize any valid color string into standard 6-character uppercase HEX (#RRGGBB).
 * If invalid, returns the uppercase fallback.
 */
export function normalizeHex(input: string, fallback = '#000000'): string {
  if (!isValidColor(input)) {
    return (isValidColor(fallback) ? colord(fallback).alpha(1).toHex() : fallback).toUpperCase();
  }
  return colord(input).alpha(1).toHex().toUpperCase();
}

/**
 * Convert HEX color to RGB integer channels (0-255).
 */
export function hexToRgbChannels(hex: string): RgbChannels {
  const norm = normalizeHex(hex);
  const { r, g, b } = colord(norm).toRgb();
  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
  };
}

/**
 * Convert RGB channels (clamped 0-255) to 6-character uppercase HEX.
 */
export function rgbChannelsToHex(r: number, g: number, b: number): string {
  return colord({
    r: clamp(r, 0, 255),
    g: clamp(g, 0, 255),
    b: clamp(b, 0, 255),
  })
    .alpha(1)
    .toHex()
    .toUpperCase();
}

/**
 * Convert HEX color to HSL integer channels (h: 0-360, s: 0-100, l: 0-100).
 */
export function hexToHslChannels(hex: string): HslChannels {
  const norm = normalizeHex(hex);
  const { h, s, l } = colord(norm).toHsl();
  return {
    h: Math.round(h),
    s: Math.round(s),
    l: Math.round(l),
  };
}

/**
 * Convert HSL channels (h: 0-360, s/l: 0-100) to 6-character uppercase HEX.
 */
export function hslChannelsToHex(h: number, s: number, l: number): string {
  return colord({
    h: clamp(h, 0, 360),
    s: clamp(s, 0, 100),
    l: clamp(l, 0, 100),
  })
    .alpha(1)
    .toHex()
    .toUpperCase();
}

/**
 * Returns the relative luminance of a color (0 ~ 1, rounded to 4 decimal places) per WCAG 2.1 formula.
 */
export function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgbChannels(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return Math.round(lum * 10000) / 10000;
}

/**
 * Calculate WCAG contrast ratio between background and foreground (1.00 ~ 21.00, floored to 2 decimal places per colord/a11y).
 */
export function getContrastRatio(backgroundHex: string, foregroundHex: string): number {
  const bg = normalizeHex(backgroundHex);
  const fg = normalizeHex(foregroundHex);
  return colord(bg).contrast(fg);
}

/**
 * Evaluate WCAG 2.1 conformance levels strictly with >= boundary thresholds and floor truncation (no false-positive rounding).
 */
export function evaluateWcagLevels(contrast: number): WcagEvaluation {
  const safeRatio = Math.floor((contrast + 1e-9) * 100) / 100;

  const aaLarge = safeRatio >= 3.0;
  const aaNormal = safeRatio >= 4.5;
  const aaaLarge = safeRatio >= 4.5;
  const aaaNormal = safeRatio >= 7.0;
  const uiComponents = safeRatio >= 3.0;

  let overallGrade: OverallWcagGrade = 'Fail';
  if (aaaNormal) {
    overallGrade = 'AAA';
  } else if (aaNormal) {
    overallGrade = 'AA';
  } else if (aaLarge) {
    overallGrade = 'AA Large';
  }

  return {
    aaLarge,
    aaNormal,
    aaaLarge,
    aaaNormal,
    uiComponents,
    overallGrade,
  };
}

/**
 * Find the closest lightness candidate to meet targetRatio while preserving Hue and Saturation.
 * Note: l=0 (#000000) and l=100 (#FFFFFF) are naturally included in the 0..100 loop.
 */
function findClosestAccessibleLightness(
  fixedHex: string,
  targetHex: string,
  targetRatio: number,
): { hex: string | null; ratio: number | null } {
  const currentRatio = getContrastRatio(fixedHex, targetHex);
  if (currentRatio >= targetRatio) {
    return { hex: normalizeHex(targetHex), ratio: currentRatio };
  }

  const hsl = hexToHslChannels(targetHex);
  const origL = hsl.l;
  let bestHex: string | null = null;
  let bestDist = Infinity;
  let bestRatio: number | null = null;

  // Search through all integer lightness levels 0..100
  for (let l = 0; l <= 100; l++) {
    const candidate = hslChannelsToHex(hsl.h, hsl.s, l);
    const ratio = getContrastRatio(fixedHex, candidate);
    if (ratio >= targetRatio) {
      const dist = Math.abs(l - origL);
      if (dist < bestDist) {
        bestDist = dist;
        bestHex = candidate;
        bestRatio = ratio;
      }
    }
  }

  return { hex: bestHex, ratio: bestRatio };
}

/**
 * Suggest accessible foreground and background modifications to achieve target contrast ratio.
 */
export function suggestAccessibleColors(
  backgroundHex: string,
  foregroundHex: string,
  targetRatio = 4.5,
): AccessibleSuggestions {
  const bg = normalizeHex(backgroundHex);
  const fg = normalizeHex(foregroundHex);
  const currentContrast = getContrastRatio(bg, fg);

  if (currentContrast >= targetRatio) {
    return {
      suggestedForeground: fg,
      suggestedBackground: bg,
      fgRatio: currentContrast,
      bgRatio: currentContrast,
    };
  }

  const fgSuggestion = findClosestAccessibleLightness(bg, fg, targetRatio);
  const bgSuggestion = findClosestAccessibleLightness(fg, bg, targetRatio);

  return {
    suggestedForeground: fgSuggestion.hex,
    suggestedBackground: bgSuggestion.hex,
    fgRatio: fgSuggestion.ratio,
    bgRatio: bgSuggestion.ratio,
  };
}

/**
 * Get closest CSS color name or null if unavailable.
 */
export function getColorName(hex: string): string | null {
  if (!isValidColor(hex)) {
    return null;
  }
  const name = colord(normalizeHex(hex)).toName({ closest: true });
  return name || null;
}
