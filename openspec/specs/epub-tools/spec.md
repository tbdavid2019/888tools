# epub-tools Specification

## Purpose
Browser-local EPUB creation (`txt-to-epub`) and EPUB structural/typographic editing (`epub-editor`), sharing encoding detection, OpenCC conversion, `fonteditor-core` font subsetting, and OCF-compliant packaging.

## Requirements

### Requirement: Books Category Registration
The system SHALL register a category named "書籍" (Books) in the tool index.

#### Scenario: Display Books category
- **WHEN** the user visits the home page or sidebar
- **THEN** the "書籍" category icon and its sub-tools "TXT 轉 EPUB" and "EPUB 編輯器" MUST be visible

### Requirement: TXT File Processing and Analysis
The system SHALL allow users to upload TXT files, automatically detect the byte encoding (UTF-8, Big5, GBK, UTF-16), and parse book metadata (title, author).

#### Scenario: Auto-detect encoding and metadata
- **WHEN** the user drops a TXT file named "《三國演義》羅貫中.txt" encoded in GBK
- **THEN** the system MUST successfully decode the file content and pre-populate the Title field as "三國演義" and Author field as "羅貫中"

### Requirement: Chapter Segmentation
The system SHALL automatically parse chapters in the TXT content using regex or blank lines, and allow users to view and edit the chapter list.

#### Scenario: Edit chapter title
- **WHEN** the user modifies the title of Chapter 1 in the preview interface
- **THEN** the updated title MUST be used in the exported EPUB table of contents (TOC)

### Requirement: Layout and Styling Configuration
The system SHALL support custom configuration for writing orientation (horizontal/vertical), font family, font size, line height, paragraph indentation, page margins, and cover image.

#### Scenario: Apply vertical writing mode
- **WHEN** the user selects vertical orientation ("直排")
- **THEN** the generated EPUB XHTML files MUST include CSS styles for `writing-mode: vertical-rl` and update OPF `<spine page-progression-direction="rtl">`

### Requirement: Local Font Subsetting and Embedding
The system SHALL support dynamic browser-side font subsetting via `fonteditor-core` (including Web Worker off-main-thread execution and local WOFF2 WASM support) to extract only the characters present in the book (supporting full Unicode code points) and embed the resulting lightweight `.ttf` font file, with IndexedDB caching for built-in fonts.

#### Scenario: Embed built-in or custom font subset
- **WHEN** the user selects `subset` embedding mode and chooses a built-in or uploaded `.ttf`/`.otf`/`.woff`/`.woff2` font
- **THEN** the system MUST subset the font locally without external CDN calls and embed the resulting `font/ttf` asset into the EPUB package

### Requirement: OCF-Compliant EPUB Compilation and Export
The system SHALL assemble an OCF-compliant EPUB ZIP archive with `mimetype` (`application/epub+zip`) placed as the very first entry using `STORE` compression and valid DOS timestamps, and download it via Blob Object URLs that are safely revoked.

#### Scenario: Compile and download EPUB
- **WHEN** the user exports an EPUB in either `txt-to-epub` or `epub-editor`
- **THEN** the first ZIP entry MUST be `mimetype` stored uncompressed (`STORE`), and repeated exports in `epub-editor` MUST remain idempotent without mutating the loaded source archive

### Requirement: EPUB Editing, DOM-Safe OpenCC Conversion, and Kindle Compatibility Repair
The system SHALL support loading an existing EPUB archive, decoding non-UTF-8 files safely before rewriting, converting readable text nodes and metadata via OpenCC-JS without mutating XML/XHTML attributes or links, writing edited `dc:title`/`dc:creator` metadata and cover changes cleanly into OPF/NCX, repairing Send-to-Kindle structural issues (extensionless HTML, nested NCX/NAV dead links, percent-encoded paths, timestamps, `<body id>`), and previewing spine-ordered chapters inside a sanitized sandboxed `<iframe>`.

#### Scenario: Convert EPUB Simplified to Traditional with edited metadata
- **WHEN** the user uploads a Simplified Chinese EPUB, updates the book title/author, and exports in Traditional Chinese (`twp`)
- **THEN** text nodes and display attributes (`alt`, `title`) MUST be converted while preserving `href`/`src`/`id` attributes, OPF/NCX metadata MUST reflect the edited title and author, and the updated EPUB is downloaded
