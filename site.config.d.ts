export interface ApiCatalogEntry {
  anchor: string
  serviceDesc: string
  serviceDoc: string
  status?: string
}

export interface SiteConfig {
  origin: string
  apiCatalogPath: string
  contentSignal: string
  apiCatalogEntries: ApiCatalogEntry[]
}

export declare const siteConfig: SiteConfig;

export declare function normalizeOrigin(origin?: string): string;

export declare function toAbsoluteUrl(pathOrUrl: string, origin?: string): string;

export declare function resolveSiteConfig(env?: Record<string, string | undefined>): SiteConfig & {
  apiCatalogUrl: string
};
