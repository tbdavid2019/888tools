import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const localesDir = path.join(rootDir, 'locales');

// MIME types for the static server
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// 1. Start a simple HTTP server to serve the built 'dist' directory
function startServer(port = 5050) {
  const server = http.createServer(async (req, res) => {
    let urlPath = req.url.split('?')[0];
    let filePath = path.join(distDir, urlPath);
    if (filePath.endsWith('/')) {
      filePath = path.join(filePath, 'index.html');
    }

    let ext = path.extname(filePath);
    // SPA Fallback: Serve the main index.html for route requests (without file extension)
    if (!existsSync(filePath) || ext === '') {
      filePath = path.join(distDir, 'index.html');
      ext = '.html';
    }

    try {
      const content = await fs.readFile(filePath);
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    } catch (error) {
      res.writeHead(500);
      res.end(`Server Error: ${error.code}`);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Prerender server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

// 2. Read translation keys to map tools with their localized titles & descriptions
async function loadTranslations() {
  const zhTwYaml = await fs.readFile(path.join(localesDir, 'zh-TW.yml'), 'utf8');
  return YAML.parse(zhTwYaml);
}

// 3. Scan and load all tool configurations dynamically
async function getTools(translations) {
  const toolsDir = path.join(rootDir, 'src', 'tools');
  const indexContent = await fs.readFile(path.join(toolsDir, 'index.ts'), 'utf8');
  const matches = [...indexContent.matchAll(/from '\.\/([^']+)'/g)];
  const toolDirs = [...new Set(matches.map(match => match[1]))];

  const tools = [];
  for (const toolDir of toolDirs) {
    const indexPath = path.join(toolsDir, toolDir, 'index.ts');
    try {
      const source = await fs.readFile(indexPath, 'utf8');
      const pathMatch = source.match(/path:\s*'([^']+)'/);
      if (!pathMatch) continue;

      const pathVal = pathMatch[1];
      const keyMatch = source.match(/tools\.([^']+)\.title/);
      const key = keyMatch ? keyMatch[1] : toolDir;

      // Extract keywords
      const keywordsMatch = source.match(/keywords:\s*\[([\s\S]*?)\]/);
      let keywords = [];
      if (keywordsMatch) {
        keywords = keywordsMatch[1]
          .split(',')
          .map(k => k.trim().replace(/['"]/g, ''))
          .filter(Boolean);
      }

      const title = translations.tools?.[key]?.title || key;
      const description = translations.tools?.[key]?.description || '';

      tools.push({
        dir: toolDir,
        path: pathVal,
        key,
        title,
        description,
        keywords,
      });
    } catch (e) {
      // Ignore files/folders that don't match standard tool structure
    }
  }
  return tools;
}

// 4. Inject JSON-LD structured data into the HTML head
function injectJsonLd(html, jsonLd) {
  const jsonLdScript = `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n`;
  return html.replace('</head>', `${jsonLdScript}</head>`);
}

// 5. Main prerendering sequence
async function main() {
  const port = 5050;
  const server = await startServer(port);
  const translations = await loadTranslations();
  const tools = await getTools(translations);

  console.log(`Found ${tools.length} tools to prerender.`);

  // Launch Playwright browser
  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
  });

  // Keep a copy of the original clean index.html to avoid accumulating changes
  const originalIndexHtml = await fs.readFile(path.join(distDir, 'index.html'), 'utf8');

  // Helper to ensure target directories exist
  const saveHtml = async (routePath, htmlContent) => {
    const relativeDir = routePath === '/' ? '' : routePath;
    const targetDir = path.join(distDir, relativeDir);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, 'index.html'), htmlContent, 'utf8');
  };

  try {
    const page = await context.newPage();

    // -- A. Prerender Homepage (/) --
    console.log('Prerendering Homepage...');
    await page.goto(`http://localhost:${port}/`);
    await page.waitForSelector('#app > *', { timeout: 10000 });
    // Additional wait to ensure everything is mounted
    await page.waitForTimeout(1000);
    let homeHtml = await page.content();

    // Inject structured data for homepage
    const homeJsonLd = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": "https://tool.david888.com/#website",
          "url": "https://tool.david888.com/",
          "name": "888工具箱 - 實用的文字、影音與日常開發工具箱",
          "description": "提供文字處理、進制轉換、密碼產生、圖片影片音訊處理、網路、數學等豐富的免費線上開發者工具，界面簡潔，體驗優質。",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://tool.david888.com/?search={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        },
        {
          "@type": "ItemList",
          "name": "888工具箱 - 工具列表",
          "numberOfItems": tools.length,
          "itemListElement": tools.map((t, idx) => ({
            "@type": "ListItem",
            "position": idx + 1,
            "url": `https://tool.david888.com${t.path}`,
            "name": t.title,
            "description": t.description
          }))
        }
      ]
    };
    homeHtml = injectJsonLd(homeHtml, homeJsonLd);
    await saveHtml('/', homeHtml);

    // -- B. Prerender About page (/about) --
    console.log('Prerendering About page...');
    await page.goto(`http://localhost:${port}/about`);
    await page.waitForSelector('#app > *', { timeout: 10000 });
    await page.waitForTimeout(1000);
    let aboutHtml = await page.content();

    const aboutJsonLd = {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "關於 888工具箱",
      "description": "888工具箱（Tool.David888.com）是一款為開發人員和 IT 從業者設計的實用工具集合。預設繁體中文，無廣告，加載迅速，完全在瀏覽器端運行，安全隱私保護。",
      "url": "https://tool.david888.com/about"
    };
    aboutHtml = injectJsonLd(aboutHtml, aboutJsonLd);
    await saveHtml('/about', aboutHtml);

    // -- C. Prerender individual Tool pages --
    for (const tool of tools) {
      console.log(`Prerendering tool: ${tool.title} (${tool.path})...`);
      try {
        await page.goto(`http://localhost:${port}${tool.path}`);
        await page.waitForSelector('#app > *', { timeout: 10000 });
        await page.waitForTimeout(1000);
        let toolHtml = await page.content();

        // Inject Structured Data (JSON-LD) for SoftwareApplication
        const toolJsonLd = {
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": tool.title,
          "description": tool.description,
          "applicationCategory": "DeveloperApplication",
          "operatingSystem": "All",
          "browserRequirements": "Requires HTML5 and modern web browser.",
          "url": `https://tool.david888.com${tool.path}`,
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD"
          }
        };
        toolHtml = injectJsonLd(toolHtml, toolJsonLd);
        await saveHtml(tool.path, toolHtml);
      } catch (err) {
        console.error(`Failed to prerender tool ${tool.path}:`, err);
      }
    }

    console.log('Prerendering completed successfully!');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(console.error);
