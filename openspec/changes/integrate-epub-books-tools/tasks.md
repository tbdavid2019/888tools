## 1. Setup and Dependencies

- [x] 1.1 Add `opencc-js` and `fonteditor-core` to `package.json` dependencies and install them.
- [x] 1.2 Place the base Chinese font files (such as Noto Sans TC, Noto Serif TC) under the `public/fonts/` directory.

## 2. Shared Utilities Implementation

- [x] 2.1 Implement `opencc.service.ts` to wrap `opencc-js` translation logic.
- [x] 2.2 Update the existing `tongwen-converter.vue` (and `tongwen-converter.service.ts`) to use the new `opencc.service.ts` translation engine.
- [x] 2.3 Port `chapterDetector.js` to `chapterDetector.ts`.
- [x] 2.4 Port `epubGenerator.js` to `epubGenerator.ts` utilizing `jszip`.
- [x] 2.5 Port `fontSubset.js` to `fontSubset.ts` using `fonteditor-core`.
- [x] 2.6 Port `encodingDetector.js` to `encodingDetector.ts`.
- [x] 2.7 Remove obsolete dictionary directories (`charater/`, `word/`, `model/`, `utilities/`) from the `tongwen-converter/` folder.

## 3. Books Category and Tools Registration

- [x] 3.1 Define and register the "書籍" (Books) category in `src/tools/index.ts`.
- [x] 3.2 Register the "TXT 轉 EPUB" and "EPUB 編輯器" tools under the "書籍" category in `src/tools/index.ts`.

## 4. TXT to EPUB Component (txt-to-epub.vue)

- [x] 4.1 Create `src/tools/txt-to-epub/index.ts` for tool metadata definition.
- [x] 4.2 Implement `src/tools/txt-to-epub/txt-to-epub.vue` template with the 4-step wizard interface (Upload, Preview Chapters, Settings, Export).
- [x] 4.3 Integrate cover image uploader, font subsetting options, and custom layout configuration inside `txt-to-epub.vue`.
- [x] 4.4 Implement EPUB compilation and download trigger via browser native download helper.

## 5. EPUB Editor Component (epub-editor.vue)

- [x] 5.1 Create `src/tools/epub-editor/index.ts` for tool metadata definition.
- [x] 5.2 Implement `src/tools/epub-editor/epub-editor.vue` template with drag-and-drop upload and settings panels.
- [x] 5.3 Implement EPUB conversion process (unzip, decode text, translate, rebuild zip, download).

## 6. Testing and Validation

- [x] 6.1 Validate that the Simplified-to-Traditional translations on the main converter and EPUB editor behave correctly.
- [x] 6.2 Test TXT-to-EPUB conversion with horizontal and vertical styles, and check font subset embedding functionality.
- [x] 6.3 Test EPUB editor with target EPUB files, ensuring encoding detection succeeds and no files are corrupted.
- [x] 6.4 Update and run the existing unit tests in `tongwen-converter.spec.ts` using the new OpenCC implementation.


