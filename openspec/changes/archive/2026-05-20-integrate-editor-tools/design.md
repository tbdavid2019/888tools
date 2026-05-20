## Context

The user wants to establish a new category `"編輯區"` (Editor Area) for editing-related tools and add two new utilities:
1. **2026 流行色：數位色票庫 (`find-color`)**: A curated database of Pantone/Pinterest 2026 color schemes with Light/Dark options, interactive swatches, and a mock site preview.
2. **社群貼文排版 (`post-writer`)**: A specialized editor for post styling (Magazine and Broetry rules), platform validation, and preview cards.

## Goals / Non-Goals

**Goals:**
- Set up a new `'Editor'` category and move the existing `html-wysiwyg-editor` into it.
- Implement `find-color` with interactive overlapping circular color elements (using absolute position offsets and responsive sizes) and a contained mockup site preview.
- Implement `post-writer` with text processing pipelines (Regex replacement for punctuation, space corrections, Broetry double spacing on commas, and bracket headers) and mock previews for Facebook, Instagram, and Threads.

**Non-Goals:**
- Server-side persistence or storage of customized colors and posts.
- Global document-level variable updates (the application of color palettes is strictly isolated to the mockup landing page container to prevent breaking `it-tools` accessibility).

## Decisions

### 1. Isolated Preview Styles
- **Approach**: The mockup website preview will be built as a local sub-component styled with CSS Custom Properties bound via Vue inline `:style`.
- **Alternatives**: Modifying the document root variables (`:root`) was considered but rejected because changing it-tools global styles dynamically leads to high visual discrepancy and breaks dark mode theme consistency.

### 2. Client-Side Text Engine
- **Approach**: All styling transformations (Broetry breaks, full-width punctuation conversion, and emoji modifications) will be done using pure JavaScript string helpers and reactive Computed properties.
- **Alternatives**: Using full AST tokenization. We opted for sequential regex matching since the patterns are deterministic and highly linear.

## Risks / Trade-offs

- **Risk**: Clipboard Copying Failures.
  - **Mitigation**: Implement a standard copy fallback mechanism using a hidden text input if `navigator.clipboard` is blocked.
