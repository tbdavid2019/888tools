<p align="center">
一套為開發者與 IT 工作者準備的線上工具集合。<a href="https://tool.david888.com">立即體驗！</a>
</p>

**致謝**：本專案基於原作者 [CorentinTh/it-tools](https://github.com/CorentinTh/it-tools) 的開源專案延伸與修改，感謝原作者的貢獻。

## 首頁 / 側欄 UX

目前首頁左側導覽已調整為兩態固定模式：

- 展開模式：顯示品牌區、分類名稱、完整工具名稱，以及顯示設定。
- 窄欄 icon 模式：保留工具 icon 導覽與最小設定入口，不再把側欄完全隱藏。
- 手機模式：側欄預設收合，改為 drawer 式展開；搜尋與常用操作移到上方工具列，避免佔滿主內容區。

另外也同步做了幾項可用性調整：

- 左上品牌區縮小，避免佔據過多垂直空間。
- 首頁工具卡標題與說明字級放大，提升快速掃讀的效率。
- 工具頁 breadcrumb 移到內容上方，並補上首頁 icon 與較大的字級。
- GitHub 倉庫入口全面統一為 `https://github.com/tbdavid2019/888tools`。

### 操作方式

- 桌面版：可在完整側欄與窄欄 icon 模式之間切換，保留固定導覽，不會完全隱藏。
- 手機版：左上選單按鈕可展開側欄；點擊遮罩會收回 drawer。
- 手機版搜尋：改放在上方工具列，展開側欄後仍可正常操作分類樹狀選單。

## Agent Discovery / SEO

本站目前已做了一系列搜尋引擎與 AI Agent 的優化，並補上了探索用的靜態發現檔：

- **靜態預渲染 (SSG / Prerendering)**：為解決單頁應用 (SPA / CSR) 對搜尋引擎爬蟲抓取不友善、SEO 分數低的問題，打包階段會使用 Playwright 模擬 Chromium 瀏覽器（繁體中文語系/台北時區）預渲染全站所有 114 個工具路由頁面，並生成獨立的靜態 `index.html`。
- **結構化資料 (JSON-LD)**：預渲染網頁時會自動在 `<head>` 中注入 structured data。首頁會注入 `WebSite` 與 `ItemList`；各工具頁會注入專屬的 `SoftwareApplication` 描述；About 頁會注入 `AboutPage` 描述，用以支援豐富網頁摘要 (Rich Snippets)。
- `/sitemap.xml`：由 build 階段自動根據首頁、About 與工具 routes 生成，不需手動維護 URL 清單。
- `/robots.txt`：由 build 階段自動生成，包含 `Sitemap:` 與 `Content-Signal:`。
- `/.well-known/api-catalog`：以 `application/linkset+json` 輸出 API catalog。
- 首頁回應 header：透過 Vercel 設定輸出 `Link: </.well-known/api-catalog>; rel="api-catalog"`。

這些檔案與預渲染流程的實作在 [site.config.js](./site.config.js)、[scripts/generate-discovery.mjs](./scripts/generate-discovery.mjs) 與 [scripts/prerender.mjs](./scripts/prerender.mjs)。

注意：

- 站內大多數頁面是互動式前端工具，不是 RFC 9727 定義的 HTTP API，因此不應直接塞進 API catalog。
- 目前 `api-catalog` 預設會輸出空的 `linkset`。等未來真的有可程式呼叫的 API、OpenAPI spec、文件頁與 health endpoint，再到 `site.config.js` 補 entry 即可。

**本版本更新**

| #   | 更新內容                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 預設介面語言改為繁體中文                                                                                                                                                                      |
| 2   | 新增「同文堂繁簡轉換器」工具，可離線完成簡體/繁體互轉（https://tool.david888.com/tongwen-converter ）                                                                                         |
| 3   | QR Code 生成器升級：支援 qr-code-styling，多種樣式（Square/Dots/Rounded/Classy 等）、角落樣式、尺寸、Logo 上傳與邊距，並保留一鍵重置為基礎樣式（https://tool.david888.com/qrcode-generator ） |
| 4   | QR 解析工具：新增支援貼上剪貼簿圖片直接解析（https://tool.david888.com/qr-checker ）                                                                                                          |
| 5   | 新增「倒數計時器」工具（Measurement 分類），可設定時/分/秒並快速加時間、複製剩餘時間（https://tool.david888.com/countdown-timer ）                                                            |
| 6   | 新增「特殊字體產生器」工具（Text 分類），一鍵輸出多種 Unicode 特殊字型並可快速複製（https://tool.david888.com/fancy-text ）                                                                   |
| 7   | 新增「世界時間」工具（Measurement 分類），快速查看多城市時間並切換 12/24 小時制（https://tool.david888.com/world-clock ）                                                                     |
| 8   | 新增「生日/年齡計算器」：農曆、生肖、星座、實歲/虛歲、下次生日倒數一次看（https://tool.david888.com/birthday-calculator ）                                                                    |
| 9   | 新增「狗年齡計算器」：依體型換算狗狗對應人類年齡（https://tool.david888.com/dog-age-calculator ）                                                                                             |
| 10  | 新增「貓年齡計算器」：換算貓咪對應人類年齡（https://tool.david888.com/cat-age-calculator ）                                                                                                   |
| 11  | 線上時鐘升級：修復翻頁/模擬時鐘排版、新增「網路校時」功能（HTTP Time Sync）、全螢幕模式自動隱藏控制項（https://tool.david888.com/online-clock ）                                              |
| 12  | 介面調整：將 Measurement（測量工具）分類移至選單最上方，方便使用                                                                                                                              |
| 13  | 新增「AI 圖片去背」工具（Images and videos 分類），使用 AI 自動移除圖片背景（https://tool.david888.com/remove-background ）                                                                   |
| 14  | 新增「圖片壓縮」工具（Images and videos 分類），支援 PNG/JPG/WebP 壓縮與前後對比（https://tool.david888.com/image-compression ）                                                              |
| 15  | 新增「PDF 工具箱」（PDF 分類），包含合併、分割、旋轉、壓縮 PDF 功能（https://tool.david888.com/pdf-tools ）                                                                                   |
| 16  | 新增「條碼掃描器」（Images and videos 分類），支援相機掃描與圖片上傳解析 1D/2D 條碼（https://tool.david888.com/barcode-scanner ）                                                             |
| 17  | 新增「圖片轉檔」工具（Images and videos 分類），支援 HEIC 格式及常見圖片格式轉換（https://tool.david888.com/image-converter ）                                                                |
| 18  | 新增「影片轉檔與剪輯」工具（Images and videos 分類），支援影片剪輯與格式轉換（https://tool.david888.com/video-converter ）                                                                    |
| 19  | 新增「音訊編輯器」工具（Images and videos 分類），支援音訊剪輯、特效與濾鏡（https://tool.david888.com/audio-editor ）                                                                         |
| 20  | 新增「SVG 工具箱」（Images and videos 分類），支援 SVG 程式碼即時預覽與編輯（https://tool.david888.com/svg-tools ）                                                                           |
| 21  | 新增「圖片色彩校正」工具（Images and videos 分類），支援亮度、對比、飽和度調整（https://tool.david888.com/color-correction ）                                                                 |
| 22  | 新增「麥克風與攝影機測試」（Images and videos 分類），提供裝置選擇與音量視覺化（https://tool.david888.com/mic-camera-tester ）                                                                |
| 23  | 新增「CSV & Excel 檢視器」（Data 分類），支援預覽並匯出為 CSV 檔案（https://tool.david888.com/csv-excel-viewer ）                                                                             |
| 24  | 新增「TXT 轉 EPUB 小說產生器」工具（書籍 分類），支援自動章節正則偵測、直排/橫排翻頁排版、自訂封面，以及內置思源等多款字型的子集化精簡與完整（滿血版）嵌入（https://tool.david888.com/txt-to-epub ） |
| 25  | 新增「EPUB 編輯器 / 轉換器」工具（書籍 分類），支援上傳 EPUB 解析，提供「繁體・詞彙（twp）」與「繁體・純字（tw）」雙 OpenCC 模式、標點轉換、直橫排樣式切換（縱書翻頁與 CSS 注入）、內置/自訂字型嵌入（子集化與滿血版）、自訂封面預覽與管理、HTML5 閱讀器即時排版預覽及中繼資料與 XML 編輯（https://tool.david888.com/epub-editor ） |
| 26  | 繁簡轉換器引擎全面升級為 OpenCC JS，支援高品質的字詞與詞彙對照轉換（如頭髮、理髮、訊息），並應用於同文堂繁簡轉換器、TXT 轉 EPUB 及 EPUB 編輯器（https://tool.david888.com/tongwen-converter ） |
| 27  | 新增「2026 流行色：數位色票庫」工具（編輯區 分類），提供 Pantone 2026 與 Pinterest 2026 流行色票，支援 Light/Dark 雙模式、一鍵複製 HEX 色碼，並支援首頁效果即時預覽（https://tool.david888.com/find-color ） |
| 28  | 新增「社群貼文排版」工具（編輯區 分類），提供針對 FB、IG、Threads 等社群平台的換行與排版轉換，支援 Magazine 雜誌風與 Broetry 體轉換，支援字數限制計量，並支援多平台行動端預覽模擬（https://tool.david888.com/post-writer ） |
| 29  | 新增「AI 歌詞播放器」工具（音訊 分類），使用本機 Whisper 模型於瀏覽器端辨識或對齊歌詞，支援 LRC 上傳、編輯、簡轉繁與匯出（https://tool.david888.com/lyric-player ） |
| 30  | 分類調整：原本 `Images and videos` 拆分為「圖片 / 影片 / 音訊」，並新增「編輯區」分類，將 Markdown to HTML 與同文堂繁簡轉換器移入該分類 |
| 31  | 首頁介面與品牌調整：側欄新增顯示設定區塊、改用暖色系主題，品牌字樣簡化為 `888 Tool`，並將所有工具頁桌面版統一改為寬版配置 |
| 32  | 全站預設字體改為內建 `Maple Mono` variable webfont，套用於首頁、工具頁與 Naive UI 元件 |
| 33  | 新增「P2P 點對點傳檔」工具（網路 分類），透過 WebRTC 協定在裝置之間直接傳送大檔案，無伺服器中轉限制且端對端加密（https://tool.david888.com/p2p-file-transfer ） |
| 34  | 主題修正：Kanagawa Light / Dark 配色映射改回正確 token，修復 light mode 誤用 dark palette，並同步校正 `c-card` 亮色玻璃底色與 `世界時間` 卡片的文字、邊框、分隔線顏色 |
| 35  | 工具頁可用性修正：`SVG 工具箱` 重構為寬屏雙欄編輯器版面；`貓年齡計算器` 與 `潘通色票庫` 修正 dark mode 對比不足，改善按鈕、提示字與表單文字可讀性 |
| 36  | 版面擴充：`世界時間`、`QR Code 生成器`、`SVG Placeholder Generator` 改為桌面版寬屏布局，提升多欄工具在大螢幕下的可用空間（https://tool.david888.com/world-clock 、https://tool.david888.com/qrcode-generator 、https://tool.david888.com/svg-placeholder-generator ） |
| 37  | 側欄與共用元件主題修正：light mode 側欄、語系下拉、輸入框、選單、程式碼區塊與工具卡全面改回正確的 Kanagawa light 配色，不再殘留 dark palette 樣式 |
| 38  | 對比與可讀性修正：`Color 選擇器`、`特殊字體產生器` 等工具頁移除硬編碼深/淺底色，改為統一使用 theme token，避免 light mode 看不到字或 dark mode 白底刺眼 |
| 39  | 新增「即時會議字幕」工具（音訊 分類），使用本地 Whisper 模型做麥克風近即時聽寫，支援模型預載、Tiny/Base/Small/Medium 模型切換、暫停/繼續、localStorage 歷史、會議改名、清除 history、停止時下載 WAV 錄音檔，以及繁體中文/英文介面（https://tool.david888.com/meeting-captions ） |
| 40  | `AI 歌詞播放器` 更新為最新工具：保留本地 Whisper 歌詞辨識/對齊、LRC 編輯與匯出能力，並納入首頁「最新工具」區方便快速進入（https://tool.david888.com/lyric-player ） |
| 41  | `P2P 點對點傳檔` 更新為最新工具：透過 WebRTC 直接傳送檔案，無伺服器中轉限制且端對端加密，並納入首頁「最新工具」區（https://tool.david888.com/p2p-file-transfer ） |
| 42  | `線上時鐘` 更新為最新工具：支援網路校時、翻頁/模擬時鐘與全螢幕顯示，並納入首頁「最新工具」區（https://tool.david888.com/online-clock ） |
| 43  | `即時會議字幕` 目前收斂為單一 `Whisper Small` browser 路線，支援 WAV、MP3、M4A/AAC 音檔上傳轉寫，並保留即時麥克風聽寫（https://tool.david888.com/meeting-captions ） |
| 44  | `即時會議字幕` 補上 browser `Cache Storage` 持久快取，Whisper Small 首次下載後會保留在本機瀏覽器，不再因進站時的全域 cache 清除而被重抓；頁面亦提供低調的 `清模型 / 全清` 按鈕與手機使用提醒（https://tool.david888.com/meeting-captions ） |
| 45  | 側欄改為兩態固定模式：支援完整展開與窄欄 icon 模式，不再完全隱藏；窄欄下保留工具 icon 導覽與最小設定入口 |
| 46  | 首頁資訊密度優化：縮小左上品牌區，放大工具卡標題與說明字級，並將全站 GitHub 倉庫入口統一到 `https://github.com/tbdavid2019/888tools` |
| 47  | RWD 導覽修正：手機版側欄改為預設收合的 drawer，搜尋移到上方工具列，breadcrumb 改到內容上方並放大字級，修正 mobile overlay 擋住 tree 導致分類無法展開的問題 |
| 48  | 新增「P2P 網頁即時密聊」工具（網路 分類），使用 PeerJS (WebRTC) 建立瀏覽器直連，整合 Web Cryptography API (AES-GCM-256) 進行本地端到端加密 (E2EE)（https://tool.david888.com/p2p-chat ） |
| 49  | 密聊工具體驗重大優化：多人 Mesh 信令直連、側邊欄在線名單、植物 Emoji 暱稱、表情快捷面板、桌面推送通知、多行 TextArea (Shift+Enter 換行)、雙音階風鈴和弦提示音、房主 ID 本地續存防重整斷連、預設 Telegram 經典壁紙與自訂背景、剪貼簿圖片與截圖貼上傳送 |
| 50  | P2P 網頁即時密聊新增限時撤回：文字與檔案發送後 2 分鐘內可同步撤回所有目前在線成員，維持 WebRTC 直連與不落地儲存設計（https://tool.david888.com/p2p-chat ） |
| 51  | 修正 P2P 密聊房主重整/重新開啟自己邀請網址時被誤判為 Guest 的問題；Host 建立成功後同步更新房間網址，撤回訊息改用系統訊息樣式與虛線框顯示（https://tool.david888.com/p2p-chat ） |
| 52  | P2P 密聊 Telegram 經典塗鴉背景新增模糊與半透明遮罩，降低背景圖案對訊息文字的干擾，提升聊天內容辨識度（https://tool.david888.com/p2p-chat ） |

## Changelog

### 2026-07-13

- P2P 網頁即時密聊新增訊息撤回：文字、圖片與檔案在發送後 2 分鐘內可由發送者撤回，並同步更新所有目前在線的聊天室成員。
  - 封包加入穩定訊息 ID，支援多人 Mesh 廣播與非同步 E2EE 解密期間的撤回競態處理。
  - 撤回封包會驗證來源 peer，只允許訊息原作者撤回自己的訊息。
  - 聊天室仍不保存訊息；離線成員、已下載檔案、截圖或複製出去的內容無法被遠端收回。
- 修正房主重整或重新開啟自己的邀請網址時被誤判為 Guest 的問題；房主建立成功後會將目前網址同步為可分享、可恢復的房間網址。
- 撤回訊息改用「系統訊息」標籤、↩ 符號與虛線框顯示，與使用者實際輸入的訊息清楚區分。
- Telegram 經典塗鴉背景改用獨立模糊背景層、低透明度與半透明遮罩，避免圖案穿透干擾訊息文字。

### 2026-07-09

- P2P 網頁即時密聊：新增安全、隱私的端到端加密 (E2EE) P2P 聊天室工具，基於 WebRTC (PeerJS) 直連與瀏覽器原生 AES-GCM-256 金鑰加密，不經過任何伺服器儲存，支援分享連線連結與 2MB 以下圖片檔案傳送。本版本完成以下大升級：
  - **國際化語系重構**：移除全部寫死的中文，重構全站對話提示、系統通知與文案為多語系（英文 / 繁體中文 / 簡體中文）。
  - **多人 Mesh 網狀聊**：支援多人同時在線！Host 會自動廣播新成員並連成全網 Mesh 拓撲。
  - **線上成員名單與狀態**：側邊欄即時顯示線上人數與成員清單，並有綠色脈搏呼吸燈與 P2P 直連徽章。
  - **植物 Emoji 暱稱與表情快捷面板**：蔬菜水果暱稱自動配對相對應的表情符號（如 `快樂的西瓜 🍉`）；輸入框新增 😀 彈出式常用 Emoji 快捷網格面板。
  - **桌面推送通知 (Web Notifications)**：當收到新訊息且頁面在背景隱藏時，會自動發送桌面通知。
  - **多行長文輸入與換行**：輸入框改為自動伸縮高度的 TextArea，按 `Shift + Enter` 插入換行，`Enter` 直接發送。
  - **水晶和弦鈴聲**：升級為雙音階 chime 風鈴提示音，並可在側邊欄快速開啟/關閉。
  - **房主 ID 續存**：房主 ID 快取至 localStorage，重整或短暫斷線會自動要求沿用原 ID，確保已分享的邀請連結持續有效。
  - **Telegram 經典壁紙**：預設採用 Telegram 經典圖標塗鴉背景（適配深淺色模式），提供莫蘭迪藍、落櫻粉花、靜謐竹林等漸層底色，並支援輸入自定義圖片網址。
  - **貼圖與截圖貼上傳送**：支援直接在對話視窗中 `Ctrl+V` / `Cmd+V` 貼上剪貼簿圖片傳送。
- 全站品牌重塑：全站網頁標題及 logo Suffix 統一更新為 `DAVID888 TOOL`（中文切換下為 `DAVID888 TOOL 工具箱`），重新調整 OG 標籤與 Meta 描述以切合其定位。
- SEO & 預渲染優化：為解決 CSR (Client-Side Rendering) 導致搜尋引擎爬蟲抓取不到網頁內容、SEO 分數低 (40/100) 的問題，實現了基於 Playwright 的靜態頁面預渲染 (SSG) 機制。
- 結構化資料：自動在預渲染後的頁面中注入 page-specific 的 JSON-LD 結構化資料（首頁注入 `WebSite` 與 `ItemList`；各工具頁注入 `SoftwareApplication`；關於頁注入 `AboutPage`），為站點帶來富摘要搜尋結果支援。
- 打包自動化：將預渲染流程整合至 `pnpm build` 命令中，每次 build 都會自動模擬 Chromium 瀏覽器（繁體中文語系/台北時區）預渲染全部 115 個路由頁面，產出高 SEO 友善度的 HTML。

### 2026-06-25

- 即時會議字幕：目前固定使用 `Whisper Small` 做 browser 端離線轉寫，保留即時麥克風與音檔上傳兩條流程
- 即時會議字幕：保留 `Whisper Small` 作為舊版 fallback，不再把 WebGPU-only Whisper 當成主方案
- 即時會議字幕：預設語言改為「中英混合 / 自動」，保留手動選中文、英文、日文、韓文
- 即時會議字幕：新增音檔上傳轉寫，支援瀏覽器可解碼的 WAV、MP3、M4A/AAC，會建立新的會議逐字稿並顯示分段進度
- 即時會議字幕：介面改成上方「現場字幕」、下方「會議逐字稿」，讓即時觀看與會後整理用途分開
- 即時會議字幕：Whisper Small 改用 browser `Cache Storage` 持久快取，第一次下載後會留在本機瀏覽器；頁面提供 `清模型 / 全清` 低調按鈕，並對手機瀏覽器提示長時間即時錄音風險

### 2026-06-23

- 新增「即時會議字幕」工具：使用瀏覽器端本地 Whisper 模型進行麥克風近即時聽寫，支援延遲轉寫、上下文保留、暫停/繼續、歷史回看與 localStorage 保存（https://tool.david888.com/meeting-captions ）
- 即時會議字幕：新增 Tiny/Base/Small/Medium Whisper 模型選單，頁面載入時會先預載模型，錄音開始後可直接收音並週期性轉寫
- 即時會議字幕：停止錄音時可自動下載完整 WAV 錄音檔，並保留逐字稿文字匯出與複製功能
- 即時會議字幕：新增 history 改名與清除功能，清除按鈕固定放在 history 面板底部，避免和 New 操作混在一起
- 即時會議字幕：補齊繁體中文與英文 i18n 文案，包含按鈕、狀態、提示、錯誤訊息、prompt 與 confirm
- 首頁最新工具：將 `即時會議字幕`、`AI 歌詞播放器`、`P2P 點對點傳檔`、`線上時鐘` 標記為最新工具，出現在首頁 New / 最新工具區
- 品質修正：修復多個既有工具的 TypeScript 型別問題，讓全站 `pnpm typecheck` 可通過

### 2026-06-10

- 主題修正：Kanagawa Light / Dark 主題 token 映射改回正確來源，避免 light mode 錯用 dark palette，並同步修正 `c-card` 的亮色玻璃背景
- 世界時間：改為寬屏多欄版面，並讓本地時間卡與各洲卡片完整套用 Kanagawa 主題色
- SVG 工具箱：重構為桌面版寬屏雙欄編輯器，改善上傳、複製、下載與預覽區配置
- 深色模式可讀性：修正 `貓年齡計算器`、`潘通色票庫` 在 dark mode 下文字與按鈕對比過低的問題
- 版面擴充：`QR Code 生成器`、`SVG Placeholder Generator` 改為桌面版寬屏布局，`世界時間` 補上更完整的多欄排列
- 共用主題修正：側欄、語系下拉、`c-input-text`、`c-select`、`TextareaCopyable` 與工具卡統一套用正確的 Kanagawa Light / Dark token
- 工具頁可讀性修正：`Color 選擇器`、`特殊字體產生器` 等頁面移除硬編碼深淺底色，改為 theme-driven 對比樣式

### 2026-05-26

- 新增「P2P 點對點傳檔」工具：透過 WebRTC 協定在裝置之間直接傳送檔案，無檔案大小限制且端對端加密，內建 PeerJS 信令（https://tool.david888.com/p2p-file-transfer ）

- 新增「AI 歌詞播放器」工具：支援音訊上傳後在瀏覽器端下載並執行 Whisper 模型，可直接辨識歌詞，或先貼歌詞再自動對齊時間，並支援 LRC 上傳、編輯、簡轉繁與匯出（https://tool.david888.com/lyric-player ）
- 介面調整：`AI 歌詞播放器` 改用寬版雙欄工具頁，提升桌面版可讀性與歌詞區顯示空間
- 分類重整：原本 `Images and videos` 拆分為「圖片 / 影片 / 音訊」，並新增「編輯區」分類，將 Markdown to HTML 與同文堂繁簡轉換器移入該分類
- 側欄與品牌更新：顯示設定區塊移至工具總數下方、主題配色改為暖色系、預設分類折疊、品牌字樣簡化為 `888 Tool`
- 全站字體與版面更新：內建 `Maple Mono` variable webfont 作為預設字體，並將工具頁桌面版統一調整為寬版，同時保留手機版單欄 RWD

### 2026-01-29

- 影片轉檔與剪輯：修復下載後無聲問題，輸出影片保留音訊（https://tool.david888.com/video-converter ）
- CSV & Excel 檢視器：支援編碼偵測與手動切換，並改善 XLSX 欄位對齊（https://tool.david888.com/csv-excel-viewer ）
- 音訊編輯器：支援拖曳選取與剪輯，淡入/淡出/回聲/混響可輸出 WAV（https://tool.david888.com/audio-editor ）
- PDF 工具箱：修復旋轉功能（https://tool.david888.com/pdf-tools ）
- AI 圖片去背：提升輸出品質與細節保留（https://tool.david888.com/remove-background ）

![alt text](image.png)

## AI Agent 支援 (LLM Skill)

本專案提供一份完整的 AI 技能定義檔 `SKILL.md`，支援讓大語言模型 (LLM) 與 AI 開發工具直接閱讀與調用。這可以讓 AI 知道可以在 `tool.david888.com` 找到哪些有用的轉換、計算與開發工具。

如果你正在使用 AI Agent（例如 Claude Desktop、OpenCode、Cursor 等），你可以透過載入本專案根目錄的 `SKILL.md` 來為你的 AI 擴充這些能力。

### 讓你的 AI 學習這個技能

如果你的環境支援 `opencode/skills`，你只需要將專案內的 Skill 複製到你的全域設定檔中：

```bash
mkdir -p ~/.config/opencode/skills/it-tools
curl -o ~/.config/opencode/skills/it-tools/SKILL.md https://raw.githubusercontent.com/tbdavid2019/888tools/main/SKILL.md
```

安裝完成後，你的 AI 工具就會自動學習到：當你需要產生 UUID、轉換 Base64 或編寫 Regex 時，它可以直接將 `tool.david888.com` 對應的工具連結推薦給你！

## Functionalities and roadmap

Please check the [issues](https://github.com/tbdavid2019/888tools/issues) to see if some feature listed to be implemented.

You have an idea of a tool? Submit a [feature request](https://github.com/tbdavid2019/888tools/issues/new/choose)!

## Deploy to Vercel

1. 將程式碼推上 GitHub/GitLab（`dist` 繼續保留在 `.gitignore`）。
2. 在 Vercel 匯入專案，Framework 選「Vite」。
3. 安裝指令：`pnpm install --frozen-lockfile`（可用預設）；Build 指令：`pnpm build`；Output Directory：`dist`。
4. 如需覆寫 canonical origin，可設定 `VITE_SITE_ORIGIN`；預設為 `https://tool.david888.com`。
5. 需要其他環境變數的話，於 Vercel 專案設定補上後重新部署。
6. 首次部署完成後即可透過 Vercel 提供的網址存取。

## 本地測試

啟動開發伺服器：pnpm dev，預設會跑在 http://localhost:5173

如需預覽正式建置：pnpm build 後 pnpm preview（預設 http://localhost:5050）

```
pnpm install
pnpm dev
```

```
pnpm build
pnpm preview
```

## Docker 打包

```
docker build -t tool333 .
docker run -d -p 80:80 tool333

docker build -t tbdavid2019/tool333:latest .
docker push tbdavid2019/tool333:latest
```

## Docker 運行

```
docker run -d -p 80:80  tbdavid2019/tool333
```

## Contribute

### Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) with the following extensions:

- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur)
- [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin).
- [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
- [i18n Ally](https://marketplace.visualstudio.com/items?itemName=lokalise.i18n-ally)

with the following settings:

```json
{
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "i18n-ally.localesPaths": ["locales", "src/tools/*/locales"],
  "i18n-ally.keystyle": "nested"
}
```

### Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
   2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.

### Project Setup

```sh
pnpm install
```

### Compile and Hot-Reload for Development

```sh
pnpm dev
```

### Type-Check, Compile and Minify for Production

```sh
pnpm build
```

### Run Unit Tests with [Vitest](https://vitest.dev/)

```sh
pnpm test
```

### Lint with [ESLint](https://eslint.org/)

```sh
pnpm lint
```

### Create a new tool

To create a new tool, there is a script that generate the boilerplate of the new tool, simply run:

```sh
pnpm run script:create:tool my-tool-name
```

It will create a directory in `src/tools` with the correct files, and a the import in `src/tools/index.ts`. You will just need to add the imported tool in the proper category and develop the tool.

## Contributors

Big thanks to all the people who have already contributed!

[![contributors](https://contrib.rocks/image?repo=corentinth/it-tools&refresh=1)](https://github.com/corentinth/it-tools/graphs/contributors)

## Credits

Coded with ❤️ by [Corentin Thomasset](https://corentin.tech?utm_source=it-tools&utm_medium=readme).

This project is continuously deployed using [vercel.com](https://vercel.com).

Contributor graph is generated using [contrib.rocks](https://contrib.rocks/preview?repo=corentinth/it-tools).

<a href="https://www.producthunt.com/posts/it-tools?utm_source=badge-featured&utm_medium=badge&utm_souce=badge-it&#0045;tools" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=345793&theme=light" alt="IT&#0032;Tools - Collection&#0032;of&#0032;handy&#0032;online&#0032;tools&#0032;for&#0032;devs&#0044;&#0032;with&#0032;great&#0032;UX | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>
<a href="https://www.producthunt.com/posts/it-tools?utm_source=badge-top-post-badge&utm_medium=badge&utm_souce=badge-it&#0045;tools" target="_blank"><img src="https://api.producthunt.com/widgets/embed-image/v1/top-post-badge.svg?post_id=345793&theme=light&period=daily" alt="IT&#0032;Tools - Collection&#0032;of&#0032;handy&#0032;online&#0032;tools&#0032;for&#0032;devs&#0044;&#0032;with&#0032;great&#0032;UX | Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" /></a>

## License

This project is under the [GNU GPLv3](LICENSE).
