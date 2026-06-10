import { defineThemes } from '../theme/theme.models';
import { kanagawaPalette } from '@/theme/palette';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: 'rgba(255, 252, 247, 0.78)',
    borderColor: kanagawaPalette.border,
  },
  light: {
    backgroundColor: 'rgba(255, 252, 247, 0.78)',
    borderColor: kanagawaPalette.border,
  },
});
