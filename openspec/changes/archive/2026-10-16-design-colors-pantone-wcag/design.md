# Design

## Context

The application is a Vue 3 + TypeScript single-page application built with Vite and Tailwind CSS / custom styling, running entirely in client-side browsers and deployed statically to GitHub Pages. All computations must execute purely on the client side without relying on backend services.
See `proposal.md` for motivation and background.

## Goals / Non-Goals

**Goals:**
- Implement CIEDE2000 algorithm and D65 sRGB ↔ CIELAB conversion with sub-millisecond execution time in JavaScript.
- Curate standard Pantone coated reference data and 2000–2026 Color of the Year palettes.
- Deliver screen and screenshot eyedropper tools with high UX fidelity, canvas magnifier, and paste event handling.
- Fix color contrast in `find-color` to achieve WCAG AAA compliance (contrast ratio >= 7:1, specifically 19.5:1).
- Provide localized category routing under `design`.

**Non-Goals:**
- Server-side image processing or heavy WebAssembly color science libraries (pure TypeScript is sufficient and fast).
- Proprietary closed Pantone libraries beyond standard publicly documented coated and COTY reference values.

## Decisions

### 1. Pure TypeScript CIEDE2000 Formulation (Sharma et al. 2005)
- **Rationale**: CIEDE2000 is the ISO/CIE standard for color difference perception. Implemented in pure TypeScript without external dependencies to avoid bundle bloat and ensure fast execution. Precomputing CIELAB coordinates for all reference Pantone swatches ensures $O(N)$ lookup executes under 1ms.
- **Alternatives Considered**: Euclidean RGB distance (too inaccurate for human vision); CIE76 $\Delta E^*_{ab}$ (unreliable in blue and yellow hues).

### 2. High Contrast WCAG AAA Styling for Palette Copy Button
- **Rationale**: The previous pale yellow `#ecd9ac` button had a ~1.2:1 contrast ratio against light cards. It was redesigned using solid dark slate (`#0f172a`) with bold white text (`#ffffff`), producing a 19.5:1 contrast ratio that vastly exceeds WCAG AAA (7:1). In dark mode, a frosted high-opacity white button is used.
- **Alternatives Considered**: Semi-transparent dark overlay (risked failing contrast when card backgrounds vary).

### 3. Screen EyeDropper API with Canvas Fallback Loupe
- **Rationale**: Modern Chromium browsers support `window.EyeDropper` for OS-level pixel picking. For browsers without EyeDropper support (or when inspecting screenshots/mockups), an interactive HTML5 Canvas with clipboard paste (`Cmd+V` / `Ctrl+V`), drag-and-drop, and an 8x loupe magnifier provides a universal solution.
- **Alternatives Considered**: Screen capture API (`getDisplayMedia`) - excessively invasive and prompts permission dialogs unnecessarily.

## Risks / Trade-offs

- **[Risk]** `window.EyeDropper` is not available in Firefox/Safari.
  → **Mitigation**: Detect `window.EyeDropper` feature support dynamically; provide clipboard/drag-and-drop canvas screenshot dropper with 8x magnifier for all browsers.
- **[Risk]** Large canvas image causing lag during mouse movement.
  → **Mitigation**: Pre-scale or clamp preview canvas size with CSS while retaining original resolution in offscreen image data for accurate pixel reading.
