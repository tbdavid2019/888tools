## ADDED Requirements

### Requirement: Editor Category Registration
The system SHALL register a new category named "Editor" in the tool index file.

#### Scenario: Category Registration
- **WHEN** the tool index is loaded
- **THEN** the category list contains "Editor" with components including html-wysiwyg-editor, find-color, and post-writer

### Requirement: Editor Category Translation
The system SHALL translate the category identifier "editor" into Traditional Chinese, Simplified Chinese, and English.

#### Scenario: Category Translation in Traditional Chinese
- **WHEN** the user selects Traditional Chinese language
- **THEN** the category name displayed in the navigation menu is "編輯區"

#### Scenario: Category Translation in Simplified Chinese
- **WHEN** the user selects Simplified Chinese language
- **THEN** the category name displayed in the navigation menu is "编辑区"

#### Scenario: Category Translation in English
- **WHEN** the user selects English language
- **THEN** the category name displayed in the navigation menu is "Editor"
