import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import { resolveSiteConfig, toAbsoluteUrl } from '../site.config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const wellKnownDir = path.join(publicDir, '.well-known');

const staticRoutes = ['/', '/about'];

async function readTools() {
  const toolsDir = path.join(rootDir, 'src', 'tools');
  const fileNames = await readFile(path.join(rootDir, 'src', 'tools', 'index.ts'), 'utf8');
  const matches = [...fileNames.matchAll(/from '\.\/([^']+)'/g)];
  const toolDirs = [...new Set(matches.map(match => match[1]))];

  let toolsData = {};
  try {
    const enYamlContent = await readFile(path.join(rootDir, 'locales', 'en.yml'), 'utf8');
    const parsedYaml = YAML.parse(enYamlContent);
    toolsData = parsedYaml?.tools || {};
  }
  catch (err) {
    console.warn('Warning: Failed to load locales/en.yml for tool titles/descriptions:', err.message);
  }

  const tools = [];

  for (const toolDir of toolDirs) {
    const indexPath = path.join(toolsDir, toolDir, 'index.ts');

    try {
      const source = await readFile(indexPath, 'utf8');
      const pathMatch = source.match(/path:\s*'([^']+)'/);
      if (!pathMatch)
        continue;

      const route = pathMatch[1];

      let title = '';
      const nameTranslateMatch = source.match(/name:\s*translate\(['"]tools\.([^'"]+)\.title['"]\)/);
      const nameLiteralMatch = source.match(/name:\s*['"`](.*?)['"`]/);
      if (nameTranslateMatch) {
        title = toolsData[nameTranslateMatch[1]]?.title || nameTranslateMatch[1];
      }
      else if (nameLiteralMatch) {
        title = nameLiteralMatch[1];
      }
      else if (toolsData[toolDir]?.title) {
        title = toolsData[toolDir].title;
      }
      else {
        title = toolDir;
      }

      let description = '';
      const descTranslateMatch = source.match(/description:\s*translate\(['"]tools\.([^'"]+)\.description['"]\)/);
      const descLiteralMatch = source.match(/description:\s*['"`](.*?)['"`]/);
      if (descTranslateMatch) {
        description = toolsData[descTranslateMatch[1]]?.description || '';
      }
      else if (descLiteralMatch) {
        description = descLiteralMatch[1];
      }
      else if (toolsData[toolDir]?.description) {
        description = toolsData[toolDir].description;
      }

      tools.push({
        dir: toolDir,
        route,
        title: title.trim(),
        description: description.trim(),
      });
    }
    catch {
      // Ignore directories without valid index.ts
    }
  }

  tools.sort((a, b) => a.title.localeCompare(b.title));
  return tools;
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

function buildLlmsTxt(tools, config) {
  const lines = [
    '# 888tools',
    '',
    '> Collection of handy online tools for developers, privacy-friendly and open-source.',
    '',
    '## Tools',
    '',
  ];

  for (const tool of tools) {
    const url = toAbsoluteUrl(tool.route, config.origin);
    const desc = tool.description ? `: ${tool.description}` : '';
    lines.push(`- [${tool.title}](${url})${desc}`);
  }

  lines.push('');
  lines.push('## Optional');
  lines.push('');
  lines.push(`- [Sitemap](${toAbsoluteUrl('/sitemap.xml', config.origin)})`);
  lines.push(`- [API Catalog](${config.apiCatalogUrl})`);
  lines.push('');

  return lines.join('\n');
}

async function main() {
  const config = resolveSiteConfig(process.env);
  const tools = await readTools();
  const toolRoutes = tools.map(t => t.route);
  const allRoutes = [...new Set([...staticRoutes, ...toolRoutes])].sort();
  const sitemapUrls = allRoutes.map(route => toAbsoluteUrl(route, config.origin));

  await mkdir(wellKnownDir, { recursive: true });
  await writeFile(path.join(publicDir, 'robots.txt'), buildRobots(config), 'utf8');
  await writeFile(path.join(publicDir, 'sitemap.xml'), buildSitemap(sitemapUrls), 'utf8');
  await writeFile(path.join(wellKnownDir, 'api-catalog'), buildApiCatalog(config), 'utf8');
  await writeFile(path.join(publicDir, 'llms.txt'), buildLlmsTxt(tools, config), 'utf8');
}

await main();

