export function getPreviewPageCount(scrollWidth: number, viewportWidth: number) {
  if (viewportWidth <= 0) {
    return 1;
  }

  return Math.max(1, Math.ceil(scrollWidth / viewportWidth));
}

export function clampPreviewPage(page: number, pageCount: number) {
  return Math.min(Math.max(page, 0), Math.max(pageCount - 1, 0));
}
