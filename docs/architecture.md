# Architecture & Technical Design

[![Vite](https://img.shields.io/badge/Vite-5.x-646CFF)](#)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-42b883)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6)](#)
[![Playwright SSG](https://img.shields.io/badge/SSG-Playwright%20Prerender-2e7d32)](#)
[![WCAG 2.1 AA/AAA](https://img.shields.io/badge/Design-WCAG%20AA%2FAAA-FFB010)](#)

> Main Repository: **[https://github.com/tbdavid2019/888tools](https://github.com/tbdavid2019/888tools)**  
> Production URL: **[https://tool.david888.com](https://tool.david888.com)**

---

## High-Level System Architecture

888tools is architected as a **100% Client-Side Single Page Application (SPA)** with an automated **Build-Time Static Site Generation (SSG) Prerendering Pipeline**.

```text
Source Code (Vue 3 / TypeScript / UnoCSS)
                    │
                    ▼
     Vite Production Build (`dist/`)
                    │
                    ▼
Playwright Headless Chromium Prerender Engine
  ├── Generates static index.html for all 115+ tool routes
  ├── Injects page-specific JSON-LD Schema.org metadata
  └── Emits machine discovery files (/llms.txt, sitemap.xml, robots.txt)
                    │
                    ▼
Static Distribution (GitHub Pages / Nginx / Cloudflare Pages)
                    │
                    ▼
Edge Delivery (Zero backend runtime required, 100% private in-browser compute)
```

---

## 1. Automated Prerendering & SEO Discovery

Because developer utility sites are heavily reliant on organic search discovery and LLM retrieval, 888tools solves the traditional SPA indexing penalty through build-time automation:

1. **Playwright Chromium Static Prerendering ([`scripts/prerender.mjs`](../scripts/prerender.mjs))**:
   During `pnpm build`, a local headless Chromium instance boots up and visits all 115+ routes, executing scripts in the `zh-TW` locale and Taipei timezone to serialize DOM snapshots into dedicated `index.html` files. Search engine crawlers receive complete, fast-rendering HTML without executing client JavaScript.
2. **Structured Data Injection (JSON-LD)**:
   - **Homepage**: Injects `WebSite` and `ItemList` schema.
   - **Tool Pages**: Injects `SoftwareApplication` schema with application category, operating system, and feature descriptors.
   - **About Page**: Injects `AboutPage` schema.
3. **Machine-Readable Discovery Files ([`scripts/generate-discovery.mjs`](../scripts/generate-discovery.mjs))**:
   - **`/llms.txt`**: Standardized markdown documentation optimized for AI agents and LLM crawlers per [llmstxt.org](https://llmstxt.org/).
   - **`/sitemap.xml`**: Automatically computed URLs for all static pages and tools with canonical URLs.
   - **`/robots.txt`**: Automated indexing policies and sitemap linkages.

---

## 2. Design System & WCAG AAA Contrast Engine

888tools incorporates the **2md Design Language (`2md.aiurl.tw`)** across light and dark themes with zero compromised contrast:

- **Light Mode Palette (`#FFF9E8` / `#FFF0CC`)**:
  - Warm cream surface with rich ink text (`#2B251A`), delivering an exceptional **14.45:1 contrast ratio**.
  - Deep blue buttons (`#17324D`) at **12.48:1 contrast**, accented by saffron (`#FFB010`) and clay brick (`#A9471D`).
- **Dark Mode Palette (`#101B27` / `#172636`)**:
  - Deep midnight navy surface paired with warm cream text (`#F5EEDC`) at **13.50:1 contrast**.
  - High-visibility saffron primary buttons (`#FFB010`) at **8.39:1 contrast**.
- **Impeccable Craft Floor**:
  - Avoids nested cards, kicker labels, gradient text, and zero-blur hard offset shadows.
  - Tabular numeric alignment (`tabular-nums`) across all data-dense dashboards.
  - Strict conformance with WCAG 2.1 SC 1.4.3 (Contrast Minimum), SC 1.4.6 (Contrast Enhanced), and SC 1.4.11 (Non-text Contrast).

---

## 3. Smart TV & Legacy Browser Compatibility

To support non-standard embedded environments (such as Smart TV WebViews, hospital bedside terminals, and older Safari/WebKit engines), 888tools includes explicit runtime safeguards:

1. **Build Target Downgrade**:
   `vite.config.ts` targets `['es2020', 'chrome80', 'safari14']` to ensure BigInt literals and modern syntax remain executable on older V8/WebKit runtimes.
2. **Global Polyfill Harness**:
   `index.html` embeds defensive polyfills for `globalThis`, `Object.hasOwn`, `String.prototype.replaceAll`, `Array.prototype.at`, `Promise.allSettled`, and crash-resilient `ResizeObserver` fallbacks.
3. **Async WebMCP Tool Registration**:
   Heavier WebMCP tool modules are deferred until after initial paint, ensuring television and low-power IoT CPU cores experience zero main-thread freezing.
4. **Pseudo-Fullscreen Fallback**:
   For TV and tablet browsers where `Element.requestFullscreen()` is blocked by security policies, 888tools provides an in-viewport overlay fallback with remote-control cursor and `Escape` key handling.

---

## 4. P2P Data Architecture (PeerJS + WebRTC)

For tools involving multi-user communication (`p2p-chat` and `p2p-file-transfer`), 888tools utilizes a decentralized architecture:

- **Zero-Storage Signaling**: A Cloudflare Worker with Durable Objects acts solely as an ephemeral presence coordinator.
- **Direct P2P Data Channels**: Files, text, and voice audio travel directly between peer browsers over encrypted WebRTC DataChannels.
- **End-to-End Encryption (E2EE)**: Messages and files are encrypted client-side using `AES-GCM-256` via the browser's native `window.crypto.subtle`.

*For detailed signaling protocols and mesh routing, see [docs/p2p-chat-architecture.md](./p2p-chat-architecture.md).*
