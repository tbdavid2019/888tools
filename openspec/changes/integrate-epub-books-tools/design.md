## Context

本項目需要在現有 `it-tools` 專案（基於 Vue 3, Vite, TypeScript, UnoCSS）中整合來自 `HelloRuru/tools` 的 EPUB 相關工具，並依使用者要求進行簡繁轉換引擎的升級與字型子集化（滿血版）的整合。

目前專案的簡繁轉換工具使用 `tongwen-converter`（基於同文堂字典的 naive 字串替換），本次修改將全面把此引擎及新增的書籍轉換功能替換為 `opencc-js`。

## Goals / Non-Goals

**Goals:**
- 在工具首頁與側邊欄新增「書籍 (Books)」分類。
- 移植並整合「TXT 轉 EPUB」工具（包含元資料偵測、章節切分、自訂排版設定與封面）。
- 移植並整合「EPUB 編輯器」工具（包含 EPUB ZIP 解壓、編碼偵測、簡繁轉換與重打包）。
- 將簡繁轉換引擎（包括現有的 `tongwen-converter`）統一遷移至 `opencc-js`，支援 `s2t`（簡轉繁-台灣/香港常用詞彙）與 `t2s`（繁轉簡）。
- 保留「滿血版」字型子集化功能：在瀏覽器本機端下載大型中文字型檔，並使用 `fonteditor-core` 對電子書內容進行字型裁剪後嵌入。

**Non-Goals:**
- 不實作線上的 EPUB 閱讀器/渲染器（僅負責檔案的生成與編輯轉換，閱讀由使用者外接閱讀器完成）。
- 不引入 `file-saver` 庫，改為使用原生 Web API（`URL.createObjectURL`）實現檔案下載以精簡打包體積。

## Decisions

### 1. 簡繁轉換引擎遷移至 `opencc-js`
* **決策**：棄用原本的同文堂轉換庫，在 `package.json` 引入 `opencc-js`。
* **原因**：OpenCC-JS 具備更健全的字詞對照表與地區詞彙替換能力（例如將簡體字「軟體」翻譯成繁體時，能根據上下文自動處理為台灣慣用的「軟體」，而不是直譯為「軟件」）。
* **替代方案**：保留同文堂。但同文堂字典較舊，且無法進行精準的片語/詞彙語境轉換，故排除。

### 2. 瀏覽器端字型子集化 (Font Subsetting)
* **決策**：在 `package.json` 引入 `fonteditor-core`。將開源的中文字型檔放置於專案的 `public/fonts/` 目錄下。
* **原因**：使用者要求「滿血版本」子集化。中文小說通常使用約 3,000~6,000 個常用字，而全字型檔包含數萬字。透過 `fonteditor-core` 讀取 `public/fonts/` 的字型，並根據小說中出現的所有不重複字元產生子集字型檔並打包進 EPUB，可使生成出來的 EPUB 檔案大小由 15MB 降至 200KB 左右，同時保證在任何閱讀器上皆能顯示指定的精美中文字型。

### 3. 使用專案原生 UI 元件重構 UI
* **決策**：不直接使用 React JSX 元件，而是依據 `it-tools` 規格重新編寫為 Vue 3 SFC (`.vue`)，並引用專案的 `c-card`, `c-file-upload`, `c-select`, `c-input-text`, `c-button` 等 `c-` 元件。
* **原因**：保持專案風格一致性，並能直接享用 `it-tools` 已配置好的 UnoCSS 主題色系與響應式排版支援。

### 4. 使用 Web API 代替 `file-saver`
* **決策**：使用原生下載輔助函數。
  ```typescript
  export function downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  ```
* **原因**：無需引入額外相依套件，且能百分之百在主流現代瀏覽器中正常運作。

## Risks / Trade-offs

* **[Risk] 大檔案轉換時的記憶體與效能問題**：
  * 當使用者上傳極大字數（如數百萬字）的小說時，字型子集化與 ZIP 壓縮會暫時消耗較多記憶體，可能導致瀏覽器分頁當機。
  * **Mitigation**：沿用原作者的「大容量拆冊建議」。當字數大於 50 萬字或章節大於 500 章時，在匯出步驟提示使用者進行分卷（分冊）匯出。
* **[Risk] 字型檔下載的網路延遲**：
  * 初次使用字型子集化時，瀏覽器需要下載放置於 `public/fonts/` 的 10-15MB 原始字型檔。
  * **Mitigation**：在 UI 上提供明確的下載/載入進度條。並且利用瀏覽器的 Cache API 或 Service Worker 機制，確保字型下載過一次後，後續使用能直接從本機快取讀取。
