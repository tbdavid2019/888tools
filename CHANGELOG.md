# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.
 
## Version 2026.07.13

### Features
- **p2p-chat**: 新增限時訊息撤回功能。文字、圖片與檔案發送後 2 分鐘內可由發送者撤回，並同步更新所有目前在線的聊天室成員。
  - 封包加入穩定訊息 ID，支援多人 WebRTC Mesh 廣播。
  - 撤回封包驗證來源 peer，只允許原作者撤回自己的訊息。
  - 處理 E2EE 非同步解密期間的撤回競態，並維持訊息不經伺服器儲存的設計。
  - 離線成員、已下載檔案、截圖或複製出去的內容無法被遠端收回。
- P2P 密聊改用固定 Room ID 搭配 Cloudflare Durable Object signaling：房間不再綁定房主或單一 Peer ID，A 離開或重整後，仍可透過同一房間網址重新加入；signaling 只暫存在線成員，不保存聊天內容。
- 撤回訊息改用「系統訊息」標籤、↩ 符號與虛線框顯示，與使用者實際輸入的訊息清楚區分。
- Telegram 經典塗鴉背景改用獨立模糊背景層、低透明度與半透明遮罩，避免圖案穿透干擾訊息文字。
- 背景裝飾層不再擴張聊天容器，並隱藏橫向溢出，避免主題背景造成不必要的水平捲軸。
- 補充 P2P Chat 架構文件，說明 Vercel、Cloudflare Worker、Durable Object 與瀏覽器 WebRTC 的分工，以及目前不使用 R2/KV 儲存聊天內容的原因。

## Version 2026.07.09

### Features
- **p2p-chat**: 新增「P2P 網頁即時密聊」工具，使用 PeerJS (WebRTC) 建立瀏覽器直連，整合 Web Cryptography API (AES-GCM-256) 進行本地端到端加密 (E2EE)。支援分享帶連線參數的邀請連結，並支援傳送 2MB 以下的圖片與檔案。本版本包含以下重要更新：
  - **多語系重構**：將所有硬編碼的對話提示與通知文字全面遷移至語系檔（英文/繁體中文/簡體中文），實現完美的國際化支援。
  - **多人 WebRTC Mesh 網狀連線**：支援多人同時在線！新加入成員會自動由 Host 房主廣播並建立成員間的端對端直連。
  - **聊天室線上名單**：側邊欄新增結構化的線上成員列表，標示連線狀態與 P2P 直連徽章。
  - **植物 Emoji 暱稱與快捷選擇器**：蔬菜水果暱稱自動配對相對應的 Emoji，且輸入框新增 😀 彈出式常用 Emoji 快捷網格面板。
  - **瀏覽器桌面推送通知**：新增 Web Notifications 支援，當有新訊息且頁面在背景隱藏時，會自動發送桌面通知。
  - **多行輸入與換行**：輸入框改為自動伸縮高度的 TextArea 容器，支援貼上長文，並支援 `Shift + Enter` 插入換行、`Enter` 直接送出。
  - **風鈴和弦提示音與開關**：採用 Web Audio API 重新合成了優雅的雙音階 chime 提示音，並在側邊欄提供開啟/關閉開關。
  - **邀請連結 ID 本地續存**：房主 Peer ID 會快取於本地 localStorage，網頁刷新或短暫斷線重連會自動請求沿用原 ID，確保已分享的邀請連結持續有效。
  - **Telegram 風格塗鴉對話背景**：預設採用 Telegram 經典塗鴉壁紙（自動適配深淺色模式），提供莫蘭迪藍、落櫻粉花、靜謐竹林等漸層底色，並支援輸入自定義圖片網址。
  - **貼圖與截圖黏貼傳送**：支援剪貼簿貼圖！在對話視窗內直接按下 `Ctrl+V` / `Cmd+V` 即可自動讀取剪貼簿截圖並上傳傳送。
- **branding**: 將全站標題由 `Tool.David888.com` 與 `888 Tool` 更改為 `DAVID888 TOOL`，中文語系下自動顯示為 `DAVID888 TOOL 工具箱`，並全面更新首頁、側邊欄與各工具頁的網頁標題、OG 標籤與 Meta 說明，突顯其作為「綜合工具箱」的定位。
- **seo/ssg**: 新增 build-time 預渲染流程，在打包 (`pnpm build`) 完成後，自動透過 Playwright Chromium (繁體中文/台北時區) 預渲染全站所有 115 個工具路由，產出高 SEO 友善度的 HTML。
- **seo/structured-data**: 新增自動注入 JSON-LD 結構化資料。首頁注入 `WebSite` 與 `ItemList` 結構；每個工具路由頁面注入對應的 `SoftwareApplication` 結構；About 頁注入 `AboutPage` 結構。
- **build**: 將預渲染流程整合至 `package.json` 中的 `build` 指令，保證每次打包皆會自動產生高 SEO 友善度的靜態 HTML 檔案。

## Version 2026.07.07

### Features
- **discovery**: 新增 build-time discovery 生成流程，於 `pnpm build` 自動產生 `/sitemap.xml`、`/.well-known/api-catalog` 與 `/robots.txt`。
- **seo**: 將站點 canonical source-of-truth 統一為 `https://tool.david888.com`，首頁、About 頁與各工具頁皆改為輸出一致的 canonical 與 `og:url`。
- **headers**: 在 Vercel 首頁回應新增 `Link: </.well-known/api-catalog>; rel="api-catalog"`，並對 `/.well-known/api-catalog` 明確輸出 `application/linkset+json`。
- **sidebar/ui**: 側邊欄改為兩態固定模式，支援「完整展開」與「窄欄 icon 模式」，不再完全隱藏；窄欄模式會保留工具 icon 導覽與最小設定入口。
- **home/ui**: 縮小左上品牌區塊、重整側欄資訊密度，並放大全站與首頁工具卡的標題/說明字級，改善掃讀與可讀性。
- **navigation/rwd**: 手機版導覽改為預設收合的 drawer，將搜尋移到上方工具列，並把 breadcrumb 移到內容區上方且補上首頁 icon。
- **repo**: 全站 GitHub 倉庫與 issue 入口統一改為 `https://github.com/tbdavid2019/888tools`，同步更新首頁、導覽列、command palette、`package.json` 與多語系文案。

### Bug Fixes
- **mobile/sidebar**: 修正手機版側欄 overlay 蓋住樹狀選單，導致 `測量`、`加密` 等分類無法正常展開的問題。
- **mobile/search**: 修正手機檢視下搜尋入口被側欄版面擠壓、難以操作的問題。
- **breadcrumb**: 放大 breadcrumb 字級並調整排列，避免工具頁上方導覽資訊過小。

### Chores
- **docs**: 補充 README 的 Agent Discovery / SEO 說明，記錄 sitemap、robots.txt、Content-Signal 與 API catalog 的生成與維護方式。
- **docs**: 補充 README 與 CHANGELOG，記錄首頁側欄兩態模式、mobile drawer / breadcrumb 調整、字級優化與倉庫路徑更新。

## Version 2026.06.25

### Features
- **meeting-captions**: `meeting-captions` 現在只保留單一 `Whisper Small` browser 路線，移除 `SenseVoice Small` 主流程與模型切換 UI。
- **meeting-captions**: 預設語言改為「中英混合 / 自動」，避免中英夾雜會議被固定中文 prompt 影響英文術語辨識。
- **meeting-captions**: 新增上傳音檔轉寫入口，支援瀏覽器可解碼的 WAV、MP3、M4A/AAC，會建立新的會議逐字稿並分段更新進度。
- **meeting-captions**: 調整介面資訊架構，將上方區塊標示為「現場字幕」，下方輸出區改為「會議逐字稿」，降低即時字幕與完整逐字稿的辨識混淆。
- **meeting-captions**: 保留 browser `Cache Storage` 持久快取，Whisper Small 首次下載後會留在本機瀏覽器；頁面維持低調的 `清模型` 與 `全清` 按鈕，並補上手機瀏覽器使用提醒。

### Bug Fixes
- **meeting-captions**: 保留 `Whisper Small` 作為舊版 fallback，不再把 WebGPU-only Whisper 當成主方案。
- **meeting-captions**: 將模型文案收斂成單一 `Whisper Small`，避免 UI 暗示還能切換其他 browser 模型。
- **app**: 移除啟動時自動 `caches.delete()` 的行為，避免每次進站都把模型 cache 清掉。

## Version 2026.06.23

### Features
- **meeting-captions**: 新增「即時會議字幕」工具，使用瀏覽器端本地 Whisper 模型進行麥克風近即時聽寫，支援延遲轉寫、上下文保留、暫停/繼續、歷史回看與 localStorage 保存。
- **meeting-captions**: 支援 Tiny/Base/Small/Medium Whisper 模型選單，頁面載入時會先預載模型，錄音開始後可直接收音並週期性轉寫。
- **meeting-captions**: 停止錄音時可自動下載完整 WAV 錄音檔，並保留逐字稿文字匯出與複製功能。
- **meeting-captions**: 新增 history 改名與清除功能，清除按鈕固定放在 history 面板底部，避免與 New 操作混在同一區。
- **meeting-captions**: 補齊繁體中文與英文 i18n 文案，包含按鈕、狀態、提示、錯誤訊息、prompt 與 confirm。
- **home**: 將 `meeting-captions`、`lyric-player`、`p2p-file-transfer`、`online-clock` 標記為最新工具，讓首頁 New / 最新工具區顯示最近 4 個工具更新。

### Bug Fixes
- **meeting-captions**: 改用 Web Audio PCM 捕捉與重採樣，避免 MediaRecorder WebM chunk concat/decode 不穩定造成轉寫失敗。
- **meeting-captions**: 修正工具頁被全站窄版 layout 壓縮的問題，改為 history + wide stage 的寬版桌面布局，並保留 RWD 單欄 fallback。
- **typecheck**: 修復多個既有工具的 TypeScript 型別問題，讓全站 `pnpm typecheck` 可通過。

## Version 2026.06.10

### Bug Fixes
- **theme**: 修正 Kanagawa Light/Dark 主題 token 映射錯誤，避免 light mode 誤用 dark palette，並讓 `c-card` 在亮色模式下改回正確的 Kanagawa 淺色玻璃背景。
- **world-clock**: 修正世界時間卡片未完整套用 Kanagawa 主題色的問題，統一本地時間卡與各洲時區卡片的背景、邊框、文字與分隔線色彩，並維持桌面版寬屏多欄排列。
- **cat-age-calculator**: 修正 dark mode 下表單標籤、單位字與結果提示字過暗導致難以閱讀的問題。
- **find-color**: 提升色票頁操作按鈕與快速複製 chip 的對比，避免淺色文字在深色卡片上難以辨識。
- **layout**: 修正 `qrcode-generator` 與 `svg-placeholder-generator` 在桌面版仍受窄欄限制的問題，改為寬屏雙欄配置。
- **sidebar/theme**: 修正 light mode 側欄、語系下拉、工具卡、輸入框、選單與程式碼區塊仍殘留 dark palette 的漏網樣式。
- **color-converter**: 修正 `Color 選擇器` 欄位在 light mode 下誤顯示深色背景，導致內容不可讀的問題。
- **fancy-text-generator**: 修正 `特殊字體產生器` 在 dark mode 下結果列硬編碼淺色背景過亮刺眼的問題。

### Features
- **svg-tools**: 重構 SVG 工具箱編輯器版面，改為寬屏雙欄配置，整理上傳/複製/下載操作區，並改善預覽區在桌面版的可用空間與 RWD 表現。

## Version 2026.05.26

### Features
- **p2p-file-transfer**: 新增「P2P 點對點傳檔」工具，支援透過 WebRTC 協定在裝置間直接傳送檔案，內建 PeerJS 自動信令與手動信令雙模式，並支援大檔案自動切割傳輸與背壓控制。
- **lyric-player**: 新增「AI 歌詞播放器」工具，支援本機 Whisper 模型下載與瀏覽器端推論，可上傳音訊後自動辨識歌詞、貼上既有歌詞做時間對齊，並支援 LRC 上傳、編輯、簡轉繁與匯出。
- **layout**: 為 `lyric-player` 新增寬版工具頁配置，避免多欄內容被全站預設 600px 版寬壓縮。
- **categories**: 將原本 `Images and videos` 拆分為「圖片」、「影片」、「音訊」，並新增「編輯區」分類，將 `Markdown to HTML` 與 `同文堂繁簡轉換器` 移入該分類。
- **ui**: 首頁側欄外觀改版，新增顯示設定區塊、統一暖色系主題、預設分類折疊、品牌字樣簡化為 `888 Tool`。
- **fonts**: 全站預設字體改為內建 `Maple Mono` variable webfont，並套用到 Naive UI 主題與全域介面。
- **layout**: 全工具頁桌面版統一改為寬版配置，改善 `svg-tools` 等多欄工具的可用空間，同時保留手機版單欄 RWD。

## Version 2026.05.20

### Features
- **editor-category**: 新增「編輯區」工具分類，並將 `html-wysiwyg-editor`（富文本編輯器）移入該分類。
- **find-color**: 新增「2026 流行色：數位色票庫」工具，提供 Pantone 2026 及 Pinterest 2026 流行色，支援 Light/Dark 模式切換、一鍵複製 HEX 色碼與首頁效果即時預覽。
- **find-color**: 擴充 Pantone 年度色資料庫，新增 2025 `Mocha Mousse` 與 2024 `Peach Fuzz` Light/Dark 配色，並將工具名稱調整為「潘通色票庫 / Pantone Palette Library」。
- **post-writer**: 新增「社群貼文排版」工具，支援 FB、IG、Threads 等社群平台的換行與排版轉換，提供 Magazine 雜誌風與 Broetry 體，支援字數限制計量與多平台行動端預覽模擬。
- **txt-to-epub**: 新增「TXT 轉 EPUB 小說產生器」工具，支援自動章節正則偵測、直書/橫書樣式、自訂封面以及字型子集化精簡與完整嵌入（滿血版）。
- **epub-editor**: 新增「EPUB 編輯器 / 轉換器」工具，支援本機解壓與打包，並全面重構為 HelloRuru 版的電子書排版優化與轉換功能：
  - 支援「繁體・詞彙（twp）」及「繁體・純字（tw）」雙 OpenCC 轉換模式。
  - 支援標點符號轉換（“...” 轉 「...」）。
  - 支援直書橫書翻頁樣式（縱書時自動寫入 spine progression rtl，CSS 注入 writing-mode 覆寫）。
  - 支援思源黑體、思源宋體、原俠正楷、jf 粉圓四款內置字型與自訂字型上傳，並提供「子集化精簡版」及「完整滿血版」嵌入模式。
  - 支援字體大小、行距、首行縮排微調。
  - 支援自訂封面圖片（預覽、替換與完全移除）。
  - 提供 HTML5 模擬閱讀器即時排版預覽，直書時可橫向滾動。
  - 保留內部原始碼編輯器與中繼資料編輯功能。
- **services**: 簡繁體轉換引擎全面升級至 OpenCC JS，新增支援字元對照與詞彙轉換兩大分支，並將其整合至同文堂繁簡轉換器、TXT 轉 EPUB 及 EPUB 編輯器中。

### Bug Fixes
- **ascii-text-drawer**: 修復當輸入框清空或在反向代理等跨域網域下，因 figlet 載入字型檔失敗而顯示「Current settings resulted in error」的錯誤。
- **epub-editor**: 修正預設字型（思源黑體、思源宋體、原俠正楷、jf 粉圓）載入失效問題，改為頁面掛載時動態注入 `@font-face` 設定，並在重設與卸載時正確清理。
- **find-color**: 改版配色展示卡，將各色角色的 HEX 色碼改為常駐顯示，新增單色快速複製與整組色票一鍵複製，並補上繁體中文與英文介面文案 fallback。
- **ui**: 修正導覽列（.navbar-wrapper）的 `z-index` 層級，確保語系選單下拉選單、搜尋面板不會被下方的 Bento 區塊阻擋。

## Version 2026.04.24

### Features
- **home**: added random Bing wallpaper background with glassmorphism effects
- **ui**: updated cards to Bento-style with 24px rounded corners and subtle shadows
- **ui**: implemented backdrop-filter blur on tool cards for better aesthetics
- **services**: added Bing wallpaper history crawler and random selection service
- **ui**: added user controls in the sidebar for Bing wallpaper (on/off) and card transparency slider
- **settings**: implemented persistent storage for user layout preferences
- **ui**: implemented global Bing wallpaper background across all 107+ tools
- **ui**: added frosted glassmorphism effect to the sidebar and top navigation for better readability
- **fix**: resolved layout rendering crash by correctly injecting store dependencies

## Version 2024.10.22-7ca5933

### Features
- **new tool**: Regex Tester (and Cheatsheet) (#1030) (f5c4ab1)
- **new tool**: Markdown to HTML (#916) (87984e2)
- **new-tool**: add email normalizer (#1243) (318fb6e)
- **new tools**: JSON to XML and XML to JSON (#1231) (f1a5489)
- **lorem-ipsum**: add button to refresh text lorem-ipsum (#1213) (e1b4f9a)
- **base64**: Base64 enhancements (#905) (30144aa)

### Bug fixes
- **favorites**: store favorites regardless of languages (#1202) (7ca5933)
- **emoji-picker**: debounced search input (#1181) (76a19d2)
- **format-transformer**: set overflow for output area width (#787) (b430bae)
- **jwt-parser**: prevent UI overflow on small screen (#1095) (dd4b7e6)

### Refactoring
- **regex-tester**: better description (7251700)

### Chores
- **sponsors**: fern sponsor banners (#1314) (f962c41)
- **readme**: updated logos (#1294) (6709498)

### Documentation
- **author**: updated author links (#1316) (1c35ac3)

## Version 2024.05.13-a0bc346

### Features
- **i18n**: added German translation (#1038) (2c2fb21)
- **new tool**: Outlook Safelink Decoder (#911) (d3b32cc)
- **new tool**: ascii art generator (#886) (fe349ad)
- **i18n**: get locales on build (#880) (dc04615)
- **i18n**: added vi tools translations (#876) (079aa21)
- **i18n**: added zh tools translations (#874) (9c6b122)
- **i18n**: added missing locale files in tools (#863) (7f5fa00)
- **i18n**: added vietnamese language (#859) (1334bff)
- **i18n**: added spanish language (#854) (85b50bb)
- **i18n**: added portuguese language (#813) (c65ffb6)
- **i18n**: added ukrainian language (#827) (693f362)
- **new-tool**: yaml formater (#779) (fc06f01)
- **new-tool**: added unicode conversion utilities (#858) (c46207f)

### Bug fixes
- **language**: English language cleanup (#1036) (221ddfa)
- **url-encoder, validation**: typo in validation of url-encoder.vue #1024 (cb5b462)
- **integer base converter**: support bigint (#872) (9eac9cb)
- **bcrypt tool**: allow salt rounds up to 100 (#987) (23f82d9)

### Refactoring
- **lint**: removed extra semi (33e5294)
- **auto-imports**: regen auto imports (1242842)
- **home**: lightened tool cards (#882) (a07806c)
- **home**: removed n-grid to prevent layout shift (#881) (10e56b3)
- **i18n**: added locales per tool (#861) (95698cb)

### Chores
- **issues**: prevent empty issues (#1078) (a0bc346)
- **issues**: removed old issue templates (#1077) (5a7b0f9)
- **node**: upgraded node version in CI workflows (b59942a)
- **version**: release 2024.05.10-33e5294 (38d5687)
- **issues**: improved issues template (2852c30)
- **issues**: improved bug issue template (#1046) (a799234)

### Documentation
- **changelog**: update changelog for 2024.05.10-33e5294 (9dfd347)

## Version 2023.12.21-5ed3693

### Features

- **i18n**: improve chinese i18n (#757) (2e56641)
- **i18n**: add tooltip and favoriteButton i18n (#756) (a1037cf)
- **i18n**: add Chinese translation base (#718) (8f99eb6)
- **new tool**: pdf signature checker (#745) (4781920)
- **new tool**: numeronym generator (#729) (e07e2ae)

### Bug fixes

- **jwt-parser**: jwt claim array support (#799) (5ed3693)
- **camera-recorder**: stop camera on navigation (#782) (80e46c9)
- **doc**: updated create new tool command in readme (#762) (7a70dbb)
- **base64-file-converter**: fix downloading of index.html content without data preambula (#750) (043e4f0)
- **docker**: rollback armv7 in docker releases (#741) (205e360)
- **eta**: corrected example (#737) (821cbea)

### Refactoring

- **about, i18n**: improved i18n dx with markdown (#753) (bd3edcb)
- **token, i18n**: complete fr translation (#752) (de1ee69)
- **uuid generator**: uuid version picker (#751) (38586ca)
- **case converter**: no split on lowercase, uppercase and mocking case (#748) (ca43a25)
- **ui**: replaced legacy n-upload with c-file-upload (#747) (7fe47b3)
- **token**: added password in token generator keywords (#746) (16ffe6b)
- **bcrypt**: fix input label align (#721) (093ff31)

### Chores

- **deps**: switched from oui to oui-data for mac address lookup (#693) (0fe9a20)
- **deps**: update unocss monorepo to ^0.57.0 (#638) (2e396d8)
- **docker**: added armv7 plateform for docker releases (#722) (fe1de8c)

## Version 2023.11.02-7d94e11

### Features

- **i18n**: language selector (#710) (e86fd96)

### Bug fixes

- **dockerfile**: revert replacement of nginx image with non-privileged one (#716) (7d94e11)
- **encryption**: alert on decryption error (#711) (02b0d0d)

### Refactoring

- **math-evaluator**: improved description (e87f4b1)
- **math-evaluator**: improved search and UX (#713) (58de897)

## Version 2023.11.01-e164afb

### Features

- **command-palette**: clear prompt on palette close (#708) (d013696)
- **command-palette**: added about page in command palette (99b1eb9)
- **new tool**: random MAC address generator (#657) (cc3425d)
- **case-converter**: added mocking case (#705) (681f7bf)
- **date-converter**: added excel date time format (#704) (f5eb7a8)
- **i18n**: token generator (#688) (02e68d3)
- **i18n**: home page (#687) (00562ed)
- **i18n**: support for i18n in .ts files (#683) (ebb4ec4)
- **i18n**: tool card (#682) (84a4a64)
- **i18n**: about page (#680) (a2b53c2)
- **i18n**: 404 page (#679) (35563b8)
- **new tool**: text to ascii converter (#669) (b2ad4f7)
- **new tool**: ULID generator (#623) (5c4d775)
- **new tool**: add wifi qr code generator (#599) (0eedce6)
- **new tool**: iban validation and parser (#591) (3a63837)
- **new tool**: text diff and comparator (#588) (81bfe57)

### Bug fixes

- **deps**: fix issue on slugify (#593) (#673) (720201a)
- **deps**: update dependency monaco-editor to ^0.43.0 (#620) (e371ef7)
- **deps**: update dependency sql-formatter to v13 (#606) (c7d4562)

### Refactoring

- **ui**: better ui demo preview menu (#664) (015c673)
- **color-converter**: improved color-converter UX (#701) (abb8335)
- **docker**: improved docker config (#700) (020e9cb)
- **c-table**: added description on c-table for accessibility (b408df8)
- **ci**: reduced timeout in e2e (#666) (88b8818)
- **ui**: new c-table ui component (#665) (ee4c853)
- **ui**: removed n-page-header component in user-agent parser (#663) (cbf58fd)
- **ui**: removed n-p components in about page (#662) (a757a51)
- **ui**: switched naive tooltip components to custom ones (#661) (025f556)
- **spelling**: minor corrections to phrasing/spelling (#596) (8a30b6b)
- **i18n**: merge tools scoped locales with global ones (#612) (233d556)
- **c-key-value-list**: got rid of table for layout (#611) (7ab9204)
- **CI**: run e2e against built app and no longer vercel (#610) (18dd140)
- **bcrypt**: fix typo (#604) (e18bae1)

### Chores

- **deps**: clean unused dependencies (#709) (e164afb)
- **deps**: update docker/setup-qemu-action action to v3 (#627) (4365226)
- **deps**: update docker/setup-buildx-action action to v3 (#626) (57ecda1)
- **deps**: update docker/login-action action to v3 (#625) (d8d7a3b)
- **deps**: update docker/build-push-action action to v5 (#624) (d36b18f)
- **deps**: update dependency node to v18.18.2 (#674) (eea9f91)
- **deps**: update dependency node to v18.18.0 (#636) (2d2dffb)
- **deps**: update actions/checkout action to v4 (#613) (4972159)
- **deps**: update dependency unplugin-icons to ^0.17.0 (#609) (f035f48)
- **deps**: update dependency @intlify/unplugin-vue-i18n to ^0.13.0 (#597) (d1dff42)
- **deps**: update dependency @antfu/eslint-config to ^0.41.0 (#585) (a9cd91c)
- **deps**: update dependency typescript to ~5.2.0 (#587) (f3e14fc)

### Doc

- **readme**: added contributors list (#622) (557b304)
- **hosting**: added cloudron in the other hosting solutions section (#589) (06c3547)

## Version 2023.08.21-6f93cba

### Features

- **copy**: support legacy copy to clipboard for older browser (#581) (6f93cba)
- **new tool**: string obfuscator (#575) (c58d6e3)

### Bug fixes

- **deps**: update dependency sql-formatter to v12 (#520) (2bcb77a)

### Chores

- **deps**: switched to fucking typescript v5 (#501) (76b2761)
- **deps**: update dependency @antfu/eslint-config to ^0.40.0 (#552) (6ff9a01)
- **deps**: update dependency prettier to v3 (#564) (a2b9b15)
- **deps**: removed @typescript-eslint/parser (#563) (144f86e)
- **deps**: removed ts-pattern (#565) (0f1f659)

## Version 2023.08.16-9bd4ad4

### Features

- **Case Converter**: Add lowercase and uppercase (#534) (7b6232a)
- **new tool**: emoji picker (#551) (93f7cf0)
- **ui**: added c-select in the ui lib (#550) (dfa1ba8)
- **new-tool**: password strength analyzer (#502) (a9c7b89)
- **new-tool**: yaml to toml (e29b258)
- **new-tool**: json to toml (ea50a3f)
- **new-tool**: toml to yaml (746e5bd)
- **new-tool**: toml to json (c7d4f11)
- **command-palette**: random tool action (ec4c533)
- **config**: allow app to run in a subfolder via BASE_URL (#461) (6304595)
- **new-tool**: percentage calculator (#456) (b9406a4)
- **new-tool**: json to csv converter (69f0bd0)
- **new tool**: xml formatter (#457) (a6bbeae)
- **chmod-calculator**: added symbolic representation (#455) (f771e7a)
- **enhancement**: use system dark mode (#458) (cf7b1f0)
- **phone-parser**: searchable country code select (d2956b6)
- **new tool**: camera screenshot and recorder (34d8e5c)
- **base64-string-converter**: switch to encode and decode url safe base64 strings (#392) (0b20f1c)

### Bug fixes

- **deps**: update dependency uuid to v9 (#566) (5e12991)
- **deps**: update dependency mathjs to v11 (#519) (7924456)
- **deps**: update dependency @vueuse/router to v10 (#516) (ea0f27c)
- **copy**: prevent shorthand copy if source is present in useCopy (#559) (86e964a)
- **c-lib**: hide component library shortcut link in non-dev (#557) (56d74d0)
- **emoji picker**: fix copy button (#556) (e5d0ba7)
- **deps**: update dependency @vueuse/head to v1 (#515) (d12dd40)
- **deps**: update dependency country-code-lookup to ^0.1.0 (#493) (8c72e69)
- **deps**: update dependency @vueuse/head to ^0.9.0 (#492) (cec9dea)
- **i18n**: fallback for demo i18n (12d9e5d)
- **typos**: fixed more typos & uppercase JSON (#475) (9526ed8)
- **about**: typos and wording (#474) (7068610)
- **mime-types**: typos (#470) (c4cec9e)
- **sonar**: took down minor sonar warning (4cbd7ac)
- **readme**: typo (105b21b)
- **ipv4-range-expander**: calculate correct for ip addresses where the first octet is lower than 128 (#405) (8c92d56)
- **ipv4-converter**: removed readonly on input (7aed9c5)

### Refactoring

- **navbar**: consistent spacing in navbar buttons (#507) (30f88fc)
- **ui**: remove n-text (#506) (72c98a3)
- **ui**: replaced some n-input to c-input (#505) (05ea545)
- **json-viewer**: input monospace font (#485) (9125dcf)
- **search**: command palette design (#463) (bcb98b3)
- **c-input-text**: force usage of props with default (1e2a35b)
- **naming**: prevent auto import conflicts for git memo (45c2474)
- **imports**: removed unnecessary imports to vue (fe61f0f)
- **ui**: removed all n-space (4d2b037)
- **ui**: replaced some n-input with c-input-text (f7fc779)

### Chores

- **deps**: update dependency vitest to ^0.34.0 (#562) (9bd4ad4)
- **deps**: update dependency node to v18.17.1 (#560) (65a9474)
- **deps**: update dependency unocss to ^0.55.0 (#561) (85cc7a8)
- **deps**: update dependency @unocss/eslint-config to ^0.55.0 (#553) (4268e25)
- **deps**: update dependency @intlify/unplugin-vue-i18n to ^0.12.0 (#526) (d1c8880)
- **deps**: update docker/login-action action to v2 (#512) (99bc84c)
- **deps**: update dependency jsdom to v22 (#499) (cd5a503)
- **deps**: update dependency @vitejs/plugin-vue-jsx to v3 (#497) (1a60236)
- **deps**: update dependency @vitejs/plugin-vue to v4 (#496) (a249421)
- **deps**: update dependency vite-plugin-pwa to ^0.16.0 (#488) (6498c9b)
- **deps**: update dependency vite to v4 (#503) (f40d7ec)
- **ci**: e2e against vercel deployement (#518) (2e28c50)
- **e2e**: execute e2e against built app (#511) (cf382b5)
- **deps**: update github/codeql-action action to v2 (#513) (0152583)
- **deps**: update node.js to v18 (#514) (38cb61d)
- **deps**: switched from vite-plugin-md to vite-plugin-vue-markdown (#510) (354aed6)
- **deps**: update dependency workbox-window to v7 (#509) (6b8682f)
- **deps**: update dependency vite-svg-loader to v4 (#508) (9e8349d)
- **deps**: update dependency typescript to ~4.9.0 (#481) (f440507)
- **deps**: update dependency vue-tsc to ^0.40.0 (#490) (b0d9a3e)
- **deps**: updated unplugin-auto-import (#504) (5c3bebf)
- **deps**: removed start-server-and-test dependency (8df7cd0)
- **deps**: update dependency c8 to v8 (#498) (6bda2ca)
- **deps**: update dependency @types/jsdom to v21 (#495) (994a1c3)
- **deps**: update node.js to v16.20.1 (#491) (05edaf4)
- **deps**: update dependency vitest to ^0.32.0 (#489) (49eacea)
- **deps**: update actions/checkout action to v3 (#494) (3f7d469)
- **deps**: update dependency unplugin-vue-components to ^0.25.0 (#484) (5f21908)
- **deps**: update dependency unplugin-auto-import to ^0.16.0 (#483) (6cb0845)
- **deps**: update dependency unocss to ^0.53.0 (#482) (38710dc)
- **deps**: update dependency @unocss/eslint-config to ^0.53.0 (#478) (282cfc4)
- **deps**: added renovate.json (#477) (363c2e4)
- **i18n**: tool scoped locales (#471) (1b038c7)
- **wysiwyg-editor**: update tiptap dependencies (732da08)
- **i18n**: setup i18n plugin config (ebfb872)
- **config**: netlify deployment support (#443) (93799af)
- **ci**: shard e2e tests (962a6d6)
- **lint**: switched to a better lint config (33c9b66)

### Refacor

- **transformers**: use monospace font for JSON and SQL text areas (#476) (ba4876d)

### Documentation

- **ide**: updated vscode extensions settings (#472) (847323c)

### Chors

- **deps**: updated vueuse dependency version (8515c24)

## Version 2023.05.14-77f2efc

### Features

- **list-converter**: a small converter who deals with column based data and do some stuff with it (#387) (83a7b3b)
- **new tool**: phone parser and normalizer (ce3150c)

### Bug fixes

- **phone-parser**: use default country code (a43c546)
- **home**: prevent weird blue border on card (3f6c8f0)

### Refactoring

- **ui**: replaced some n-input with c-input-text (77f2efc)

### Chores

- **issues**: updated new tool request issue template (edae4c6)

### Ui-lib

- **new-component**: added text input component in the c-lib (aad8d84)
- **button**: size variants (401f13f)

## Version 2023.04.23-92bd835

### Features

- **ui-lib**: demo pages for c-lib components (92bd835)
- **new-tool**: diff of two json objects (362f2fa)
- **ipv4-range-expander**: expands a given IPv4 start and end address to a valid IPv4 subnet (#366) (df989e2)
- **date converter**: auto focus main input (6d22025)

### Bug fixes

- **ts**: cleaned legacy typechecking warning (e88c1d5)
- **mac-address-lookup**: added copy handler on button click (c311e38)

### Refactoring

- **ui-lib**: prevent c-button to shrink (61ece23)
- **ui**: replaced naive ui cards with custom ones (f080933)
- **clean**: removed unused lodash import (bb32513)
- **clean**: removed useless br tags (74073f5)
- **ui**: getting ride of naive ui buttons (c45bce3)

## Version 2023.04.14-dbad773

### Features

- **new-tool**: http status codes (8355bd2)

### Refactoring

- **uuid-generator**: prevent NaN in quantity (6fb4994)

### Chores

- **release**: create a github release on new version (dbad773)
- **version**: reset CHANGELOG content to support new format (85cb0ff)

## Version 2023.04.14-f9b77b7

### Features

- **new-tool**: http status codes (8355bd2)

### Refactoring

- **uuid-generator**: prevent NaN in quantity (6fb4994)

### Chores

- **release**: create a github release on new version (f9b77b7)
- **version**: reset CHANGELOG content to support new format (85cb0ff)

## Version 2023.04.14-2f0d239

### Features

- **new-tool**: http status codes (8355bd2)

### Refactoring

- **uuid-generator**: prevent NaN in quantity (6fb4994)

### Chores

- **release**: create a github release on new version (2f0d239)
- **version**: reset CHANGELOG content to support new format (85cb0ff)

## Version 2023.04.14-474cae4

### Features

- **new-tool**: http status codes (8355bd2)

### Refactoring

- **uuid-generator**: prevent NaN in quantity (6fb4994)

### Chores

- **release**: create a github release on new version (474cae4)
- **version**: reset CHANGELOG content to support new format (85cb0ff)

## Version v2023.4.13-dce9ff9

_Diff not available_
