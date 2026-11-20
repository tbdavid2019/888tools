import type { StyleGeneratorOptions } from './style-generator';
import { describe, expect, it } from 'vitest';
import {
  generateStyleOverrides,
  relativePathFromCss,
  resolveMargins,
  stripPreviousOverrides,

} from './style-generator';

describe('style-generator', () => {
  describe('resolveMargins', () => {
    it('resolves default preset to compact', () => {
      expect(resolveMargins()).toEqual({ v: '0.3em', h: '0.5em' });
    });

    it('resolves none preset to 0', () => {
      expect(resolveMargins('none')).toEqual({ v: '0', h: '0' });
    });

    it('resolves custom preset with numbers', () => {
      expect(resolveMargins('custom', 0.8, 1.5)).toEqual({ v: '0.8em', h: '1.5em' });
    });

    it('handles NaN/invalid custom values gracefully', () => {
      expect(resolveMargins('custom', NaN, undefined)).toEqual({ v: '0.3em', h: '0.5em' });
    });
  });

  describe('generateStyleOverrides', () => {
    const baseOptions: StyleGeneratorOptions = {
      writingMode: 'vertical',
      fontSize: 'medium',
      lineHeight: 'normal',
      textIndent: 'two',
      fontFamily: 'noto-sans',
      pageMargin: 'compact',
      optimizeVerticalLayout: true,
    };

    it('generates vertical CSS with @page and body margin rules', () => {
      const css = generateStyleOverrides(baseOptions, 'OEBPS/styles.css', null);
      expect(css).toContain('writing-mode: vertical-rl !important;');
      expect(css).toContain('@page {\n  margin: 0 !important;\n}');
      expect(css).toContain('html, body {\n  margin: 0 !important;\n  padding: 0 !important;');
      expect(css).toContain('body {\n  padding: 0.3em 0.5em !important;');
      expect(css).toContain('max-width: none !important;');
      expect(css).toContain('p {\n  margin: 0 !important;');
    });

    it('generates zero margin when preset is none', () => {
      const css = generateStyleOverrides({ ...baseOptions, pageMargin: 'none' }, 'OEBPS/styles.css', null);
      expect(css).toContain('@page {\n  margin: 0 !important;\n}');
      expect(css).toContain('padding: 0 0 !important;');
    });

    it('generates horizontal CSS when writingMode is horizontal', () => {
      const css = generateStyleOverrides(
        { ...baseOptions, writingMode: 'horizontal', pageMargin: 'normal' },
        'OEBPS/styles.css',
        null,
      );
      expect(css).toContain('writing-mode: horizontal-tb !important;');
      expect(css).toContain('body {\n  padding: 1.0em 1.2em !important;\n}');
      expect(css).not.toContain('直排排版優化');
    });

    it('respects optimizeVerticalLayout=false if disabled', () => {
      const css = generateStyleOverrides(
        { ...baseOptions, optimizeVerticalLayout: false },
        'OEBPS/styles.css',
        null,
      );
      expect(css).toContain('writing-mode: vertical-rl !important;');
      expect(css).not.toContain('直排排版優化');
    });

    it('escapes malicious font family names and avoids leaking preview-only family when custom font is not embedded', () => {
      const cssWithEmbedded = generateStyleOverrides(
        { ...baseOptions, fontFamily: 'custom' },
        'OEBPS/Styles/main.css',
        { embeddedPath: 'OEBPS/fonts/custom.ttf', format: 'truetype', realName: 'Bad"Font\nName' },
      );
      expect(cssWithEmbedded).toContain('font-family: "Bad\\"Font Name";');
      expect(cssWithEmbedded).toContain('url("../fonts/custom.ttf")');

      const cssWithoutEmbedded = generateStyleOverrides(
        { ...baseOptions, fontFamily: 'custom' },
        'OEBPS/Styles/main.css',
        null,
      );
      expect(cssWithoutEmbedded).not.toContain('EpubEditorPreviewCustom');
    });

    it('computes relative font paths from nested CSS and strips previous overrides idempotently', () => {
      expect(relativePathFromCss('OEBPS/Styles/main.css', 'OEBPS/fonts/a.ttf')).toBe('../fonts/a.ttf');
      const once = `body { color: #000; }\n${generateStyleOverrides(baseOptions, 'OEBPS/main.css', null)}`;
      expect(stripPreviousOverrides(once)).toBe('body { color: #000; }');
    });
  });
});
