import { defineThemes } from '../theme/theme.models';
import { warmPalette } from '@/theme/palette';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: warmPalette.surface,
    borderColor: warmPalette.border,

    focus: {
      backgroundColor: warmPalette.surface,
    },
  },
  light: {
    backgroundColor: warmPalette.surface,
    borderColor: warmPalette.border,

    focus: {
      backgroundColor: warmPalette.surface,
    },
  },
});
