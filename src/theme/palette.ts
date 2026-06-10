export const kanagawaDarkPalette = {
  background: '#1F1F28', // sumiInk1
  surface: '#2A2A37',    // sumiInk3
  surfaceMuted: '#363646', // sumiInk4
  heading: '#DCD7BA',    // fujiWhite
  text: '#DCD7BA',       // fujiWhite
  textMuted: '#C8C093',  // oldWhite
  button: '#7E9CD8',     // crystalBlue
  buttonHover: '#7FB4CA', // springWater
  buttonPressed: '#223249', // waveBlue2
  accent: '#98BB6C',     // springGreen
  accentSoft: '#6A9589', // waveAqua1
  border: '#54546D',     // sumiInk6
  overlayBorder: 'rgba(220, 215, 186, 0.2)',
  shadow: '0 14px 30px rgba(0, 0, 0, 0.5)',
  glassBackgroundRgb: '31, 31, 40',
} as const;

export const kanagawaLightPalette = {
  background: '#E6E2CC', // Lotus White
  surface: '#DCD7BA',    // Fuji White
  surfaceMuted: '#C8C093', // Old White
  heading: '#1F1F28',    // Sumi Ink 1
  text: '#2A2A37',       // Sumi Ink 3
  textMuted: '#54546D',  // Sumi Ink 6
  button: '#7E9CD8',     // Crystal Blue
  buttonHover: '#7FB4CA', // Spring Water
  buttonPressed: '#223249', // Wave Blue 2
  accent: '#98BB6C',     // Spring Green
  accentSoft: '#6A9589', // Wave Aqua 1
  border: '#A3A3A3',     // Neutral border
  overlayBorder: 'rgba(31, 31, 40, 0.1)',
  shadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
  glassBackgroundRgb: '220, 215, 186',
} as const;

// Keep warmPalette for backwards compatibility in case any file relies on it
export const warmPalette = kanagawaLightPalette;

// Alias kanagawaPalette to dark for backwards compatibility
export const kanagawaPalette = kanagawaDarkPalette;
