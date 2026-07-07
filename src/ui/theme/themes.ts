import { defineThemes } from './theme.models';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

export const { themes: appThemes, useTheme: useAppTheme } = defineThemes({
  light: {
    background: kanagawaLightPalette.background,
    text: {
      baseColor: kanagawaLightPalette.text,
      mutedColor: kanagawaLightPalette.textMuted,
    },
    default: {
      color: 'rgba(139, 105, 20, 0.07)',
      colorHover: 'rgba(212, 175, 55, 0.16)',
      colorPressed: 'rgba(139, 105, 20, 0.18)',
    },
    primary: {
      color: '#223249',
      colorHover: '#2f4a66',
      colorPressed: '#1b2838',
      colorFaded: 'rgba(126, 156, 216, 0.28)',
    },
    warning: {
      color: kanagawaLightPalette.accent,
      colorHover: '#51682b',
      colorPressed: '#435622',
      colorFaded: 'rgba(95, 122, 51, 0.22)',
    },
    success: {
      color: kanagawaLightPalette.accent,
      colorHover: '#51682b',
      colorPressed: '#435622',
      colorFaded: 'rgba(95, 122, 51, 0.22)',
    },
    error: {
      color: '#d03050',
      colorHover: '#de576d',
      colorPressed: '#ab1f3f',
      colorFaded: '#d030502a',
    },
  },
  dark: {
    background: kanagawaDarkPalette.background,
    text: {
      baseColor: kanagawaDarkPalette.text,
      mutedColor: kanagawaDarkPalette.textMuted,
    },
    default: {
      color: 'rgba(139, 105, 20, 0.07)',
      colorHover: 'rgba(212, 175, 55, 0.16)',
      colorPressed: 'rgba(139, 105, 20, 0.18)',
    },
    primary: {
      color: kanagawaDarkPalette.button,
      colorHover: kanagawaDarkPalette.buttonHover,
      colorPressed: kanagawaDarkPalette.buttonPressed,
      colorFaded: '#2C528220',
    },
    warning: {
      color: kanagawaDarkPalette.accent,
      colorHover: '#dfbe57',
      colorPressed: '#b99624',
      colorFaded: '#D4AF3726',
    },
    success: {
      color: kanagawaDarkPalette.accent,
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
