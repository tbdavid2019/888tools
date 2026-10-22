# 888tools - The Offline-First Online Toolkit for Developers & IT Pros

<p align="center">
  <a href="https://tool.david888.com">
    <img src="https://tool.david888.com/logo.png" alt="888tools Logo" width="96" height="96" onerror="this.style.display='none'">
  </a>
</p>

<p align="center">
  <strong>100% Client-Side, Zero Data Leakage, Offline-Capable Developer Utilities with Impeccable Craft.</strong>
</p>

<p align="center">
  <a href="https://tool.david888.com"><img src="https://img.shields.io/badge/Live%20Site-tool.david888.com-FFB010?style=flat-square" alt="Live Site"></a>
  <a href="https://github.com/tbdavid2019/888tools/actions"><img src="https://img.shields.io/github/actions/workflow/status/tbdavid2019/888tools/github-pages.yml?style=flat-square&label=Deploy" alt="Deploy Status"></a>
  <a href="https://github.com/tbdavid2019/888tools/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue?style=flat-square" alt="License"></a>
  <a href="./docs/webmcp.md"><img src="https://img.shields.io/badge/W3C-WebMCP%20Ready-6366f1?style=flat-square" alt="WebMCP"></a>
  <a href="./README.zh-TW.md"><img src="https://img.shields.io/badge/Language-%E7%B9%81%E9%AB%94%E4%B8%AD%E6%96%87-17324D?style=flat-square" alt="繁體中文"></a>
</p>

---

> 🌐 **Language**: **English** | [繁體中文 (Traditional Chinese)](./README.zh-TW.md)  
> 🔗 **Production Deployment**: **[https://tool.david888.com](https://tool.david888.com)**  
> 🤖 **Machine Discovery**: [llms.txt](https://tool.david888.com/llms.txt) | [SKILL.md](https://tool.david888.com/SKILL.md)

---

## Overview

Modern software engineering and IT operations frequently require quick utilities: Base64 encoders, UUID generators, JWT inspectors, regex debuggers, color contrast analyzers, and sensitive data masking. Unfortunately, the vast majority of web tools upload user payloads to remote servers, exposing private tokens, database schemas, and personal data to interception or leaks.

**888tools** is engineered from the ground up as a **100% client-side privacy bastion**:

- 🛡️ **Zero Server-Side Ingestion**: Text processing, file conversions, cryptographic hashing, and document masking execute exclusively inside your browser's WebAssembly and JavaScript sandbox. Your data never touches a server.
- 🎨 **2md Design Language & WCAG AAA Contrast**: Built according to strict visual hierarchy rules with warm cream surfaces (`#FFF9E8`) and deep navy ink (`#17324D`), delivering an uncompromising **14.45:1 contrast ratio**. Zero harsh white glares, zero illegible gray-on-gray text.
- 🤖 **Native W3C WebMCP Standard for AI Agents**: Built-in support for the W3C Web Model Context Protocol standard (`document.modelContext`). AI Agents (such as Chrome 146+ agents and Cloudflare BrowserRun) can call 39+ utility functions with structured JSON parameters—no DOM scraping or visual OCR needed.
- ⚡ **Automated SSG Prerendering & TV Compatibility**: Automated Playwright Chromium pipeline prerenders full DOM snapshots for all 115+ tool routes with rich JSON-LD Schema.org metadata, paired with ES2020 polyfills and pseudo-fullscreen modes for older browsers and Smart TV screens.

---

## Featured Tools by Category (115+ Utilities)

### 🎨 Design & Colors
- **[WCAG Color Contrast Checker (`/color-contrast-checker`)](./src/tools/color-contrast-checker/README.md)**: Real-time contrast ratio (1.00:1–21.00:1) and 4-decimal relative luminance calculator conforming to WCAG 2.1 SC 1.4.3 / 1.4.6 / 1.4.11. Features AA/AAA ratings, UI component checks, HSL/RGB sliders, smart auto-fix suggestions, and editable live typography mockups.
- **Color Converter & Pantone Matcher (`/color-converter`)**: Bidirectional conversion between HEX, RGB, CMYK, HSL, and LCH with client-side Delta E 2000 Pantone color ticket matching and screen eyedropper.
- **Pantone & Trend Palette Library (`/find-color`)**: Curated Pantone Color of the Year picks (2000–2026) and design trend palettes with dark/light mode previews.

### 🔒 Privacy, Cryptography & De-identification
- **Data De-identification & Reversible Restoration (`/data-deidentification`)**: 100% browser-side document redaction for PDF, Word (.docx), Excel (.xlsx), TXT, and Markdown. Auto-detects Taiwanese and international PII (National ID, Tax ID, phone, address, credit cards, IBAN), with offline OCR and bidirectional CSV mapping table restoration.
- **Credential & Entropy Generators**: Password Strength Analyzer (`/password-strength-analyser`), BIP39 Mnemonic Generator (`/bip39-generator`), Token Generator (`/token-generator`), Bcrypt Hashing & Verification (`/bcrypt`), and RSA Keypair Generator (`/rsa-key-pair-generator`).
- **Encryption & Hashing**: AES/DES Cryptography (`/encryption`), HMAC Generator (`/hmac-generator`), and Multiformat Hash Digester (`/hash-text`).

### 📡 Network & Decentralized P2P
- **P2P Encrypted Web Chat (`/p2p-chat`)**: Browser-to-browser encrypted communication using WebRTC DataChannels and AES-GCM-256. Zero chat message logging on signaling servers, featuring persistent room IDs, multi-peer mesh connections, push notifications, and ephemeral message retraction. *(See [docs/p2p-chat-architecture.md](./docs/p2p-chat-architecture.md))*
- **P2P Direct File Transfer (`/p2p-file-transfer`)**: High-speed, unthrottled point-to-point file transfer directly between devices.
- **Subnet & IP Utilities**: IPv4 Subnet Calculator (`/ipv4-subnet-calculator`), IPv4 Range Expander, IPv6 ULA Generator, and MAC Address Vendor Lookup.

### 🖼️ Multimedia, OCR & Speech
- **Client-Side OCR Scanner (`/ocr-scanner`)**: Offline optical character recognition powered by Tesseract.js (Traditional Chinese `chi_tra` and English models).
- **AI Background Removal (`/remove-background`)**: Machine-learning driven background cutout running purely on WebAssembly.
- **Media Transcoding**: Client-side Image Compression (`/image-compression`), HEIC Converter (`/image-converter`), Video Transcoder (`/video-converter`), and SVG Editor (`/svg-tools`).
- **Speech & Subtitles**: In-Browser Meeting Captions (`/meeting-captions`) and AI Lyric Player (`/lyric-player`) powered by client-side Whisper models.

### 🔄 Converters & Structured Data
- **Structured Data Translation**: Real-time bi-directional conversion between JSON ↔ YAML ↔ TOML ↔ XML ↔ CSV.
- **EPUB Publishing**: TXT to EPUB Novel Generator (`/txt-to-epub`) and EPUB Editor (`/epub-editor`) with vertical typesetting (縦書き), font subsetting, and OpenCC Simplified-to-Traditional Chinese translation.
- **Developer Workflows**: Docker Run to Docker Compose Converter, Base64 String/File Converter, JWT Token Inspector, and Crontab Generator.

---

## Technical Documentation Directory

| Document | Description |
| :--- | :--- |
| 📖 **[W3C WebMCP Standard](./docs/webmcp.md)** | Specification, parameters, and client integration guide for 39+ in-browser AI tools |
| 🏗️ **[Architecture & Design System](./docs/architecture.md)** | Playwright SSG prerender pipeline, SEO discovery, 2md WCAG AAA theme, and TV compatibility |
| 💬 **[P2P Chat Architecture](./docs/p2p-chat-architecture.md)** | WebRTC mesh topology, Cloudflare Durable Object signaling, and AES-GCM-256 protocols |
| 🎨 **[Color Contrast Checker Guide](./src/tools/color-contrast-checker/README.md)** | Relative luminance math, WCAG 2.1 threshold boundaries, and accessible auto-fix algorithms |
| 📝 **[Project Changelog](./CHANGELOG.md)** | Comprehensive historical release log and defect fixes across all versions |

---

## Quick Start & Local Development

### Prerequisites
- **Node.js**: `>= 20.0.0` (Recommended: `20.12.0` via `.nvmrc`)
- **Package Manager**: `pnpm >= 9.0.0`

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/tbdavid2019/888tools.git
cd 888tools
pnpm install
```

### 2. Start Local Development Server
```bash
pnpm dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser. Hot Module Replacement (HMR) is enabled.

### 3. Production Build with Playwright SSG Prerendering
```bash
# Runs discovery generation, vue-tsc check, Vite bundling, and Playwright Chromium prerendering
pnpm build

# Preview production build locally
pnpm preview
```

### 4. Code Quality & Automated Tests
```bash
# Run unit tests via Vitest
pnpm test

# Run TypeScript typechecks
pnpm typecheck

# Run ESLint validation
pnpm lint
```

### 5. Scaffold a New Tool
Create a new tool boilerplate in seconds:
```bash
pnpm run script:create:tool my-new-tool
```
This automatically scaffolds the Vue component, index file, and test suite in `src/tools/my-new-tool/` and registers the module in `src/tools/index.ts`.

---

## Docker Container Deployment

A lightweight, production-tuned Nginx container configuration is included:

```bash
# Build Docker image
docker build -t 888tools .

# Run container on port 80
docker run -d -p 80:80 --name 888tools 888tools
```

---

## Credits & License

- **Original Project**: Originally based on [CorentinTh/it-tools](https://github.com/CorentinTh/it-tools) by [Corentin Thomasset](https://corentin.tech). We are deeply grateful for his creative foundation.
- **Data De-identification Engine**: Heartfelt thanks to [Dean Lin](https://github.com/dean9703111) for open-sourcing [data-deidentification](https://github.com/dean9703111/data-deidentification) (MIT License), providing the robust client-side redaction and mapping algorithms.
- **License**: Released under the **[GNU General Public License v3.0 (GNU GPLv3)](./LICENSE)**.
