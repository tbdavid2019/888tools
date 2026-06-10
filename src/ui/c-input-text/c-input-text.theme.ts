import { defineThemes } from '../theme/theme.models';
import { kanagawaPalette } from '@/theme/palette';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: kanagawaPalette.surface,
    borderColor: kanagawaPalette.border,

    focus: {
      backgroundColor: kanagawaPalette.surface,
    },
  },
  light: {
    backgroundColor: kanagawaPalette.surface,
    borderColor: kanagawaPalette.border,

    focus: {
      backgroundColor: kanagawaPalette.surface,
    },
  },
});
