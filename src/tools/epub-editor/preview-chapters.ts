export interface PreviewChapter {
  title: string
  text: string
}

export function parsePreviewChapter(html: string, fallbackTitle: string): PreviewChapter {
  const titleMatch = html.match(/<(?:h1|h2)[^>]*>([\s\S]*?)<\/(?:h1|h2)>/i);
  const title = titleMatch?.[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || fallbackTitle;
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const paragraphs = (bodyHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [])
    .map(paragraph => paragraph
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim())
    .filter(Boolean);

  return { title, text: paragraphs.join('\n') };
}

export function getPreviewChapterIndex(index: number, change: number, chapterCount: number) {
  return Math.min(Math.max(index + change, 0), Math.max(chapterCount - 1, 0));
}
