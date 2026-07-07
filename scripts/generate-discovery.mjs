import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveSiteConfig, toAbsoluteUrl } from '../site.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const wellKnownDir = path.join(publicDir, '.well-known');

const staticRoutes = ['/', '/about'];

async function readToolRoutes() {
  const toolsDir = path.join(rootDir, 'src', 'tools');
  const fileNames = await readFile(path.join(rootDir, 'src', 'tools', 'index.ts'), 'utf8');
  const matches = [...fileNames.matchAll(/from '\.\/([^']+)'/g)];
  const toolDirs = [...new Set(matches.map(match => match[1]))];

  const routes = await Promise.all(toolDirs.map(async (toolDir) => {
    const indexPath = path.join(toolsDir, toolDir, 'index.ts');

    try {
      const source = await readFile(indexPath, 'utf8');
      const pathMatch = source.match(/path:\s*'([^']+)'/);
      return pathMatch?.[1] ?? null;
    }
    catch {
      return null;
    }
  }));

  return routes.filter(Boolean);
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&apos;');
}

function buildSitemap(urls) {
  const entries = urls
    .map(url => `  <url>\n    <loc>${escapeXml(url)}</loc>\n  </url>`)
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries,
    '</urlset>',
    '',
  ].join('\n');
}

function buildApiCatalog(config) {
  return JSON.stringify({
    linkset: config.apiCatalogEntries.map(entry => ({
      anchor: entry.anchor,
      'service-desc': [{ href: entry.serviceDesc, type: 'application/json' }],
      'service-doc': [{ href: entry.serviceDoc, type: 'text/html' }],
      ...(entry.status ? { status: [{ href: entry.status, type: 'application/json' }] } : {}),
    })),
  }, null, 2) + '\n';
}

function buildRobots(config) {
  return [
    'User-agent: *',
    'Disallow:',
    `Sitemap: ${toAbsoluteUrl('/sitemap.xml', config.origin)}`,
    `Content-Signal: ${config.contentSignal}`,
    '',
  ].join('\n');
}

async function main() {
  const config = resolveSiteConfig(process.env);
  const toolRoutes = await readToolRoutes();
  const allRoutes = [...new Set([...staticRoutes, ...toolRoutes])].sort();
  const sitemapUrls = allRoutes.map(route => toAbsoluteUrl(route, config.origin));

  await mkdir(wellKnownDir, { recursive: true });
  await writeFile(path.join(publicDir, 'robots.txt'), buildRobots(config), 'utf8');
  await writeFile(path.join(publicDir, 'sitemap.xml'), buildSitemap(sitemapUrls), 'utf8');
  await writeFile(path.join(wellKnownDir, 'api-catalog'), buildApiCatalog(config), 'utf8');
}

await main();
