# Spec Delta

## ADDED Requirements

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
