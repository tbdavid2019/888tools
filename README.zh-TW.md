# 888tools - 開發者與 IT 專業人員的線上工具箱

<p align="center">
  <a href="https://tool.david888.com">
    <img src="https://tool.david888.com/logo.png" alt="888tools Logo" width="96" height="96" onerror="this.style.display='none'">
  </a>
</p>

<p align="center">
  <strong>100% 純前端、資料零外傳、離線可執行的全方位現代化開發者工具庫。</strong>
</p>

<p align="center">
  <a href="https://tool.david888.com"><img src="https://img.shields.io/badge/線上站點-tool.david888.com-FFB010?style=flat-square" alt="Live Site"></a>
  <a href="https://github.com/tbdavid2019/888tools/actions"><img src="https://img.shields.io/github/actions/workflow/status/tbdavid2019/888tools/github-pages.yml?style=flat-square&label=Deploy" alt="Deploy Status"></a>
  <a href="https://github.com/tbdavid2019/888tools/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-GPLv3-blue?style=flat-square" alt="License"></a>
  <a href="./docs/webmcp.md"><img src="https://img.shields.io/badge/W3C-WebMCP%20Ready-6366f1?style=flat-square" alt="WebMCP"></a>
  <a href="./README.md"><img src="https://img.shields.io/badge/Language-English-17324D?style=flat-square" alt="English Version"></a>
</p>

---

> 🌐 **語言選擇**：**繁體中文** | [English Version](./README.md)  
> 🔗 **正式站點**：**[https://tool.david888.com](https://tool.david888.com)**  
> 🤖 **AI 檢索導航**：[llms.txt](https://tool.david888.com/llms.txt) | [SKILL.md](https://tool.david888.com/SKILL.md)

---

## 為什麼選擇 888tools？

日常開發經常需要處理 Base64 編解碼、UUID 生成、JWT 檢驗、Regex 比對、色彩對比檢查或個資遮罩。大多數線上工具需要將您的文字與機密檔案上傳至第三方伺服器，潛藏嚴重資安與隱私風險。

**888tools** 提供超越傳統工具網站的全新體驗：

- 🛡️ **100% 瀏覽器本機沙箱運算**：文字處理、圖片壓縮、PDF 去識別化、音訊轉寫皆在您的瀏覽器記憶體中完成，檔案與金鑰**絕不離線、絕不外傳伺服器**。
- 🎨 **頂級視覺工藝 (2md Design System)**：全面導入 `2md.aiurl.tw` 經典暖奶油與深青海軍藍調色盤，嚴格符合 **WCAG 2.1 AA/AAA 最高無障礙對比標準**（內文對比高達 14.45:1），杜絕刺眼白底或低對比灰字。
- 🤖 **原生支援 W3C WebMCP 標準**：領先業界整合 W3C WebMCP 規範，AI Agent 可透過 `document.modelContext` 原生呼叫 39+ 組前端工具，無需傳統 DOM 爬取或視訊辨識。
- ⚡ **高效離線與智慧電視 (Smart TV) 相容**：具備 Playwright 靜態預渲染 (SSG)、JSON-LD 豐富摘要，並實作 ES2020 相容層與偽全螢幕回退，相容舊型電視與嵌入式螢幕。

---

## 核心分類與精選工具 (115+ 款)

### 🎨 設計與色彩 (Design & Colors)
- **[WCAG 色彩對比檢測器 (`/color-contrast-checker`)](./src/tools/color-contrast-checker/README.md)**：精確檢驗前背景色對比度（1.00:1 ~ 21.00:1）與 4 位小數相對亮度，支援 AA/AAA 大字與一般字及 SC 1.4.11 非文字 UI 元件檢驗、HSL/RGB 雙向滑桿、智慧無障礙修正建議（Auto-Fix）與可編輯排版預覽。
- **色彩轉換器 (`/color-converter`)**：HEX、RGB、CMYK、HSL、LCH 雙向互轉，內建 Delta E 2000 Pantone 色票匹配與螢幕吸管取色。
- **Pantone 趨勢色票庫 (`/find-color`)**：收錄 2000–2026 歷年 Pantone 年度代表色及精選設計趨勢調色盤，支援 Light/Dark 模式與高對比色碼複製。

### 🔒 隱私安全與去識別化 (Privacy & Security)
- **文件個資去識別化 (`/data-deidentification`)**：純前端處理 PDF/Word/Excel/TXT 文件，自動偵測台灣與國際個資（身分證、統編、手機、地址、信用卡、IBAN 等），支援掃描檔離線 OCR 辨識、遮罩預覽與 CSV 雙向還原對照表。
- **密碼與金鑰工具**：密碼強度分析器 (`/password-strength-analyser`)、BIP39 助記詞產生器 (`/bip39-generator`)、Token 產生器 (`/token-generator`)、Bcrypt 雜湊驗證 (`/bcrypt`)、RSA 公私鑰對生成 (`/rsa-key-pair-generator`)。
- **文字加密與簽章**：AES/DES 加解密 (`/encryption`)、HMAC 簽章 (`/hmac-generator`)、Hash 雜湊計算 (`/hash-text`)。

### 📡 網路與 P2P 通訊 (Network & P2P)
- **P2P 網頁即時密聊 (`/p2p-chat`)**：基於 WebRTC (PeerJS) 與 Web Crypto API (AES-GCM-256) 的端到端加密通訊，信令不存訊息，支援固定 Room ID、多人 Mesh 直連、桌面通知與限時撤回。[架構說明 ➔](./docs/p2p-chat-architecture.md)
- **P2P 點對點傳檔 (`/p2p-file-transfer`)**：瀏覽器直連大檔案傳輸，無中繼伺服器頻寬與大小限制。
- **網路位址工具**：IPv4 子網路計算器 (`/ipv4-subnet-calculator`)、IPv4/IPv6 位址轉換、MAC 位址查詢與產生器。

### 🖼️ 多媒體處理與 OCR (Multimedia & OCR)
- **離線 OCR 文字辨識 (`/ocr-scanner`)**：內建 Tesseract.js 繁體中文與英文離線模型。
- **AI 圖片去背 (`/remove-background`)**：基於 WebAssembly 離線移除照片背景。
- **圖片與影片工具**：圖片壓縮 (`/image-compression`)、HEIC/PNG/JPG 轉檔 (`/image-converter`)、SVG 工具箱 (`/svg-tools`)、攝影機與麥克風測試 (`/mic-camera-tester`)。
- **語音與字幕**：即時會議字幕 (`/meeting-captions`)、AI 歌詞播放器 (`/lyric-player`)、音訊剪輯器 (`/audio-editor`)。

### 🔄 格式轉換與資料解析 (Converters & Data)
- **結構化資料互轉**：JSON ↔ YAML ↔ TOML ↔ XML ↔ CSV 多向轉換。
- **EPUB 電子書**：TXT 轉 EPUB 小說產生器 (`/txt-to-epub`)、EPUB 編輯器 (`/epub-editor`)，支援直排縱書、字型子集化嵌入與 OpenCC 簡轉繁。
- **開發者轉換工具**：Docker Run 轉 Docker Compose、Base64 字串/檔案轉換、JWT 解析器、Cron 表達式產生器、JSON Diff 比對。

---

## 延伸技術文件

| 文件名稱 | 內容說明 |
| :--- | :--- |
| 📖 **[W3C WebMCP 規範說明](./docs/webmcp.md)** | 39+ 組 WebMCP 工具定義、呼叫參數與 AI Agent 整合方式 |
| 🏗️ **[系統架構與技術設計](./docs/architecture.md)** | Playwright 靜態預渲染 (SSG)、JSON-LD、2md 主題系統與電視相容層 |
| 💬 **[P2P 密聊通訊協定架構](./docs/p2p-chat-architecture.md)** | WebRTC DataChannel 拓撲、Durable Object 信令與端到端加密協議 |
| 🎨 **[WCAG 色彩對比檢測器專文](./src/tools/color-contrast-checker/README.md)** | 相對亮度公式、WCAG 2.1 邊界門檻與 Auto-Fix 最佳化演算法 |
| 📝 **[更新歷程紀錄](./CHANGELOG.md)** | 專案歷次版本詳細更新紀錄與修復清單 |

---

## 本地開發與快速開始

### 環境需求
- **Node.js**：`>= 20.0.0`（建議使用 `.nvmrc` 中的 `20.12.0` 或更高版本）
- **套件管理器**：`pnpm >= 9.0.0`

### 1. 安裝依賴與啟動開發伺服器
```bash
git clone https://github.com/tbdavid2019/888tools.git
cd 888tools
pnpm install
pnpm dev
```
啟動完成後，瀏覽器開啟 `http://localhost:5173` 即可進入開發環境。

### 2. 生產環境編譯與預渲染 (SSG)
```bash
# 包含探索檔生成、vue-tsc 型別校驗、Vite 打包與 Playwright 預渲染
pnpm build

# 本地預覽生產建置
pnpm preview
```

### 3. 執行測試與代碼檢查
```bash
# 執行 Vitest 單元測試
pnpm test

# 執行 TypeScript 型別檢查
pnpm typecheck

# 執行 ESLint 靜態代碼檢查
pnpm lint
```

### 4. 快速建立新工具
專案提供標準化腳手架腳本：
```bash
pnpm run script:create:tool my-new-tool
```
腳本將自動在 `src/tools/my-new-tool/` 生成 Vue 元件、定義檔與測試檔案，並在 `src/tools/index.ts` 註冊匯入。

---

## Docker 容器化部署

888tools 內建輕量化 Nginx 容器配置：

```bash
# 建置 Docker 映像檔
docker build -t 888tools .

# 運行容器 (80 連接埠)
docker run -d -p 80:80 --name 888tools 888tools
```

---

## 開源致謝與授權條款

- **原作者致謝**：本專案最初分支改編自 [CorentinTh/it-tools](https://github.com/CorentinTh/it-tools)（作者 Corentin Thomasset），感謝其優雅的原創前端概念。
- **去識別化演算法**：特別感謝 [Dean Lin](https://github.com/dean9703111) 開源之 [data-deidentification](https://github.com/dean9703111/data-deidentification)（MIT License），提供強大的本機去識別化核心。
- **授權條款**：本專案採用 **[GNU General Public License v3.0 (GPLv3)](./LICENSE)** 授權。
