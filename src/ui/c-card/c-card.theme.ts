import { defineThemes } from '../theme/theme.models';
import { warmPalette } from '@/theme/palette';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: 'rgba(255, 252, 247, 0.78)',
    borderColor: warmPalette.border,
  },
  light: {
    backgroundColor: 'rgba(255, 252, 247, 0.78)',
    borderColor: warmPalette.border,
  },
});
