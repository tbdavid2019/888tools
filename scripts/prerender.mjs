import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const localesDir = path.join(rootDir, 'locales');

// 1. Read translation keys to map tools with their localized titles & descriptions
async function loadTranslations() {
  const zhTwYaml = await fs.readFile(path.join(localesDir, 'zh-TW.yml'), 'utf8');
  return YAML.parse(zhTwYaml);
}

// 2. Scan and load all tool configurations dynamically
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

// 3. Inject JSON-LD structured data into the HTML head
function injectJsonLd(html, jsonLd) {
  const jsonLdScript = `\n    <script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n    </script>\n`;
  return html.replace('</head>', `${jsonLdScript}</head>`);
}

// 4. Main prerendering sequence
async function main() {
  const translations = await loadTranslations();
  const tools = await getTools(translations);

  console.log(`Found ${tools.length} tools to prerender.`);

  // Load the clean built index.html from dist
  const templatePath = path.join(distDir, 'index.html');
  if (!existsSync(templatePath)) {
    console.error('Built index.html template not found in dist. Make sure to run vite build first.');
    process.exit(1);
  }
  const htmlTemplate = await fs.readFile(templatePath, 'utf8');

  // Pre-generate tools list HTML for crawlers
  const globalToolsListHtml = tools
    .map(t => `<li><a href="${t.path}">${t.title}</a> - ${t.description}</li>`)
    .join('\n          ');

  const saveHtml = async (routePath, htmlContent) => {
    const relativeDir = routePath === '/' ? '' : routePath;
    const targetDir = path.join(distDir, relativeDir);
    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(path.join(targetDir, 'index.html'), htmlContent, 'utf8');
  };

  const processPage = (urlPath, title, description, jsonLd) => {
    let html = htmlTemplate;

    // A. Update title
    if (urlPath !== '/') {
      html = html.replace('<title>DAVID888 TOOL 工具箱</title>', `<title>${title} - DAVID888 TOOL 工具箱</title>`);
      html = html.replace('<meta itemprop="name" content="DAVID888 TOOL 工具箱" />', `<meta itemprop="name" content="${title} - DAVID888 TOOL 工具箱" />`);
      html = html.replace('<meta property="og:title" content="DAVID888 TOOL 工具箱" />', `<meta property="og:title" content="${title} - DAVID888 TOOL 工具箱" />`);
      html = html.replace('<meta name="twitter:title" content="DAVID888 TOOL 工具箱" />', `<meta name="twitter:title" content="${title} - DAVID888 TOOL 工具箱" />`);
      html = html.replace('<meta name="twitter:image:alt" content="DAVID888 TOOL 工具箱" />', `<meta name="twitter:image:alt" content="${title} - DAVID888 TOOL 工具箱" />`);
    }

    // B. Update description (replaceAll occurrences of default description)
    const defaultDesc = 'DAVID888 TOOL 工具箱 - 整合文字處理、影音剪輯、格式轉換、生活密碼與日常辦公的綜合工具箱，無廣告、安全隱私、完全在瀏覽器端運行。';
    html = html.replaceAll(defaultDesc, description);

    // C. Update canonical & og:url URLs
    const canonicalUrl = urlPath === '/' ? 'https://tool.david888.com' : `https://tool.david888.com${urlPath}`;
    html = html.replace('href="https://tool.david888.com"', `href="${canonicalUrl}"`);
    html = html.replace('content="https://tool.david888.com/"', `content="${canonicalUrl}/"`);

    // D. Inject JSON-LD
    if (jsonLd) {
      html = injectJsonLd(html, jsonLd);
    }

    // E. Inject crawler-friendly static list inside #app
    const fallbackHtml = `
    <div id="app">
      <div style="padding: 20px; max-width: 800px; margin: 0 auto; font-family: sans-serif; line-height: 1.6;">
        <h1>${title === 'DAVID888 TOOL 工具箱' ? title : title + ' - DAVID888 TOOL 工具箱'}</h1>
        <p>${description}</p>
        <hr style="border: 0; border-top: 1px solid rgba(255,255,255,0.15); margin: 20px 0;" />
        <h3>DAVID888 TOOL - 熱門綜合工具列表</h3>
        <ul>
          ${globalToolsListHtml}
        </ul>
      </div>
    </div>
    `;
    html = html.replace('<div id="app"></div>', fallbackHtml);

    return html;
  };

  // -- 1. Process Homepage (/) --
  console.log('Prerendering Homepage...');
  const homeJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://tool.david888.com/#website",
        "url": "https://tool.david888.com/",
        "name": "DAVID888 TOOL 工具箱",
        "description": "整合文字處理、影音剪輯、格式轉換、生活密碼與日常辦公的綜合工具箱，無廣告、安全隱私、完全在瀏覽器端運行。",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://tool.david888.com/?search={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "ItemList",
        "name": "DAVID888 TOOL - 工具列表",
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
  const homeHtml = processPage('/', 'DAVID888 TOOL 工具箱', '整合文字處理、影音剪輯、格式轉換、生活密碼與日常辦公的綜合工具箱，無廣告、安全隱私、完全在瀏覽器端運行。', homeJsonLd);
  await saveHtml('/', homeHtml);

  // -- 2. Process About Page (/about) --
  console.log('Prerendering About page...');
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": "關於 DAVID888 TOOL 工具箱",
    "description": "DAVID888 TOOL 工具箱（Tool.David888.com）是一款整合文字處理、影音剪輯、格式轉換、生活密碼與日常辦公的綜合工具箱。預設繁體中文，無廣告，加載迅速，完全在瀏覽器端運行，安全隱私保護。",
    "url": "https://tool.david888.com/about"
  };
  const aboutHtml = processPage('/about', '關於我們', 'DAVID888 TOOL 工具箱（Tool.David888.com）是一款整合文字處理、影音剪輯、格式轉換、生活密碼與日常辦公的綜合工具箱。預設繁體中文，無廣告，加載迅速，完全在瀏覽器端運行，安全隱私保護。', aboutJsonLd);
  await saveHtml('/about', aboutHtml);

  // -- 3. Process each Tool Page --
  for (const tool of tools) {
    console.log(`Prerendering tool: ${tool.title} (${tool.path})...`);
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
    const toolHtml = processPage(tool.path, tool.title, tool.description, toolJsonLd);
    await saveHtml(tool.path, toolHtml);
  }

  console.log('Prerendering completed successfully using pure Node HTML rewriting!');
}

main().catch(console.error);
