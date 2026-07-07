export const siteConfig = {
  origin: 'https://tool.david888.com',
  apiCatalogPath: '/.well-known/api-catalog',
  contentSignal: 'ai-train=no, search=yes, ai-input=no',
  // Add real HTTP APIs here when they exist. Interactive tool pages are not APIs.
  // Example:
  // {
  //   anchor: 'https://tool.david888.com/api/example',
  //   serviceDesc: 'https://tool.david888.com/api/example/openapi.json',
  //   serviceDoc: 'https://tool.david888.com/docs/example-api',
  //   status: 'https://tool.david888.com/api/example/health',
  // }
  apiCatalogEntries: [],
};

export function normalizeOrigin(origin) {
  return String(origin || siteConfig.origin).replace(/\/+$/, '');
}

export function toAbsoluteUrl(pathOrUrl, origin = siteConfig.origin) {
  if (/^https?:\/\//.test(pathOrUrl))
    return pathOrUrl;

  return new URL(pathOrUrl, `${normalizeOrigin(origin)}/`).toString();
}

export function resolveSiteConfig(env = {}) {
  const origin = normalizeOrigin(env.VITE_SITE_ORIGIN ?? siteConfig.origin);
  const apiCatalogPath = siteConfig.apiCatalogPath;

  return {
    ...siteConfig,
    origin,
    apiCatalogPath,
    apiCatalogUrl: toAbsoluteUrl(apiCatalogPath, origin),
    contentSignal: env.VITE_CONTENT_SIGNAL ?? siteConfig.contentSignal,
    apiCatalogEntries: siteConfig.apiCatalogEntries.map(entry => ({
      anchor: toAbsoluteUrl(entry.anchor, origin),
      serviceDesc: toAbsoluteUrl(entry.serviceDesc, origin),
      serviceDoc: toAbsoluteUrl(entry.serviceDoc, origin),
      status: entry.status ? toAbsoluteUrl(entry.status, origin) : undefined,
    })),
  };
}
