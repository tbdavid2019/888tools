## Why

本變更旨在為 `it-tools` 平台引入「書籍 (Books)」分類，並集成瀏覽器端「TXT 轉 EPUB」與「EPUB 編輯器（簡轉繁）」兩款工具。
同時，為了解決現有簡繁轉換工具（同文堂 `tongwen-converter`）在專有名詞與詞彙對照上的精準度問題，將轉換引擎升級為更標準、更強大的 `opencc-js`。

## What Changes

- **新增「書籍 (Books)」分類**：在工具側邊欄及首頁新增獨立的「書籍」分類與對應圖示。
- **新增「TXT 轉 EPUB」工具**：支援瀏覽器本機的 TXT 檔案分析、元資料與章節自動偵測、直排/橫排設定、自訂封面，以及利用 `fonteditor-core` 對中文字型進行「滿血版子集化 (Font Subsetting)」嵌入，動態產出輕量化 EPUB 檔。
- **新增「EPUB 編輯器」工具**：支援上傳現有的 `.epub` 檔案，透過 `JSZip` 讀取並偵測文字編碼後，進行整本電子書的簡繁轉換與版面重整，並重新打包下載。
- **升級簡繁轉換引擎**：將專案現有的 `tongwen-converter` 更換為基於 `opencc-js` 的轉換實作，以提升日常詞彙與繁簡轉換的精準度。

## Capabilities

### New Capabilities
- `epub-tools`: 包含 TXT 轉 EPUB 製作工具與 EPUB 簡繁編輯工具，並支援本機端字型子集化嵌入。

### Modified Capabilities
- `tongwen-converter`: 將原本使用同文堂對照表的簡繁轉換工具改為使用 `opencc-js` 轉換引擎，提升翻譯準確性，但維持原有的 UI 行為。

## Impact

- **新增相依套件**：引入 `opencc-js` (簡繁轉換) 與 `fonteditor-core` (字型子集化)。
- **字型資源檔**：於 `public/fonts` 放置數個高畫質中文字型（如思源黑體、思源宋體、開源注音體等），供子集化功能讀取。
- **UI 更新**：影響 `src/tools/index.ts` 以新增分類與工具註冊，並更新原有 `tongwen-converter` 元件所引用的服務邏輯。
