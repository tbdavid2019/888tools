import { defineThemes } from '../theme/theme.models';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: kanagawaDarkPalette.surface,
    borderColor: kanagawaDarkPalette.border,

    focus: {
      backgroundColor: kanagawaDarkPalette.surface,
    },
  },
  light: {
    backgroundColor: kanagawaLightPalette.surface,
    borderColor: kanagawaLightPalette.border,

    focus: {
      backgroundColor: kanagawaLightPalette.surface,
    },
  },
});
