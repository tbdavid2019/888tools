import { describe, expect, it } from 'vitest';
import { isValidTaxId, isValidTwId } from './core/twid';
import { detect } from './core/detector';
import { BUILTIN_PATTERNS } from './core/patterns';
import { CodeBook } from './core/codes';
import { applyRedactions, blankOut, outputFor } from './core/redactor';
import { parseMapping, serializeMapping } from './core/csv';
import { restore } from './core/restorer';

describe('Data De-identification Service', () => {
  describe('Taiwan ID (身分證) Validation', () => {
    it('validates correct TW IDs', () => {
      expect(isValidTwId('A123456789')).toBe(true);
      expect(isValidTwId('F131104093')).toBe(true);
      expect(isValidTwId('B223456782')).toBe(true);
    });

    it('rejects invalid TW IDs', () => {
      expect(isValidTwId('A123456788')).toBe(false);
      expect(isValidTwId('A323456789')).toBe(false); // gender digit must be 1 or 2
      expect(isValidTwId('1234567890')).toBe(false);
    });
  });

  describe('Unified Business Number (統一編號) Validation', () => {
    it('validates correct Taiwan tax IDs', () => {
      expect(isValidTaxId('04595257')).toBe(true);
      expect(isValidTaxId('10458575')).toBe(true);
      expect(isValidTaxId('00501503')).toBe(true);
    });

    it('rejects invalid tax IDs', () => {
      expect(isValidTaxId('12345678')).toBe(false);
      expect(isValidTaxId('1234567')).toBe(false);
    });
  });

  describe('PII Detection Engine', () => {
    const allPatterns = BUILTIN_PATTERNS;

    it('detects Taiwan phone numbers and emails', () => {
      const text = '請聯絡張專員，手機 0912-345-678，信箱 service@example.com。';
      const items = detect(text, allPatterns);
      const categories = items.map((i) => i.category);

      expect(categories).toContain('手機');
      expect(categories).toContain('電子郵件');
    });

    it('detects international formats like Credit Cards and IPv4', () => {
      const text = '伺服器 IP 192.168.1.100，信用卡末四碼非全號 4111 1111 1111 1111';
      const items = detect(text, allPatterns);
      const categories = items.map((i) => i.category);

      expect(categories).toContain('IP');
      expect(categories).toContain('信用卡');
    });
  });

  describe('De-identification and Reversible Restoration', () => {
    const allPatterns = BUILTIN_PATTERNS;

    it('round-trips de-identification and restoration with CSV mapping', () => {
      const originalText = '聯絡人：王小明，電話：0912-345-678，信箱：test@example.com。';
      const items = detect(originalText, allPatterns);
      expect(items.length).toBeGreaterThan(0);

      const redactionResult = applyRedactions(originalText, items, 'code');
      const redactedText = redactionResult.redactedText;

      // Ensure original sensitive values are no longer in the text
      expect(redactedText).not.toContain('0912-345-678');
      expect(redactedText).not.toContain('test@example.com');

      // Export CSV mapping table
      const csv = serializeMapping(redactionResult.mapping);
      expect(csv).toContain('code,category,original');

      // Parse mapping table and restore original text
      const parsedMapping = parseMapping(csv);
      expect(parsedMapping.errors).toHaveLength(0);
      const restored = restore(redactedText, parsedMapping.entries);

      expect(restored.restoredText).toBe(originalText);
      expect(restored.missingCodes).toHaveLength(0);
    });

    it('supports blank out placeholder (公文空白佔位 "○○○")', () => {
      const sample = '0912-345-678';
      const blanked = blankOut(sample);
      expect(blanked).toBe('○○○○-○○○-○○○');
    });

    it('supports category marker style ([類別])', () => {
      const item = {
        id: '1',
        category: '姓名' as const,
        start: 0,
        end: 3,
        original: '王小明',
        code: 'abc123',
        origin: 'auto' as const,
        active: true,
      };
      const label = outputFor(item, 'label');
      expect(label).toBe('[姓名]');
    });
  });
});
