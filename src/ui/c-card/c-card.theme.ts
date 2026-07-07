import { defineThemes } from '../theme/theme.models';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: 'rgba(42, 42, 55, 0.78)',
    borderColor: kanagawaDarkPalette.border,
  },
  light: {
    backgroundColor: 'rgba(236, 232, 212, 0.94)',
    borderColor: 'rgba(31, 31, 40, 0.16)',
  },
});
