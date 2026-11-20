import { EPUB_FONT_MAP } from '@/services/epub/fonts';
import { escapeCssString, relativePathFromFile } from '@/services/epub/xml';

export interface StyleGeneratorOptions {
  writingMode: 'horizontal' | 'vertical';
  fontSize: string;
  lineHeight: string;
  textIndent: string;
  fontFamily: string;
  pageMargin: 'none' | 'compact' | 'normal' | 'relaxed' | 'custom';
  customMarginVertical?: number;
  customMarginHorizontal?: number;
  optimizeVerticalLayout?: boolean;
}

export const SIZE_MAP: Record<string, string> = {
  small: '0.9em',
  medium: '1.0em',
  large: '1.15em',
  xlarge: '1.3em',
};

export const LINE_HEIGHT_MAP: Record<string, string> = {
  compact: '1.5',
  normal: '1.8',
  relaxed: '2.0',
  loose: '2.3',
};

export const INDENT_MAP: Record<string, string> = {
  none: '0',
  one: '1em',
  two: '2em',
};

// Shared with the preview so optimized paragraph and heading spacing stay in sync.
export const VERTICAL_PARAGRAPH_MARGIN = '0';
export const VERTICAL_HEADING_MARGIN = '0 0.6em 0 1.2em';

export const MARGIN_PRESET_MAP: Record<string, { v: string; h: string; label: string }> = {
  none: { v: '0', h: '0', label: '無留白 (滿版)' },
  compact: { v: '0.3em', h: '0.5em', label: '極窄 (推薦直排)' },
  normal: { v: '1.0em', h: '1.2em', label: '適中' },
  relaxed: { v: '1.8em', h: '2.0em', label: '寬鬆' },
};

export const FONT_MAP: Record<string, { family: string; name: string; file: string; ext: string; mime: string; format: string }> = Object.fromEntries(
  Object.entries(EPUB_FONT_MAP).map(([key, meta]) => [
    key,
    {
      family: meta.cssFamily,
      name: meta.name,
      file: meta.file,
      ext: meta.ext,
      mime: meta.mime,
      format: meta.format,
    },
  ]),
);

export const OVERRIDE_MARKER_START = '/* === 888TOOLS EPUB OVERRIDES START === */';
export const OVERRIDE_MARKER_END = '/* === 888TOOLS EPUB OVERRIDES END === */';

export function resolveMargins(
  preset: 'none' | 'compact' | 'normal' | 'relaxed' | 'custom' = 'compact',
  customV?: number,
  customH?: number,
): { v: string; h: string } {
  if (preset === 'custom') {
    const vNum = typeof customV === 'number' && !Number.isNaN(customV)
      ? customV
      : 0.3;
    const hNum = typeof customH === 'number' && !Number.isNaN(customH)
      ? customH
      : 0.5;
    return { v: `${vNum}em`, h: `${hNum}em` };
  }
  const found = MARGIN_PRESET_MAP[preset] || MARGIN_PRESET_MAP.compact;
  return { v: found.v, h: found.h };
}

export function relativePathFromCss(cssPath: string, fontPath: string): string {
  return relativePathFromFile(cssPath, fontPath);
}

export interface EmbeddedFontInfo {
  realName?: string;
  embeddedPath: string;
  format: string;
}

export function stripPreviousOverrides(cssContent: string): string {
  let cleaned = cssContent.replace(
    /\/\*\s*===\s*888TOOLS EPUB OVERRIDES START\s*===\s*\*\/[\s\S]*?\/\*\s*===\s*888TOOLS EPUB OVERRIDES END\s*===\s*\*\//g,
    '',
  );
  // Also strip legacy un-delimited marker if re-editing an older exported book
  const legacyIdx = cleaned.indexOf('/* === HelloRuru EPUB Editor 樣式覆蓋 === */');
  if (legacyIdx >= 0) {
    cleaned = cleaned.slice(0, legacyIdx);
  }
  return cleaned.trimEnd();
}

export function generateStyleOverrides(
  options: StyleGeneratorOptions,
  cssFilePath: string,
  customFontInfo: EmbeddedFontInfo | null,
): string {
  const isVertical = options.writingMode === 'vertical';
  const fontSize = SIZE_MAP[options.fontSize] || SIZE_MAP.medium;
  const lineHeight = LINE_HEIGHT_MAP[options.lineHeight] || LINE_HEIGHT_MAP.normal;
  const { v: marginV, h: marginH } = resolveMargins(
    options.pageMargin,
    options.customMarginVertical,
    options.customMarginHorizontal,
  );

  let css = `\n${OVERRIDE_MARKER_START}\n`;

  const font = FONT_MAP[options.fontFamily] || FONT_MAP.default;
  const useCustom = options.fontFamily === 'custom' && customFontInfo;
  const useEmbeddedStandard = options.fontFamily !== 'custom' && options.fontFamily !== 'default' && customFontInfo;

  if (useCustom || useEmbeddedStandard) {
    const info = customFontInfo;
    const rawFamily = info.realName || (useCustom ? 'CustomUserFont' : font.name);
    const safeFamily = escapeCssString(rawFamily);
    const fontAbsPath = info.embeddedPath;
    const fontUrl = escapeCssString(cssFilePath
      ? relativePathFromCss(cssFilePath, fontAbsPath)
      : fontAbsPath);
    const safeFormat = escapeCssString(info.format || 'truetype');

    css += `@font-face {
  font-family: "${safeFamily}";
  src: url("${fontUrl}") format("${safeFormat}");
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: "CustomUserFont";
  src: url("${fontUrl}") format("${safeFormat}");
  font-weight: normal;
  font-style: normal;
}
body, p, div, span, li, blockquote, h1, h2, h3, h4, h5, h6 { font-family: "${safeFamily}", "CustomUserFont", sans-serif !important; }
code, pre, kbd, samp, tt { font-family: monospace !important; }
`;
  }
  else if (options.fontFamily !== 'default' && options.fontFamily !== 'custom') {
    css += `body { font-family: ${font.family}; }\n`;
  }

  css += `body { font-size: ${fontSize}; line-height: ${lineHeight}; }\n`;

  const indent = INDENT_MAP[options.textIndent] || INDENT_MAP.two;
  css += `p { text-indent: ${indent}; }\n`;

  // Apply author-defined spacing once, on body. Reader UI margins remain reader-controlled.
  css += `@page {
  margin: 0 !important;
}
html, body {
  margin: 0 !important;
  padding: 0 !important;
  box-sizing: border-box !important;
}
body {
  padding: ${marginV} ${marginH} !important;
}
body > div, body > section, body > article, body > main {
  box-sizing: border-box !important;
}
`;

  if (isVertical) {
    css += `html, body, body :not(pre):not(code):not(svg):not(svg *):not(math):not(math *) {
  writing-mode: vertical-rl !important;
  -webkit-writing-mode: vertical-rl !important;
  -epub-writing-mode: vertical-rl !important;
  text-orientation: mixed !important;
}
`;

    if (options.optimizeVerticalLayout !== false) {
      css += `/* 直排排版優化：清除原橫排段落上下留白與容器寬度拘束 */
p {
  margin: ${VERTICAL_PARAGRAPH_MARGIN} !important;
}
h1, h2, h3, h4, h5, h6 {
  text-align: center !important;
  margin: ${VERTICAL_HEADING_MARGIN} !important;
}
body, body > div, body > section, body > article, body > main {
  max-width: none !important;
}
`;
    }
  }
  else {
    css += `html, body, body * {
  writing-mode: horizontal-tb !important;
  -webkit-writing-mode: horizontal-tb !important;
  -epub-writing-mode: horizontal-tb !important;
  text-orientation: mixed !important;
}
`;
  }

  css += `${OVERRIDE_MARKER_END}\n`;
  return css;
}
