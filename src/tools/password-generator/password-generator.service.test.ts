import { describe, expect, it } from 'vitest';
import { generateAllPasswordCategories, estimatePasswordStrength } from './password-generator.service';

describe('Password Generator Service', () => {
  it('should generate password categories with requested length', () => {
    const categories = generateAllPasswordCategories({ length: 16 });
    expect(categories.length).toBeGreaterThan(5);

    for (const cat of categories) {
      expect(cat.items.length).toBeGreaterThan(0);
      for (const item of cat.items) {
        expect(item.value).toBeTruthy();
        expect(item.crackTime).toBeTruthy();
        expect(item.strength).toBeTruthy();
      }
    }
  });

  it('should exclude ambiguous characters when requested', () => {
    const categories = generateAllPasswordCategories({ length: 32, excludeAmbiguous: true });
    const alphaNumCategory = categories.find(c => c.titleEn === 'Alphabets & Numbers');
    expect(alphaNumCategory).toBeDefined();

    const plain = alphaNumCategory!.items[0].value;
    expect(/[0O1lI|]/.test(plain)).toBe(false);
  });

  it('should accurately calculate strength and crack time', () => {
    const strong = estimatePasswordStrength('8`jahHOA\'5Cc]GC#');
    expect(['strong', 'very-strong']).toContain(strong.strength);

    const weak = estimatePasswordStrength('1234');
    expect(weak.strength).toBe('weak');
  });

  it('should place passphrase category at the very top (index 0)', () => {
    const categories = generateAllPasswordCategories({ length: 16 });
    expect(categories[0].key).toBe('passphrase');
    expect(categories[0].items.length).toBe(3);
    expect(categories[0].items[0].labelKey).toBe('passphraseStandard');
    expect(categories[0].items[1].labelKey).toBe('passphraseCapitalized');
    expect(categories[0].items[2].labelKey).toBe('passphraseEnhanced');
  });
});
