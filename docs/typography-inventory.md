# 介面字級盤點

盤點日期：2026-10-27

盤點範圍：`src/` 內 Vue、CSS/LESS，以及 Naive UI 主題字級設定。此文件保留字級 token 合併前的基線，供核對各檔案的遷移結果。

## 摘要

- 92 個來源檔包含字體相關設定（字級、字重、行高、字體家族或 utility class）。
- 50 個檔案包含明確的 `font-size`/`fontSize` 設定，共 327 筆宣告、84 種原始值。這些值包含固定尺寸、`rem`/`em`、`clamp()`、繼承值和動態綁定，84 種原始值不等於 84 個實際字級。
- UnoCSS 字級 utility 有 265 次使用，分成 7 種 class。
- Impeccable type detector 回傳空清單 `[]`；人工盤點仍找到大量跨頁字級分散與極小文字。

## 核心發現

1. **字級來源分散。** 全域 `html`/`body` 設為 `16.5px`；Naive UI 主題另定義 `13/14/15/16.5/18/20px`；UnoCSS `text-base` 是 `16px`；工具頁再直接使用 `11–72px`、多種 `rem`，以及各自的 responsive `clamp()`。重複角色沒有共同 token，造成相近但不同的尺寸並存。
2. **工具頁的細節差異最多。** `color-converter` 有 37 筆字級宣告、`find-color` 有 28 筆、`color-contrast-checker` 有 29 筆。前兩頁大量使用 `.65–1.2rem` 間隔細碎的值；以根字級 16.5px 換算，`.68rem=11.22px`、`.72rem=11.88px`、`.74rem=12.21px`、`.76rem=12.54px`、`.82rem=13.53px`、`.84rem=13.86px`、`.86rem=14.19px`、`.88rem=14.52px`。它們視覺上幾乎是連續字級，卻由不同工具各自指定。
3. **截圖頁面確實混用多種小字。** WCAG 對比頁包含 `11px`、`12px`、`13px`、`14px`、`15px`、`16px`、`18px`、`24px`、`42px`、`72px` 等。`72px` 的 Aa 樣本與 `42px` 對比分數是展示用途；徽章說明與狀態文字落在 `11px`，色票及資訊文字常用 `12–13px`，在主體 `16.5px` 旁顯得偏小。主要位置見 [color-contrast-checker.vue](../src/tools/color-contrast-checker/color-contrast-checker.vue#L1330)、[徽章文字](../src/tools/color-contrast-checker/color-contrast-checker.vue#L1462)、[色票文字](../src/tools/color-contrast-checker/color-contrast-checker.vue#L1507)。
4. **rem、px 與 utility 尺度有微小錯位。** UnoCSS `text-xs/sm/base/lg/xl/2xl/3xl` 分別對應 `12/14/16/18/20/24/30px`，全域主體是 `16.5px`；頁面自訂值又有 `13px`、`15px`、`.95rem`（約 `15.68px`）、`1.02rem`（約 `16.83px`）等。這造成同類標籤在不同工具中出現一到數個像素的差距。
5. **全域字體註冊的字重範圍不一致。** [App.vue](../src/App.vue#L60) 註冊 Maple Mono `100–900`，JetBrains Mono 與 Gen Jyuu Gothic 各只註冊 `500`；全域文字堆疊以 JetBrains Mono 優先。介面多處使用 `600–800`，對字體回退與字重合成的依賴提高，可能讓中英文與粗體的視覺重量不一致。
6. **獨立編輯器與輸出預覽要分開看。** EPUB 預覽、PDF/OCR 預覽、資料去識別工具，以及時鐘/倒數工具有依文件原始大小、使用者選項或數字展示而變動的字級。這類變動屬工具內容或展示功能，不能直接套用一般介面文字角色。

## 導入後的共用 token

一般介面樣式已遷移至 [App.vue](../src/App.vue#L61) 的用途型 token，根字級使用瀏覽器預設值：

| Token | 尺寸 | 用途 |
|---|---:|---|
| `--type-page-title` | `clamp(2rem, 3.2vw, 2.25rem)` | 頁面標題 |
| `--type-section-title` | `1.5rem` / 24px | 區塊標題 |
| `--type-card-title` | `1.25rem` / 20px | 卡片標題 |
| `--type-subheading` | `1.125rem` / 18px | 次標題 |
| `--type-body` | `1rem` / 16px | 正文與一般輸入 |
| `--type-control` | `0.9375rem` / 15px | 控制項文字 |
| `--type-label` | `0.875rem` / 14px | 標籤與按鈕 |
| `--type-meta` | `0.8125rem` / 13px | 輔助資訊 |
| `--type-caption` | `0.75rem` / 12px | 緊湊註記 |
| `--type-metric-compact`, `--type-metric`, `--type-metric-strong`, `--type-display` | `28/36/42/72px` | 數值與 WCAG 樣本 |

UnoCSS `text-*` 與 Naive UI 主題已對應相同 token；時鐘保留響應式展示層級，並使用 `rem` 作為 clamp 邊界。EPUB/PDF 的文件內容沿用來源或使用者設定字級。

## 全域基準與元件主題

| 範圍 | 現行設定 | 位置 |
|---|---|---|
| 全站根字級 | `html`、`body` 各自指定 `16.5px`；`body` 行高 `1.6` | [App.vue](../src/App.vue#L85) |
| Naive UI 基礎 | `13/14/15/16.5/18/20px`；行高 `1.65`，light/dark 重複定義 | [themes.ts](../src/themes.ts#L6) |
| UnoCSS | `text-xs=12`、`sm=14`、`base=16`、`lg=18`、`xl=20`、`2xl=24`、`3xl=30px` | [unocss.config.ts](../unocss.config.ts) 使用 `presetUno()` |
| 工具標題 | 桌面 `2.2rem`（根字級下約 `36.3px`），700px 以下 `32px` | [tool.layout.vue](../src/layouts/tool.layout.vue#L180) |
| 建議區標題 | 桌面 `1.75rem`（約 `28.9px`），行動版 `22px`；說明 `1.05rem`（約 `17.3px`） | [tool.layout.vue](../src/layouts/tool.layout.vue#L212) |
| 按鈕元件 | small/medium/large 為 `14/16.5/18px` | [c-button.theme.ts](../src/ui/c-button/c-button.theme.ts#L31) |
| 選單元件 | small/medium/large 為 `12/14/16px` | [c-select.theme.ts](../src/ui/c-select/c-select.theme.ts#L5) |

## UnoCSS utility 使用量

| Class | 次數 | 預設字級 |
|---|---:|---:|
| `text-xs` | 142 | 12px |
| `text-sm` | 66 | 14px |
| `text-base` | 18 | 16px |
| `text-lg` | 26 | 18px |
| `text-xl` | 5 | 20px |
| `text-2xl` | 5 | 24px |
| `text-3xl` | 3 | 30px |
## 明確字級宣告逐檔清單

下列每筆皆標示源檔位置與原始 CSS/主題值。相同數值仍保留全部行號，方便追到具體元件；`v-bind` 與 `clamp()` 保留其動態寫法。

| 檔案 | 字級宣告（值與行號） |
|---|---|
| [`src/App.vue`](../src/App.vue#L92) | `16.5px` (L92); `16.5px` (L103) |
| [`src/components/AppearanceSettings.vue`](../src/components/AppearanceSettings.vue#L59) | `14px` (L59); `15px` (L89); `14px` (L94); `12px` (L120) |
| [`src/components/CollapsibleToolMenu.vue`](../src/components/CollapsibleToolMenu.vue#L170) | `16px` (L170); `1.15rem` (L182); `0.88rem` (L188); `1.05rem` (L222); `1.05rem` (L238) |
| [`src/components/MenuIconItem.vue`](../src/components/MenuIconItem.vue#L29) | `10px` (L29) |
| [`src/components/PwaUpdatePrompt.vue`](../src/components/PwaUpdatePrompt.vue#L133) | `16px` (L133); `13px` (L134) |
| [`src/components/ToolCard.vue`](../src/components/ToolCard.vue#L55) | `0.85rem` (L55); `1.85rem` (L65); `1.02rem` (L71); `1.5rem` (L81); `0.98rem` (L85) |
| [`src/layouts/base.layout.vue`](../src/layouts/base.layout.vue#L265) | `1.05rem` (L265); `0.95rem` (L311); `15px` (L337) |
| [`src/layouts/tool.layout.vue`](../src/layouts/tool.layout.vue#L182) | `2.2rem` (L182); `1.75rem` (L215); `1.05rem` (L223); `0.95rem` (L234); `32px` (L268); `22px` (L287) |
| [`src/modules/command-palette/command-palette.vue`](../src/modules/command-palette/command-palette.vue#L188) | `18px` (L188) |
| [`src/modules/i18n/components/locale-selector.vue`](../src/modules/i18n/components/locale-selector.vue#L59) | `12px` (L59) |
| [`src/pages/Home.page.vue`](../src/pages/Home.page.vue#L216) | `1.35rem` (L216); `0.95rem` (L234) |
| [`src/themes.ts`](../src/themes.ts#L9) | `16.5px` (L9); `16.5px` (L51); `16.5px` (L117); `16.5px` (L140); `16.5px` (L192); `16.5px` (L231) |
| [`src/tools/barcode-scanner/barcode-scanner.vue`](../src/tools/barcode-scanner/barcode-scanner.vue#L279) | `12px` (L279); `1.1em` (L291); `0.85em` (L299) |
| [`src/tools/basic-auth-generator/basic-auth-generator.vue`](../src/tools/basic-auth-generator/basic-auth-generator.vue#L43) | `17px !important` (L43) |
| [`src/tools/cat-age-calculator/cat-age-calculator.vue`](../src/tools/cat-age-calculator/cat-age-calculator.vue#L118) | `28px` (L118); `14px` (L127) |
| [`src/tools/chmod-calculator/chmod-calculator.vue`](../src/tools/chmod-calculator/chmod-calculator.vue#L72) | `50px` (L72) |
| [`src/tools/chronometer/chronometer.vue`](../src/tools/chronometer/chronometer.vue#L58) | `44px` (L58) |
| [`src/tools/color-contrast-checker/color-contrast-checker.vue`](../src/tools/color-contrast-checker/color-contrast-checker.vue#L1279) | `13px` (L1279); `72px` (L1331); `42px` (L1351); `13px` (L1373); `12px` (L1395); `13px` (L1463); `11px` (L1468); `11px` (L1483); `13px` (L1515); `12px` (L1550); `11px` (L1554); `16px` (L1623); `13px` (L1681); `18px` (L1743); `13px` (L1749); `15px` (L1792); `13px` (L1798); `13px` (L1831); `16px` (L1853); `14px` (L1866); `11px` (L1870); `12px` (L1906); `11px` (L1916); `24px` (L1937); `16px` (L1949); `14px` (L1972); `14px` (L1992); `13px` (L2008); `13px` (L2023) |
| [`src/tools/color-converter/color-converter.vue`](../src/tools/color-converter/color-converter.vue#L857) | `0.72rem` (L857); `1.2rem` (L875); `0.82rem` (L885); `1.05rem` (L934); `0.82rem` (L939); `0.82rem` (L965); `0.95rem` (L1004); `0.82rem` (L1008); `0.85rem` (L1019); `0.76rem` (L1076); `0.68rem` (L1082); `0.65rem` (L1087); `0.82rem` (L1107); `0.76rem` (L1143); `1.05rem` (L1163); `0.8rem` (L1174); `0.76rem` (L1216); `0.9rem` (L1225); `1.15rem` (L1252); `1.05rem` (L1263); `1.1rem` (L1278); `0.72rem` (L1284); `0.82rem` (L1289); `0.75rem` (L1306); `0.88rem` (L1363); `0.76rem` (L1424); `0.72rem` (L1432); `0.68rem` (L1448); `0.8rem` (L1511); `0.8rem` (L1516); `0.75rem` (L1527); `0.82rem` (L1557); `0.75rem` (L1604); `0.68rem` (L1652); `0.78rem` (L1659); `1rem` (L1664); `0.76rem` (L1669) |
| [`src/tools/countdown-timer/countdown-timer.vue`](../src/tools/countdown-timer/countdown-timer.vue#L120) | `22px` (L120); `12px` (L140); `24px` (L146); `24px` (L151); `36px` (L159) |
| [`src/tools/crontab-generator/crontab-generator.vue`](../src/tools/crontab-generator/crontab-generator.vue#L177) | `30px` (L177); `22px` (L185) |
| [`src/tools/csv-excel-viewer/csv-excel-viewer.vue`](../src/tools/csv-excel-viewer/csv-excel-viewer.vue#L577) | `20px` (L577); `14px` (L584); `12px` (L596); `18px` (L628); `18px` (L657); `12px` (L675); `13px` (L716); `12px` (L754); `13px` (L785); `12px` (L863); `13px` (L877) |
| [`src/tools/data-deidentification/styles.css`](../src/tools/data-deidentification/styles.css#L74) | `15px` (L74); `1.25rem` (L86); `1.15rem` (L87); `1rem` (L88); `0.85em` (L89); `0.85rem` (L91); `0.95rem` (L104); `0.9rem` (L119); `0.8rem` (L140); `0.85rem` (L184); `0.9em` (L217); `0.75rem` (L240); `0.72rem` (L266); `0.85rem` (L278); `0.85rem` (L288); `0.9rem` (L294); `0.8rem` (L297); `0.85rem` (L298); `0.9rem` (L301); `0.8rem` (L310); `0.85rem` (L317); `0.9rem` (L334); `0.8rem` (L342); `0.8rem` (L345); `0.85rem` (L351); `1.45em` (L361); `1.1em` (L362); `0.92em` (L363); `0.9em` (L366); `0.75rem` (L368); `0.85rem` (L371); `0.85rem` (L374); `0.75rem` (L380); `0.88rem` (L402); `1rem` (L404); `0.92rem` (L413); `0.88rem` (L433); `0.95rem` (L451); `1.25rem` (L462); `1.05rem` (L463); `0.9rem` (L467); `0.8rem` (L469); `1rem` (L486); `1.1rem` (L497); `0.85rem` (L556); `0.9rem` (L565); `0.9rem` (L570); `0.9rem` (L575); `0.9rem` (L586); `1.1rem` (L622); `11px` (L650); `0.9rem` (L670) |
| [`src/tools/device-information/device-information.vue`](../src/tools/device-information/device-information.vue#L88) | `14px` (L88); `20px` (L94) |
| [`src/tools/dog-age-calculator/dog-age-calculator.vue`](../src/tools/dog-age-calculator/dog-age-calculator.vue#L102) | `28px` (L102); `14px` (L111) |
| [`src/tools/epub-editor/epub-editor.vue`](../src/tools/epub-editor/epub-editor.vue#L2122) | `1.05em` (L2122); `1.6em` (L2131) |
| [`src/tools/fancy-text-generator/fancy-text-generator.vue`](../src/tools/fancy-text-generator/fancy-text-generator.vue#L258) | `20px` (L258); `18px` (L285) |
| [`src/tools/find-color/find-color.vue`](../src/tools/find-color/find-color.vue#L609) | `1.15rem` (L609); `0.85rem` (L619); `0.88rem` (L647); `1.08rem` (L712); `0.86rem` (L725); `0.8rem` (L736); `0.82rem` (L822); `0.76rem` (L833); `0.96rem` (L865); `0.84rem` (L875); `0.84rem` (L934); `0.84rem` (L945); `0.86rem` (L975); `0.74rem` (L985); `0.72rem` (L1101); `1rem` (L1113); `0.8rem` (L1123); `0.72rem` (L1167); `0.85rem` (L1187); `0.8rem` (L1201); `0.72rem` (L1211); `1.45rem` (L1222); `0.88rem` (L1230); `0.82rem` (L1246); `0.78rem` (L1282); `0.72rem` (L1289); `0.82rem` (L1345); `0.7rem` (L1351) |
| [`src/tools/html-wysiwyg-editor/editor/editor.vue`](../src/tools/html-wysiwyg-editor/editor/editor.vue#L70) | `85%` (L70); `0.8rem` (L83) |
| [`src/tools/lyric-player/lyric-player.vue`](../src/tools/lyric-player/lyric-player.vue#L631) | `16px` (L631); `13px` (L668); `13px` (L689); `13px` (L699) |
| [`src/tools/meeting-captions/meeting-captions.vue`](../src/tools/meeting-captions/meeting-captions.vue#L1405) | `12px` (L1405); `26px` (L1414); `13px` (L1429); `12px` (L1440); `13px` (L1556); `13px` (L1610); `19px` (L1625); `24px` (L1640); `42px` (L1646); `36px` (L1672); `14px` (L1695); `28px` (L1712); `28px` (L1804); `18px` (L1808) |
| [`src/tools/online-clock/FlipCard.vue`](../src/tools/online-clock/FlipCard.vue#L76) | `48px` (L76); `clamp(36px, 7vw, 64px)` (L77) |
| [`src/tools/online-clock/online-clock.vue`](../src/tools/online-clock/online-clock.vue#L1093) | `24px` (L1093); `13px` (L1110); `13px` (L1125); `18px` (L1157); `15px` (L1168); `14px` (L1174); `13px` (L1189); `72px` (L1215); `clamp(48px, 8vw, 96px)` (L1216); `20px` (L1256); `clamp(16px, 2.2vw, 24px)` (L1257); `18px` (L1264); `clamp(15px, 2vw, 22px)` (L1265); `14px` (L1272); `clamp(12px, 1.5vw, 16px)` (L1273); `150px` (L1310); `clamp(72px, 15vw, 220px)` (L1311); `110px` (L1319); `clamp(60px, 10vw, 180px)` (L1320); `46px` (L1388); `clamp(36px, 5vw, 50px)` (L1389); `24px` (L1445); `clamp(16px, 3vw, 32px)` (L1446); `44px` (L1470); `clamp(24px, 5vw, 64px)` (L1471); `0.65em` (L1506); `0.65em` (L1516); `80px` (L1528); `clamp(40px, 10vw, 120px)` (L1529); `14px` (L1559); `13px` (L1636); `14px` (L1643); `12px` (L1665); `14px` (L1676) |
| [`src/tools/otp-code-generator-and-validator/otp-code-generator-and-validator.vue`](../src/tools/otp-code-generator-and-validator/otp-code-generator-and-validator.vue#L143) | `20px` (L143) |
| [`src/tools/post-writer/post-writer.vue`](../src/tools/post-writer/post-writer.vue#L466) | `0.95rem` (L466); `0.85rem` (L514); `1.3rem` (L553); `0.95rem` (L563); `0.8rem` (L567); `0.95rem` (L572); `0.85rem` (L592); `1.1rem` (L616); `0.95rem` (L647); `0.95rem` (L653) |
| [`src/tools/qr-checker/qr-checker.vue`](../src/tools/qr-checker/qr-checker.vue#L259) | `12px` (L259) |
| [`src/tools/random-port-generator/random-port-generator.vue`](../src/tools/random-port-generator/random-port-generator.vue#L30) | `26px` (L30) |
| [`src/tools/remove-background/remove-background.vue`](../src/tools/remove-background/remove-background.vue#L277) | `12px` (L277); `12px` (L346) |
| [`src/tools/roman-numeral-converter/roman-numeral-converter.vue`](../src/tools/roman-numeral-converter/roman-numeral-converter.vue#L74) | `22px` (L74) |
| [`src/tools/svg-tools/svg-tools.vue`](../src/tools/svg-tools/svg-tools.vue#L205) | `1rem` (L205); `12px` (L221) |
| [`src/tools/tongwen-converter/tongwen-converter.vue`](../src/tools/tongwen-converter/tongwen-converter.vue#L359) | `1.05rem` (L359); `1.05rem` (L388); `14px` (L409); `14px` (L413); `16px` (L422); `1.05rem` (L472); `1.15rem` (L504); `1rem` (L514); `1.05rem` (L545); `1.05rem` (L552); `1.02rem` (L558) |
| [`src/tools/world-clock/world-clock.vue`](../src/tools/world-clock/world-clock.vue#L203) | `20px` (L203); `26px` (L226); `18px` (L256); `12px` (L262); `12px` (L270); `18px` (L281) |
| [`src/ui/c-alert/c-alert.vue`](../src/ui/c-alert/c-alert.vue#L32) | `inherit` (L32) |
| [`src/ui/c-button/c-button.theme.ts`](../src/ui/c-button/c-button.theme.ts#L35) | `14px` (L35); `16.5px` (L39); `18px` (L43) |
| [`src/ui/c-button/c-button.vue`](../src/ui/c-button/c-button.vue#L71) | `v-bind('size.fontSize')` (L71) |
| [`src/ui/c-card/c-card.vue`](../src/ui/c-card/c-card.vue#L38) | `1.02rem` (L38); `1.45rem` (L45) |
| [`src/ui/c-input-text/c-input-text.vue`](../src/ui/c-input-text/c-input-text.vue#L243) | `1.05rem` (L243); `1.05rem` (L278); `1.05rem` (L284); `1.02rem` (L301); `1.02rem` (L306) |
| [`src/ui/c-link/c-link.vue`](../src/ui/c-link/c-link.vue#L34) | `inherit` (L34) |
| [`src/ui/c-select/c-select.theme.ts`](../src/ui/c-select/c-select.theme.ts#L8) | `12px` (L8); `14px` (L12); `16px` (L16) |
| [`src/ui/c-select/c-select.vue`](../src/ui/c-select/c-select.vue#L212) | `v-bind('size.fontSize')` (L212); `inherit` (L227) |
## 變動字級與不同用途

- 共用按鈕與選單字級來自主題尺寸物件，需與 Naive UI 的主題尺度一併維護：`src/ui/c-button/c-button.theme.ts`、`src/ui/c-select/c-select.theme.ts`。
- EPUB 編輯器以使用者選取的閱讀字級生成預覽與 EPUB CSS：`src/tools/epub-editor/style-generator.ts`、`src/tools/epub-editor/epub-editor.vue`。
- PDF/OCR 去識別預覽按來源 PDF 的文字尺寸並乘上縮放係數，屬文件忠實呈現：`src/tools/data-deidentification/ui/preview.ts`。
- `src/tools/data-deidentification/styles.css` 有獨立容器字體（系統 sans-serif，`15px` 根字級）；這個工具內嵌介面不沿用全站 Maple/JetBrains Mono 字體堆疊。
- `online-clock`、`meeting-captions`、`countdown-timer` 等工具有大型數字、字幕與響應式展示字級，屬內容角色；統一時應保留具名展示角色。

## 建議整理方式

建立少量依用途命名的字級 token（頁面標題、區塊標題、本文、控制項、輔助文字、資料/代碼、展示數字），以單一尺度供全域主題與工具頁共用。先收斂 `color-converter`、`find-color` 與 WCAG 對比頁這三個細節最多的頁面，再批次遷移其他工具；保留時鐘、文件預覽與 WCAG 樣本等明確需要的展示/內容字級。
