import { defineThemes } from './theme.models';
import { kanagawaPalette } from '@/theme/palette';

export const { themes: appThemes, useTheme: useAppTheme } = defineThemes({
  light: {
    background: kanagawaPalette.background,
    text: {
      baseColor: kanagawaPalette.text,
      mutedColor: kanagawaPalette.textMuted,
    },
    default: {
      color: 'rgba(139, 105, 20, 0.07)',
      colorHover: 'rgba(212, 175, 55, 0.16)',
      colorPressed: 'rgba(139, 105, 20, 0.18)',
    },
    primary: {
      color: kanagawaPalette.button,
      colorHover: kanagawaPalette.buttonHover,
      colorPressed: kanagawaPalette.buttonPressed,
      colorFaded: '#2C528220',
    },
    warning: {
      color: kanagawaPalette.accent,
      colorHover: '#dfbe57',
      colorPressed: '#b99624',
      colorFaded: '#D4AF3726',
    },
    success: {
      color: kanagawaPalette.accent,
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
    background: kanagawaPalette.background,
    text: {
      baseColor: kanagawaPalette.text,
      mutedColor: kanagawaPalette.textMuted,
    },
    default: {
      color: 'rgba(139, 105, 20, 0.07)',
      colorHover: 'rgba(212, 175, 55, 0.16)',
      colorPressed: 'rgba(139, 105, 20, 0.18)',
    },
    primary: {
      color: kanagawaPalette.button,
      colorHover: kanagawaPalette.buttonHover,
      colorPressed: kanagawaPalette.buttonPressed,
      colorFaded: '#2C528220',
    },
    warning: {
      color: kanagawaPalette.accent,
      colorHover: '#dfbe57',
      colorPressed: '#b99624',
      colorFaded: '#D4AF3726',
    },
    success: {
      color: kanagawaPalette.accent,
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
