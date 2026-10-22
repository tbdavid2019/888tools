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
      color: 'rgba(23, 50, 77, 0.08)',
      colorHover: 'rgba(255, 176, 16, 0.28)',
      colorPressed: 'rgba(255, 176, 16, 0.42)',
    },
    primary: {
      color: '#17324D',
      colorHover: '#0F2336',
      colorPressed: '#2B251A',
      colorFaded: 'rgba(255, 176, 16, 0.35)',
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
      color: 'rgba(255, 249, 232, 0.08)',
      colorHover: 'rgba(255, 176, 16, 0.22)',
      colorPressed: 'rgba(255, 176, 16, 0.32)',
    },
    primary: {
      color: '#FFB010',
      colorHover: '#FFC13B',
      colorPressed: '#E09600',
      colorFaded: 'rgba(255, 176, 16, 0.22)',
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
