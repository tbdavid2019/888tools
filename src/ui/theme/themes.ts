import { defineThemes } from './theme.models';
import { warmPalette } from '@/theme/palette';

export const { themes: appThemes, useTheme: useAppTheme } = defineThemes({
  light: {
    background: warmPalette.background,
    text: {
      baseColor: warmPalette.text,
      mutedColor: warmPalette.textMuted,
    },
    default: {
      color: 'rgba(139, 105, 20, 0.07)',
      colorHover: 'rgba(212, 175, 55, 0.16)',
      colorPressed: 'rgba(139, 105, 20, 0.18)',
    },
    primary: {
      color: warmPalette.button,
      colorHover: warmPalette.buttonHover,
      colorPressed: warmPalette.buttonPressed,
      colorFaded: '#2C528220',
    },
    warning: {
      color: warmPalette.accent,
      colorHover: '#dfbe57',
      colorPressed: '#b99624',
      colorFaded: '#D4AF3726',
    },
    success: {
      color: warmPalette.accent,
      colorHover: '#dfbe57',
      colorPressed: '#b99624',
      colorFaded: '#D4AF3726',
    },
    error: {
      color: '#d03050',
      colorHover: '#de576d',
      colorPressed: '#ab1f3f',
      colorFaded: '#d030502a',
    },
  },
  dark: {
    background: warmPalette.background,
    text: {
      baseColor: warmPalette.text,
      mutedColor: warmPalette.textMuted,
    },
    default: {
      color: 'rgba(139, 105, 20, 0.07)',
      colorHover: 'rgba(212, 175, 55, 0.16)',
      colorPressed: 'rgba(139, 105, 20, 0.18)',
    },
    primary: {
      color: warmPalette.button,
      colorHover: warmPalette.buttonHover,
      colorPressed: warmPalette.buttonPressed,
      colorFaded: '#2C528220',
    },
    warning: {
      color: warmPalette.accent,
      colorHover: '#dfbe57',
      colorPressed: '#b99624',
      colorFaded: '#D4AF3726',
    },
    success: {
      color: warmPalette.accent,
      colorHover: '#dfbe57',
      colorPressed: '#b99624',
      colorFaded: '#D4AF3726',
    },
    error: {
      color: '#e88080',
      colorHover: '#e98b8b',
      colorPressed: '#e57272',
      colorFaded: '#e8808029',
    },
  },
});
