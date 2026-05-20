## Why

Introduce an editorial workspace for text formatting, visual color palette discovery (Pantone & Pinterest 2026), and WYSIWYG editing, grouped under a single "編輯區" (Editor Area) category to improve organizational hierarchy and tool discoverability.

## What Changes

- Add new "Editor" category under `src/tools/index.ts` and localize as `"編輯區"` in `locales/*`.
- Relocate the existing `html-wysiwyg-editor` tool to the new "Editor" category.
- Implement a new tool `find-color` (2026 流行色：數位色票庫) under the "Editor" category.
- Implement a new tool `post-writer` (社群貼文排版) under the "Editor" category.

## Capabilities

### New Capabilities
- `editor-category`: Establish a dedicated Editor category for workspace and content editing tools.
- `find-color`: A visual database of 2026 Pantone/Pinterest color palettes with an interactive Mock Site preview.
- `post-writer`: Client-side text processor for social post formatting (magazine alignment and Broetry formatting) with platform limits preview.

### Modified Capabilities
<!-- No modified capabilities -->

## Impact

- `src/tools/index.ts` category mappings and component lists.
- `locales/en.yml`, `locales/zh-TW.yml`, and `locales/zh.yml` locale dictionaries.
- Adds new standalone tool directories under `src/tools/find-color/` and `src/tools/post-writer/`.
