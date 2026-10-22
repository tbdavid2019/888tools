import { describe, expect, it } from 'vitest';
import {
  evaluateWcagLevels,
  getColorName,
  getContrastRatio,
  getLuminance,
  hexToHslChannels,
  hexToRgbChannels,
  hslChannelsToHex,
  isValidColor,
  normalizeHex,
  rgbChannelsToHex,
  suggestAccessibleColors,
} from './color-contrast-checker.models';

describe('color-contrast-checker models', () => {
  describe('isValidColor', () => {
    it('validates standard 6-digit hex and 3-digit hex', () => {
      expect(isValidColor('#17324D')).toBe(true);
      expect(isValidColor('#fff')).toBe(true);
      expect(isValidColor('#000000')).toBe(true);
    });

    it('validates rgb and hsl color strings', () => {
      expect(isValidColor('rgb(255, 0, 0)')).toBe(true);
      expect(isValidColor('hsl(210, 50%, 40%)')).toBe(true);
    });

    it('rejects invalid inputs', () => {
      expect(isValidColor('')).toBe(false);
      expect(isValidColor('xyz')).toBe(false);
      expect(isValidColor('#12345')).toBe(false);
      expect(isValidColor('notacolor')).toBe(false);
    });
  });

  describe('normalizeHex', () => {
    it('normalizes 3-digit hex to uppercase 6-digit hex', () => {
      expect(normalizeHex('#fff')).toBe('#FFFFFF');
      expect(normalizeHex('#000')).toBe('#000000');
    });

    it('normalizes 6-digit lowercase to uppercase', () => {
      expect(normalizeHex('#17324d')).toBe('#17324D');
      expect(normalizeHex('#ffb010')).toBe('#FFB010');
    });

    it('converts rgb string to uppercase hex', () => {
      expect(normalizeHex('rgb(255, 255, 255)')).toBe('#FFFFFF');
    });

    it('falls back to default fallback if invalid', () => {
      expect(normalizeHex('invalid')).toBe('#000000');
      expect(normalizeHex('invalid', '#FFFFFF')).toBe('#FFFFFF');
    });
  });

  describe('hexToRgbChannels and rgbChannelsToHex', () => {
    it('converts hex to RGB channels and back', () => {
      const rgb = hexToRgbChannels('#FFB010');
      expect(rgb).toEqual({ r: 255, g: 176, b: 16 });
      expect(rgbChannelsToHex(rgb.r, rgb.g, rgb.b)).toBe('#FFB010');
    });

    it('clamps RGB channels outside 0-255 range or null/undefined/NaN', () => {
      expect(rgbChannelsToHex(-10, 300, 100)).toBe('#00FF64');
      expect(rgbChannelsToHex(null as any, undefined as any, Number.NaN)).toBe('#000000');
    });
  });

  describe('hexToHslChannels and hslChannelsToHex', () => {
    it('converts hex to HSL channels and handles roundtrips', () => {
      const hsl = hexToHslChannels('#17324D');
      expect(hsl.h).toBe(210);
      expect(hsl.s).toBe(54);
      expect(hsl.l).toBe(20);
      expect(hslChannelsToHex(0, 100, 50)).toBe('#FF0000');
      expect(hslChannelsToHex(hsl.h, hsl.s, hsl.l)).toBe('#17334F');
    });

    it('clamps HSL channels correctly including null/undefined/NaN', () => {
      expect(hslChannelsToHex(400, 150, -5)).toBe('#000000');
      expect(hslChannelsToHex(null as any, undefined as any, Number.NaN)).toBe('#000000');
    });
  });

  describe('getLuminance', () => {
    it('calculates relative luminance accurately with 4 decimal places', () => {
      expect(getLuminance('#000000')).toBe(0);
      expect(getLuminance('#FFFFFF')).toBe(1);
      const lum = getLuminance('#17324D');
      expect(lum).toBeGreaterThan(0.02);
      expect(lum).toBeLessThan(0.04);
    });
  });

  describe('getContrastRatio', () => {
    it('returns 21.00 for pure black against pure white', () => {
      expect(getContrastRatio('#000000', '#FFFFFF')).toBe(21);
      expect(getContrastRatio('#FFFFFF', '#000000')).toBe(21);
    });

    it('returns 1.00 for identical colors', () => {
      expect(getContrastRatio('#17324D', '#17324D')).toBe(1);
    });

    it('calculates accurate ratio for 2md brand colors', () => {
      // #17324D (Deep Blue) vs #FFB010 (Saffron Yellow)
      const ratio = getContrastRatio('#17324D', '#FFB010');
      expect(ratio).toBe(7.16);
    });
  });

  describe('evaluateWcagLevels - Boundary values', () => {
    it('evaluates ratio 2.99 (fails all)', () => {
      const res = evaluateWcagLevels(2.99);
      expect(res.aaLarge).toBe(false);
      expect(res.aaNormal).toBe(false);
      expect(res.aaaLarge).toBe(false);
      expect(res.aaaNormal).toBe(false);
      expect(res.uiComponents).toBe(false);
      expect(res.overallGrade).toBe('Fail');
    });

    it('evaluates boundary 3.00 (passes AA Large and UI Components)', () => {
      const res = evaluateWcagLevels(3.0);
      expect(res.aaLarge).toBe(true);
      expect(res.aaNormal).toBe(false);
      expect(res.aaaLarge).toBe(false);
      expect(res.aaaNormal).toBe(false);
      expect(res.uiComponents).toBe(true);
      expect(res.overallGrade).toBe('AA Large');
    });

    it('evaluates ratio 4.49 and 4.499 (passes AA Large only, no false positive rounding to 4.5)', () => {
      const res = evaluateWcagLevels(4.49);
      expect(res.aaLarge).toBe(true);
      expect(res.aaNormal).toBe(false);
      expect(res.aaaLarge).toBe(false);
      expect(res.aaaNormal).toBe(false);
      expect(res.uiComponents).toBe(true);
      expect(res.overallGrade).toBe('AA Large');

      const nearBoundary = evaluateWcagLevels(4.499);
      expect(nearBoundary.aaNormal).toBe(false);
      expect(nearBoundary.overallGrade).toBe('AA Large');
    });

    it('evaluates boundary 4.50 (passes AA Normal, AAA Large, and AA Large)', () => {
      const res = evaluateWcagLevels(4.5);
      expect(res.aaLarge).toBe(true);
      expect(res.aaNormal).toBe(true);
      expect(res.aaaLarge).toBe(true);
      expect(res.aaaNormal).toBe(false);
      expect(res.uiComponents).toBe(true);
      expect(res.overallGrade).toBe('AA');
    });

    it('evaluates ratio 6.99 (still AA)', () => {
      const res = evaluateWcagLevels(6.99);
      expect(res.aaLarge).toBe(true);
      expect(res.aaNormal).toBe(true);
      expect(res.aaaLarge).toBe(true);
      expect(res.aaaNormal).toBe(false);
      expect(res.uiComponents).toBe(true);
      expect(res.overallGrade).toBe('AA');
    });

    it('evaluates boundary 7.00 (passes AAA)', () => {
      const res = evaluateWcagLevels(7.0);
      expect(res.aaLarge).toBe(true);
      expect(res.aaNormal).toBe(true);
      expect(res.aaaLarge).toBe(true);
      expect(res.aaaNormal).toBe(true);
      expect(res.uiComponents).toBe(true);
      expect(res.overallGrade).toBe('AAA');
    });

    it('evaluates maximum ratio 21.00 (passes AAA)', () => {
      const res = evaluateWcagLevels(21.0);
      expect(res.aaLarge).toBe(true);
      expect(res.aaNormal).toBe(true);
      expect(res.aaaLarge).toBe(true);
      expect(res.aaaNormal).toBe(true);
      expect(res.uiComponents).toBe(true);
      expect(res.overallGrade).toBe('AAA');
    });
  });

  describe('suggestAccessibleColors', () => {
    it('returns unmodified colors if contrast already meets target ratio', () => {
      const res = suggestAccessibleColors('#000000', '#FFFFFF', 4.5);
      expect(res.suggestedForeground).toBe('#FFFFFF');
      expect(res.suggestedBackground).toBe('#000000');
      expect(res.fgRatio).toBe(21);
      expect(res.bgRatio).toBe(21);
    });

    it('suggests lightness adjustments when contrast is below AA (4.5)', () => {
      // White bg with medium gray fg (#888888) -> contrast ~ 3.54 (fails AA)
      const initialContrast = getContrastRatio('#FFFFFF', '#888888');
      expect(initialContrast).toBeLessThan(4.5);

      const res = suggestAccessibleColors('#FFFFFF', '#888888', 4.5);
      expect(res.suggestedForeground).not.toBeNull();
      expect(res.fgRatio).toBeGreaterThanOrEqual(4.5);

      // Verifies suggested foreground against background
      const verifiedRatio = getContrastRatio('#FFFFFF', res.suggestedForeground!);
      expect(verifiedRatio).toBeGreaterThanOrEqual(4.5);

      // Verifies suggested background against foreground
      expect(res.suggestedBackground).not.toBeNull();
      const verifiedBgRatio = getContrastRatio(res.suggestedBackground!, '#888888');
      expect(verifiedBgRatio).toBeGreaterThanOrEqual(4.5);
    });

    it('suggests adjustments for AAA (7.0:1)', () => {
      const res = suggestAccessibleColors('#17324D', '#333333', 7.0);
      expect(res.suggestedForeground).not.toBeNull();
      expect(res.fgRatio).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio('#17324D', res.suggestedForeground!)).toBeGreaterThanOrEqual(7.0);
    });

    it('returns null when mid-luminance anchor color cannot reach AAA (7.0:1) by single-color lightness', () => {
      const res = suggestAccessibleColors('#777777', '#888888', 7.0);
      expect(res.suggestedForeground).toBeNull();
      expect(res.suggestedBackground).toBeNull();
      expect(res.fgRatio).toBeNull();
      expect(res.bgRatio).toBeNull();
    });
  });

  describe('getColorName', () => {
    it('returns CSS color name for recognized colors', () => {
      expect(getColorName('#000000')).toBe('black');
      expect(getColorName('#FFFFFF')).toBe('white');
      expect(getColorName('#17324D')).toBe('darkslategray');
    });

    it('returns null for invalid color string', () => {
      expect(getColorName('invalid')).toBeNull();
    });
  });
});
