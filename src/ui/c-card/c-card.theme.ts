import { defineThemes } from '../theme/theme.models';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: 'rgba(42, 42, 55, 0.78)',
    borderColor: kanagawaDarkPalette.border,
  },
  light: {
    backgroundColor: 'rgba(220, 215, 186, 0.82)',
    borderColor: kanagawaLightPalette.border,
  },
});
