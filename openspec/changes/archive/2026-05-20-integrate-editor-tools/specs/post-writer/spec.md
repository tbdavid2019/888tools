## ADDED Requirements

### Requirement: Layout Mode Selection
The system SHALL support switching between Magazine and Broetry layout formats for the input text.

#### Scenario: Layout Selection Change
- **WHEN** user selects Broetry layout
- **THEN** the formatted text updates immediately to break on commas and apply bracketed title formats

### Requirement: Punctuation Conversion
The system SHALL convert standard punctuation marks into full-width Chinese marks when Magazine format is active.

#### Scenario: Full-Width Mark Conversion
- **WHEN** Magazine format is active and text has commas or colons
- **THEN** the output contains full-width commas (，) and colons (：)

### Requirement: Platform Word Limit Checking
The system SHALL calculate and display remaining character counts against Facebook, Instagram, and Threads limits.

#### Scenario: Word Limit Alert
- **WHEN** input characters exceed the active tab's platform limit
- **THEN** a warning indicator or badge is shown on that platform tab
