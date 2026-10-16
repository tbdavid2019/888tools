# Tasks

## 1. Design Category and Routing

- [x] 1.1 Add `design` category to `src/tools/index.ts` and route `find-color` and `color-converter` under it.
- [x] 1.2 Update all 9 localization files (`locales/*.yml`) with `design` category title and tool descriptions.

## 2. WCAG Contrast Fix and Palette Library Expansion

- [x] 2.1 Reconstruct `find-color` "快速複製色組" button style with high-contrast slate background and pure white text (WCAG AAA compliant).
- [x] 2.2 Add 2000–2026 Pantone Color of the Year palettes with light and dark theme configurations to `src/tools/find-color/palettes.ts`.
- [x] 2.3 Add 7 Color Families (Reds, Oranges, Yellows, Greens, Blues, Purples, Neutrals) inspired by colors-converter to `palettes.ts`.
- [x] 2.4 Add category filter bar and Chinese "潘通" / year search support in `find-color.vue`.

## 3. Pure Client-Side Delta E 2000 & Pantone Matching

- [x] 3.1 Implement CIEDE2000 algorithm and sRGB ↔ CIELAB / CMYK ↔ RGB math in `src/tools/color-converter/delta-e-2000.ts`.
- [x] 3.2 Build curated Pantone coated and COTY reference database with precomputed Lab values in `src/tools/color-converter/pantone-database.ts`.
- [x] 3.3 Add live Split Swatch comparison (input vs Pantone) with Delta E rating badge and quick-actions in `color-converter.vue`.

## 4. Eyedropper Tools & Canvas Magnifier

- [x] 4.1 Integrate native `window.EyeDropper` API with fallback checks in `color-converter.vue`.
- [x] 4.2 Build screenshot dropzone supporting file upload, drag-and-drop, and `Cmd+V` / `Ctrl+V` clipboard paste.
- [x] 4.3 Implement HTML5 Canvas interactive pixel picking with 8x magnifier loupe.

## 5. Review & Changelog

- [x] 5.1 Perform OpenSpec spec synchronization and verification.
- [x] 5.2 Perform Codex-standard code review across accessibility, type safety, performance, and UI polish.
- [x] 5.3 Update `CHANGELOG.md` with new version details.
