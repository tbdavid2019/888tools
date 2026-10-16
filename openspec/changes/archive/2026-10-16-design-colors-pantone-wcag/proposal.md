# Proposal

## Why

Users working in design, printing, and digital illustration require accurate color conversion, Pantone matching, and color palette discovery with high perceptual precision and strict visual accessibility. Previously:
1. The `find-color` tool had a critical accessibility bug where "快速複製色組" (Fast Copy Palette) used a pale yellow font (`#ecd9ac`) on a light card background (~1.2:1 contrast ratio), severely violating WCAG 2.1 AA/AAA contrast guidelines.
2. The palette library lacked 2000–2026 Pantone Color of the Year (COTY) sets and comprehensive color families.
3. The `color-converter` tool lacked pure client-side perceptual color matching (Delta E 2000) to find the closest Pantone color, and lacked integrated eyedropper tools (Screen EyeDropper and Canvas Screenshot Dropper with magnifier).
4. Both tools were dispersed across `editor` and `converter` categories instead of a dedicated "設計色彩" (Design & Colors) domain.

## What Changes

- **Fix WCAG Accessibility**: Reconstruct the "快速複製色組" button on `find-color` with high-contrast slate dark styling (`#0f172a` bg with `#ffffff` text, 19.5:1 contrast ratio) meeting WCAG AAA requirements.
- **Pantone COTY (2000–2026) & 7 Color Families**: Add full 2000–2026 Pantone Color of the Year palettes and 7 color families (Reds, Oranges, Yellows, Greens, Blues, Purples, Neutrals) with Light and Dark scheme support.
- **Search Optimization**: Add Chinese "潘通", "年度色", "流行色", and year search support to `find-color` and `color-converter`.
- **Pure Client-Side Delta E 2000 Matcher**: Implement CIEDE2000 algorithm and Pantone coated standard reference database in `color-converter` with split-swatch visual comparison, delta E perceptual rating badges, and one-click copy.
- **Screen & Screenshot Eyedropper**: Implement native `window.EyeDropper` API integration and a canvas screenshot dropper with clipboard paste (`Cmd+V` / `Ctrl+V`), drag-and-drop image upload, and an 8x pixel loupe.
- **Dedicated "設計色彩" Category**: Create the `design` category in `src/tools/index.ts` and update i18n locales across 9 languages.

## Capabilities

### New Capabilities
- `color-converter`: Client-side Delta E 2000 Pantone matching, Screen EyeDropper, and Canvas Screenshot Dropper with 8x loupe.
- `design-category`: Dedicated navigation and categorization for design and color tooling.

### Modified Capabilities
- `find-color`: High contrast WCAG AAA button, 2000–2026 Pantone COTY sets, 7 color families, and Chinese "潘通" keyword search.

## Impact

- `src/tools/find-color/`: Updated UI, contrast, search logic, and `palettes.ts`.
- `src/tools/color-converter/`: Added `delta-e-2000.ts`, `pantone-database.ts`, and updated `color-converter.vue`.
- `src/tools/index.ts`: Added `design` category and re-routed tools.
- `locales/*.yml`: Added translations for design category and new feature strings across 9 locales.
