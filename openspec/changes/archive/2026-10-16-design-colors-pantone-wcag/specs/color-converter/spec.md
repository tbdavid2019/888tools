# Spec Delta

## Purpose

Provides client-side color format conversion, perceptual Delta E 2000 Pantone matching, and screen or image eyedroppers for designers and developers.

## ADDED Requirements

### Requirement: Delta E 2000 Pantone Matching
The system SHALL compute perceptual color difference against the standard Pantone coated reference library using the CIEDE2000 (Delta E 2000) algorithm in pure client-side JavaScript.

#### Scenario: Computing Nearest Pantone Color
- **WHEN** the user inputs a valid color in HEX, RGB, HSL, HSV, or CMYK format
- **THEN** the system finds the closest Pantone color using Delta E 2000, displays the Pantone code, name, hex value, Delta E numeric score, and visual perceptual match rating

### Requirement: Split Swatch Visual Comparison
The system SHALL display a split swatch showing the user's input color side-by-side with the matched Pantone color.

#### Scenario: Visual Comparison Rendering
- **WHEN** a color is selected or entered
- **THEN** a split comparison preview is displayed with both colors adjacent, along with one-click actions to copy the Pantone code, copy the Pantone hex, or apply the Pantone color as current input

### Requirement: Screen EyeDropper Tool
The system SHALL provide a screen eyedropper button invoking the native `window.EyeDropper` API when supported by the browser.

#### Scenario: Sampling Color from Screen
- **WHEN** the user clicks the screen eyedropper button in a supported browser
- **THEN** the browser enters eyedropper mode and updates the active color to the sampled hex value upon user click

### Requirement: Canvas Screenshot Dropper with Magnifier
The system SHALL allow users to upload an image or paste a screenshot (`Cmd+V` / `Ctrl+V`), and sample any pixel using an 8x magnifier loupe.

#### Scenario: Pasting and Sampling from Screenshot
- **WHEN** a user pastes an image from the clipboard or uploads an image file
- **THEN** the image is rendered onto an interactive canvas with an 8x zoom loupe showing the cursor's current pixel color, which can be selected on click
