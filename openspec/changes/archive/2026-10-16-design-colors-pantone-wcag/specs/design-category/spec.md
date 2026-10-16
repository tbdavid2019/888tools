# Spec Delta

## Purpose

Groups design, palette, and color matching tools under a dedicated navigation category in the tool directory and application shell.

## ADDED Requirements

### Requirement: Design Category Registration
The system SHALL register a dedicated `design` category containing `find-color` and `color-converter`.

#### Scenario: Navigating to Design Category
- **WHEN** the user browses the application categories
- **THEN** the "設計色彩" (Design & Colors) category is visible with both palette discovery and color converter tools listed

### Requirement: Multilingual Support for Design Category
The system SHALL localize the design category title across all supported application languages.

#### Scenario: Displaying Localized Category Name
- **WHEN** the user switches language
- **THEN** the category title and descriptions update accordingly (e.g., "設計色彩" in Traditional Chinese, "Design & Colors" in English)
