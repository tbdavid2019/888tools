## ADDED Requirements

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
