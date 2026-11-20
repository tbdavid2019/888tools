import type JSZip from 'jszip';
import type { StyleGeneratorOptions } from './style-generator';
import DomPurify from 'dompurify';
import { EPUB_FONT_MAP } from '@/services/epub/fonts';
import {
  convertEpubDocumentText,
  escapeCssString,
  getDirPrefix,
  getElementsByLocalName,
  parseXhtmlOrHtml,
  readZipTextAuto,
  resolveRelativePath,
} from '@/services/epub/xml';
import { convertOpenCC, convertPunctuation } from '@/services/opencc.service';
import { generateStyleOverrides, stripPreviousOverrides } from './style-generator';

export interface PreviewRenderOptions extends StyleGeneratorOptions {
  convertMode: 'twp' | 'tw' | 'off';
  convertPunctuation: boolean;
  customFontUrl?: string;
  isDark?: boolean;
  baseOrigin?: string;
  baseUrl?: string;
}

export interface RenderedPreviewResult {
  srcdoc: string;
  createdBlobUrls: string[];
}

function buildPreviewFontCss(options: PreviewRenderOptions): string {
  if (options.fontFamily === 'default') {
    return '';
  }

  if (options.fontFamily === 'custom') {
    if (!options.customFontUrl) {
      return '';
    }
    return `@font-face {
  font-family: "EpubEditorPreviewCustom";
  src: url("${escapeCssString(options.customFontUrl)}");
  font-display: swap;
}
body, p, div, span, li, blockquote, h1, h2, h3, h4, h5, h6 {
  font-family: "EpubEditorPreviewCustom", sans-serif !important;
}`;
  }

  const meta = EPUB_FONT_MAP[options.fontFamily];
  if (!meta || !meta.file) {
    return '';
  }
  const resolvedFontUrl = options.baseOrigin
    ? new URL(meta.file, options.baseOrigin).toString()
    : meta.file;
  const primaryFamily = meta.cssFamily.split(',')[0].trim().replace(/^"|"$/g, '');

  return `@font-face {
  font-family: "${escapeCssString(primaryFamily)}";
  src: url("${escapeCssString(resolvedFontUrl)}") format("${meta.format}");
  font-display: swap;
}
body, p, div, span, li, blockquote, h1, h2, h3, h4, h5, h6 {
  font-family: ${meta.cssFamily} !important;
}`;
}

function buildBasePreviewThemeCss(isDark: boolean, isVertical: boolean): string {
  const bg = isDark ? '#18181c' : '#fafafa';
  const fg = isDark ? '#e3e3e3' : '#2b2b2b';
  const heading = isDark ? '#ffffff' : '#1a1a1a';

  return `
html, body {
  background-color: ${bg};
  color: ${fg};
}
${isVertical
  ? `html {
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}
body {
  height: 100%;
}`
  : `html, body {
  overflow-x: hidden;
}`}
h1, h2, h3, h4, h5, h6 {
  color: ${heading};
}
img, svg {
  max-width: 100%;
  height: auto;
}
`;
}

/**
 * Renders an actual EPUB chapter inside an isolated, sanitized HTML document for `<iframe sandbox="allow-same-origin">`.
 */
export async function renderChapterPreviewSrcdoc(
  zip: JSZip,
  chapterPath: string,
  options: PreviewRenderOptions,
): Promise<RenderedPreviewResult> {
  const createdBlobUrls: string[] = [];
  const rawHtml = await readZipTextAuto(zip, chapterPath);
  if (!rawHtml) {
    return {
      srcdoc: buildFallbackPreviewSrcdoc('即時預覽', '無法讀取該章節內容。', options),
      createdBlobUrls,
    };
  }

  const convertText = (text: string): string => {
    let out = text;
    if (options.convertMode !== 'off') {
      out = convertOpenCC(out, options.convertMode === 'twp'
        ? 's2twp'
        : 's2tw');
    }
    if (options.convertPunctuation) {
      out = convertPunctuation(out);
    }
    return out;
  };

  const extLower = chapterPath.toLowerCase();
  const ext = extLower.endsWith('.html')
    ? '.html'
    : extLower.endsWith('.htm')
      ? '.htm'
      : '.xhtml';

  const processedHtml = (options.convertMode !== 'off' || options.convertPunctuation)
    ? convertEpubDocumentText(rawHtml, ext, convertText, true)
    : rawHtml;

  const { doc } = parseXhtmlOrHtml(processedHtml);
  const chapterDir = getDirPrefix(chapterPath);

  // Collect original book CSS stylesheets & inline <style> blocks
  const styleParts: string[] = [];
  for (const linkEl of getElementsByLocalName(doc, 'link')) {
    const rel = (linkEl.getAttribute('rel') || '').toLowerCase();
    const href = linkEl.getAttribute('href');
    if (rel === 'stylesheet' && href) {
      const cssPath = resolveRelativePath(chapterDir, href.split('#')[0].split('?')[0]);
      const cssText = await readZipTextAuto(zip, cssPath);
      if (cssText) {
        styleParts.push(stripPreviousOverrides(cssText));
      }
    }
  }
  for (const styleEl of getElementsByLocalName(doc, 'style')) {
    if (styleEl.getAttribute('id') !== 'epub-editor-overrides' && styleEl.textContent) {
      styleParts.push(stripPreviousOverrides(styleEl.textContent));
    }
  }

  const bodyEl = getElementsByLocalName(doc, 'body')[0] || doc.documentElement;
  // Sanitize untrusted EPUB markup BEFORE resolving trusted ZIP image Blob URLs
  const sanitizedMarkup = DomPurify.sanitize(bodyEl ? bodyEl.innerHTML : '', {
    USE_PROFILES: { html: true, svg: true },
    ADD_ATTR: ['href', 'xlink:href'],
    ALLOW_UNKNOWN_PROTOCOLS: false,
  });

  const { doc: safeDoc } = parseXhtmlOrHtml(`<!DOCTYPE html><html><body>${sanitizedMarkup}</body></html>`);
  const safeBody = getElementsByLocalName(safeDoc, 'body')[0];

  if (safeBody) {
    for (const imgEl of getElementsByLocalName(safeBody, 'img')) {
      const src = imgEl.getAttribute('src');
      if (!src || src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://')) {
        continue;
      }
      const imgPath = resolveRelativePath(chapterDir, src.split('#')[0].split('?')[0]);
      const entry = zip.files[imgPath];
      if (entry && !entry.dir) {
        const blob = await entry.async('blob');
        const url = URL.createObjectURL(blob);
        createdBlobUrls.push(url);
        imgEl.setAttribute('src', url);
      }
    }

    for (const svgImage of getElementsByLocalName(safeBody, 'image')) {
      const href = svgImage.getAttribute('xlink:href') || svgImage.getAttribute('href');
      if (!href || href.startsWith('data:') || href.startsWith('http://') || href.startsWith('https://')) {
        continue;
      }
      const imgPath = resolveRelativePath(chapterDir, href.split('#')[0].split('?')[0]);
      const entry = zip.files[imgPath];
      if (entry && !entry.dir) {
        const blob = await entry.async('blob');
        const url = URL.createObjectURL(blob);
        createdBlobUrls.push(url);
        svgImage.setAttribute('href', url);
        svgImage.removeAttribute('xlink:href');
      }
    }
  }

  const sanitizedBody = safeBody ? safeBody.innerHTML : sanitizedMarkup;

  const overrideCss = generateStyleOverrides(options, '', null);
  const previewFontCss = buildPreviewFontCss(options);
  const themeCss = buildBasePreviewThemeCss(Boolean(options.isDark), options.writingMode === 'vertical');

  const safeCss = [
    ...styleParts,
    themeCss,
    overrideCss,
    previewFontCss,
  ]
    .join('\n')
    .replace(/<\/style/gi, '<\\/style');

  return {
    srcdoc: `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${safeCss}</style>
</head>
<body>${sanitizedBody}</body>
</html>`,
    createdBlobUrls,
  };
}

export function buildFallbackPreviewSrcdoc(
  title: string,
  text: string,
  options: PreviewRenderOptions,
): string {
  const safeTitle = DomPurify.sanitize(title, { ALLOWED_TAGS: [] });
  const safeParagraphs = text
    .split(/\n+/)
    .filter(p => p.trim())
    .map(p => `<p>${DomPurify.sanitize(p.trim(), { ALLOWED_TAGS: [] })}</p>`)
    .join('\n');

  const overrideCss = generateStyleOverrides(options, '', null);
  const previewFontCss = buildPreviewFontCss(options);
  const themeCss = buildBasePreviewThemeCss(Boolean(options.isDark), options.writingMode === 'vertical');

  const safeCss = [themeCss, overrideCss, previewFontCss]
    .join('\n')
    .replace(/<\/style/gi, '<\\/style');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>${safeCss}</style>
</head>
<body>
<h1>${safeTitle}</h1>
${safeParagraphs}
</body>
</html>`;
}
