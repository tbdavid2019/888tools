export const kanagawaDarkPalette = {
  background: '#101B27', // deep midnight blue
  surface: '#172636',    // deep navy card surface
  surfaceMuted: '#21354B', // elevated navy surface
  heading: '#FFF9E8',    // warm cream (14.61:1 on surface)
  text: '#F5EEDC',       // warm cream text (13.5:1 on surface)
  textMuted: '#C9BDA3',  // warm sand muted (8.26:1 on surface)
  button: '#FFB010',     // saffron primary in dark mode (8.39:1 on surface)
  buttonHover: '#FFC13B',
  buttonPressed: '#E09600',
  accent: '#FFB010',     // saffron
  accentSoft: '#263C54', // muted navy highlight
  saffron: '#FFB010',
  saffronHover: '#FFC13B',
  clay: '#E07A4F',
  border: '#385370',
  inputBorder: '#4E6E8E',
  overlayBorder: 'rgba(255, 249, 232, 0.20)',
  shadow: '0 14px 30px rgba(0, 0, 0, 0.48)',
  glassBackgroundRgb: '23, 38, 54',
} as const;

export const kanagawaLightPalette = {
  background: '#FFF0CC', // 2md canvas
  surface: '#FFF9E8',    // 2md warm-cream
  surfaceMuted: '#FFE8AD', // warm saffron tint
  heading: '#2B251A',    // 2md ink (14.45:1 on surface)
  text: '#2B251A',       // 2md ink (14.45:1 on surface)
  textMuted: '#5C503A',  // warm deep umber (7.50:1 on surface, 6.98:1 on background)
  button: '#17324D',     // 2md deep-blue (12.48:1 on surface)
  buttonHover: '#0F2336',
  buttonPressed: '#2B251A',
  accent: '#9E3F17',     // 2md clay (6.28:1 on surface)
  accentSoft: '#FFE49E', // warm saffron soft highlight
  saffron: '#FFB010',    // 2md primary saffron
  saffronHover: '#F2A600',
  clay: '#A9471D',
  border: '#C9AD6A',     // warm gold border
  inputBorder: '#6B5B38', // 2md input-border
  overlayBorder: 'rgba(23, 50, 77, 0.22)',
  shadow: '0 10px 26px rgba(43, 37, 26, 0.10)',
  glassBackgroundRgb: '255, 249, 232',
} as const;

// Keep warmPalette for backwards compatibility in case any file relies on it
export const warmPalette = kanagawaLightPalette;

// Alias kanagawaPalette to dark for backwards compatibility
export const kanagawaPalette = kanagawaDarkPalette;
