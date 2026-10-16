# find-color Specification

## Purpose
Provides a comprehensive palette discovery tool featuring Pantone Color of the Year sets, color families, and mock webpage live previews with WCAG AAA accessible copy controls.

## Requirements

### Requirement: Color Swatches Display
The system SHALL display 5 overlapping color orbs representing Background, Title, Text, Button, and Accent colors for each palette.

#### Scenario: Visual Swatches Rendering
- **WHEN** a palette card is rendered
- **THEN** 5 circular color elements are displayed with sizes and overlap offsets mapping their semantic hierarchy

### Requirement: Click to Copy Hex Code
The system SHALL copy the hex color code of a swatch to the clipboard when clicked.

#### Scenario: Color Copy Click
- **WHEN** a user clicks on one of the colored planets
- **THEN** the hex code is copied to the clipboard and a success toast message is shown

### Requirement: Mock Website Preview Apply
The system SHALL update the CSS custom properties of a mockup webpage container when the user clicks the "套用配色" (Apply Scheme) button.

#### Scenario: Preview Application
- **WHEN** a user clicks "套用配色" (Apply Scheme) on a palette
- **THEN** the mock website preview changes its background, heading, text, button, and accent colors to match the selected palette

### Requirement: High Contrast Palette Copy Button
The system SHALL render the "快速複製色組" (Fast Copy Palette) button with high contrast meeting WCAG AAA standards (at least 7:1 contrast ratio against the palette card background).

#### Scenario: Rendering Copy Button with WCAG AAA Contrast
- **WHEN** a palette card is rendered in either light or dark mode
- **THEN** the copy palette button displays high-contrast solid slate dark background with crisp white text in light mode, achieving a contrast ratio >= 7:1

### Requirement: Pantone Color of the Year and Color Families Palettes
The system SHALL provide 2000–2026 Pantone Color of the Year palettes and 7 color families (Reds, Oranges, Yellows, Greens, Blues, Purples, Neutrals).

#### Scenario: Selecting Pantone COTY or Color Families
- **WHEN** the user filters by a color family or searches by year or "潘通" or "年度色"
- **THEN** matching palettes containing the corresponding Pantone colors and curated schemes are displayed

### Requirement: Pantone Chinese Search
The system SHALL support searching palettes by Chinese keywords including "潘通", "年度色", "流行色", and year numbers.

#### Scenario: Searching by Chinese Pantone Keyword
- **WHEN** a user enters "潘通" or a year like "2026" into the palette search box
- **THEN** all associated Pantone Color of the Year and Pantone-curated palettes are filtered and displayed
