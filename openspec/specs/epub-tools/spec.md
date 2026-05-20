# epub-tools Specification

## Purpose
TBD - created by archiving change integrate-epub-books-tools. Update Purpose after archive.
## Requirements
### Requirement: Books Category Registration
The system SHALL register a new category named "書籍" (Books) in the tool index.

#### Scenario: Display Books category
- **WHEN** the user visits the home page or sidebar
- **THEN** the "書籍" category icon and its sub-tools "TXT 轉 EPUB" and "EPUB 編輯器" MUST be visible

### Requirement: TXT File Processing and Analysis
The system SHALL allow users to upload TXT files, automatically detect the byte encoding (UTF-8, Big5, GBK), and parse book metadata (title, author).

#### Scenario: Auto-detect encoding and metadata
- **WHEN** the user drops a TXT file named "《三國演義》羅貫中.txt" encoded in GBK
- **THEN** the system MUST successfully decode the file content and pre-populate the Title field as "三國演義" and Author field as "羅貫中"

### Requirement: Chapter Segmentation
The system SHALL automatically parse chapters in the TXT content using regex or blank lines, and allow users to view and edit the chapter list.

#### Scenario: Edit chapter title
- **WHEN** the user modifies the title of Chapter 1 in the preview interface
- **THEN** the updated title MUST be used in the exported EPUB table of contents (TOC)

### Requirement: Layout and Styling Configuration
The system SHALL support custom configuration for writing orientation (horizontal/vertical), font family, font size, line height, paragraph indentation, and cover image.

#### Scenario: Apply vertical writing mode
- **WHEN** the user selects vertical orientation ("直排")
- **THEN** the generated EPUB XHTML files MUST include CSS styles for `writing-mode: vertical-rl`

### Requirement: Font Subsetting and Embedding
The system SHALL support dynamic browser-side font subsetting via `fonteditor-core` to extract only the characters present in the book and embed the resulting lightweight font file.

#### Scenario: Embed Noto Sans TC subset
- **WHEN** the user enables font embedding and selects Noto Sans TC
- **THEN** the system MUST download the base font, subset it containing only the unique character list of the novel, and embed the `.woff`/`.ttf` file in the EPUB package

### Requirement: EPUB Compilation and Export
The system SHALL assemble the ZIP structure of the EPUB file (including mimetype, container.xml, content.opf, toc.ncx, nav.xhtml, and content pages) and download it in the browser.

#### Scenario: Compile and download EPUB
- **WHEN** the user clicks the "匯出 EPUB" button
- **THEN** the system MUST package the files and trigger a file download named "<title>.epub"

### Requirement: EPUB File Editing and Translation
The system SHALL support uploading an existing EPUB file, extracting its text content, converting the content (using OpenCC-JS), and downloading the updated EPUB.

#### Scenario: Convert EPUB Simplified to Traditional
- **WHEN** the user uploads a Simplified Chinese EPUB and clicks convert to Traditional Chinese (TW)
- **THEN** all text inside the HTML pages, NCX navigation, and metadata MUST be converted using OpenCC-JS, and the updated EPUB is downloaded

