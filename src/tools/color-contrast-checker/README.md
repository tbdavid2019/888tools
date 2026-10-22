# WCAG 色彩對比檢測器 (Color Contrast Checker)

[![WCAG 2.1 AA/AAA Compliant](https://img.shields.io/badge/WCAG%202.1-AA%20%2F%20AAA-success)](#)
[![TypeScript 0 Errors](https://img.shields.io/badge/TypeScript-0%20errors-blue)](#)
[![Vitest 100% Passed](https://img.shields.io/badge/Tests-28%20Passed-brightgreen)](#)

> 線上體驗網址：**[https://tool.david888.com/color-contrast-checker](https://tool.david888.com/color-contrast-checker)**  
> 分類路徑：**設計色彩 (`design`)**

基於 **W3C WCAG 2.1 (Web Content Accessibility Guidelines)** 規範打造的現代化無障礙色彩對比檢測工具。提供 100% 純前端、毫秒級的色彩對比度計算、五大合規指標判讀、HSL / RGB 雙模式滑桿微調、智慧無障礙建議色（Auto-Fix）、常用色票組持久化儲存，以及所見即所得的可編輯排版與 UI 元件預覽。

---

## 核心功能特色

### 1. 嚴格遵守 WCAG 2.1 標準之五大指標判定
修正了開源專案中常見的 `>` 臨界值錯誤，嚴格遵循 W3C 官方 `>=` 門檻並杜絕假陽性（False Positive）四捨五入進位：
- **AA Large (大字體)**：對比度 $\ge 3.0:1$（適用於 18pt / 24px 以上文字，或 14pt / 18.66px 以上粗體字）。
- **AA Normal (一般文字)**：對比度 $\ge 4.5:1$（適用於 16px / 1rem 一般內文之基本無障礙門檻）。
- **AAA Large (大字體進階)**：對比度 $\ge 4.5:1$（適用於大字體的高標準對比要求）。
- **AAA Normal (一般文字進階)**：對比度 $\ge 7.0:1$（適用於一般內文之最高標準對比要求）。
- **UI Components & Icons (非文字元件)**：對比度 $\ge 3.0:1$（依據 WCAG 2.1 SC 1.4.11 規範，檢驗按鈕邊框、輸入框、圖示與狀態標籤的可視性）。

### 2. 即時主看板與智慧防護底襯 (`isPoorContrast`)
- **超大字等寬看板**：採用 `tabular-nums` 等寬字型排版，即時顯示 `X.XX : 1` 對比度數值與總體評級（`AAA`、`AA`、`AA Large`、`Fail`）。
- **前背景相對亮度 (Relative Luminance)**：顯示 4 位小數高精度的相對亮度數值（0.0000 ~ 1.0000）與 CSS 近似色名。
- **低對比安全底襯**：當前景色與背景色過於接近（對比度 $< 3.0:1$）時，主看板自動啟動高對比深色保護襯底，確保分數與檢核徽章在任何極端同色情況下皆 100% 可讀。

### 3. 雙欄 HSL / RGB 雙向即時控制器
- **多格式取色與貼上**：支援原生 `<input type="color">` 色盤、手動輸入 HEX 色碼、Chromium 螢幕吸管 API (`window.EyeDropper`)，並相容 3/4/6/8 碼 HEX 及 `rgb(...)` / `hsl(...)` 色碼貼上。
- **即時防抖與狀態同步**：鍵入過程中具備防抖保護，避免使用者輸入未完成色碼時被強制重置；修復 Naive UI `<n-input-number>` 清空送出 `null` 時的狀態防護（`safeChannel`），杜絕滑桿數值脫鉤。
- **HSL 色相彩虹軌道**：Hue（0–360°）、Saturation（0–100%）、Lightness（0–100%）視覺化微調。
- **RGB 三原色滑桿**：Red、Green、Blue（0–255）即時同步。

### 4. 智慧無障礙修正建議 (Smart Auto-Fix Suggestions)
當配色未通過 AA (4.5:1) 或 AAA (7.0:1) 時，系統自動保持原始色相（Hue）與飽和度（Saturation），透過步進演算法搜尋距離原色最近且能滿足目標對比度的最佳明度（Lightness）：
- **固定背景色 $\rightarrow$ 推薦最佳前景色**。
- **固定前景色 $\rightarrow$ 推薦最佳背景色**。
- 支援一鍵點擊快速套用；針對中明度基準色無法單色達成 AAA 的極端情境，提供清楚的 Empty State 引導提示。

### 5. 即時文字排版與 UI 元件預覽
- **大字體標題 (24px Bold)**：即時套用配色，支援點擊直接編輯文案。
- **一般內文段落 (16px Regular)**：即時套用配色，支援多行文字編輯與貼上測試。
- **UI 元件檢驗 (SC 1.4.11)**：提供實心按鈕、外框按鈕、狀態膠囊標籤與輸入框，方便設計師與工程師同時覆核介面互動狀態。

### 6. 常用色票組持久化與快捷操作
- **一鍵對調色彩 (`Reverse colours`)**：快速反轉前景與背景。
- **色票組儲存 (`Save colours`)**：使用 `@vueuse/core` 之 `useStorage` 持久化儲存於 `localStorage`，支援單顆刪除與重複儲存提示。
- **複製 CSS 變數**：一鍵輸出標準 `:root { --color-background; --color-foreground; ... }` 格式。
- **內建經典色票**：預設收錄 2md 經典配色（暖奶油配墨黑、深青海軍藍配番紅花黃、深邃夜藍配暖沙）與 IBM Blue 經典無障礙配色。

---

## 演算法與計算公式

### 1. 相對亮度 (Relative Luminance)
遵循 W3C WCAG 2.1 規範，首先將 sRGB 通道值轉為線性 RGB：
$$
C_{\text{linear}} = 
\begin{cases} 
\frac{C_{\text{srgb}}}{12.92} & \text{若 } C_{\text{srgb}} \le 0.04045 \\
\left( \frac{C_{\text{srgb}} + 0.055}{1.055} \right)^{2.4} & \text{若 } C_{\text{srgb}} > 0.04045
\end{cases}
$$
其中 $C_{\text{srgb}} = \frac{R, G, B}{255}$。相對亮度 $L$ 計算如下：
$$
L = 0.2126 \times R_{\text{linear}} + 0.7152 \times G_{\text{linear}} + 0.0722 \times B_{\text{linear}}
$$

### 2. 對比度 (Contrast Ratio)
$$
\text{Contrast Ratio} = \frac{L_1 + 0.05}{L_2 + 0.05}
$$
其中 $L_1$ 為較亮顏色的相對亮度，$L_2$ 為較暗顏色的相對亮度。數值範圍為 $1.00:1$（相同顏色）至 $21.00:1$（純黑對純白）。

---

## 模組檔案架構

```text
src/tools/color-contrast-checker/
├── index.ts                              # 工具定義、路由與關鍵字宣告
├── color-contrast-checker.models.ts       # 純函式運算核心 (WCAG 判定、亮度、Auto-Fix)
├── color-contrast-checker.models.test.ts  # Vitest 單元測試 (28 組測試案例)
├── color-contrast-checker.vue            # Vue 3 SFC 介面元件 (Impeccable 工藝設計)
└── README.md                             # 工具專屬說明文件
```

---

## 測試與驗證

```bash
# 執行單元測試
npx vitest run src/tools/color-contrast-checker/color-contrast-checker.models.test.ts

# TypeScript 型別校驗
npx vue-tsc --noEmit -p tsconfig.json

# 執行 Impeccable 靜態設計檢測
/Users/david/.gemini/config/skills/impeccable/scripts/impeccable detect --json src/tools/color-contrast-checker/color-contrast-checker.vue
```
