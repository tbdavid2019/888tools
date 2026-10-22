import { defineThemes } from '../theme/theme.models';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

export const { useTheme } = defineThemes({
  dark: {
    backgroundColor: 'rgba(23, 38, 54, 0.92)',
    borderColor: '#385370',
  },
  light: {
    backgroundColor: 'rgba(255, 249, 232, 0.96)',
    borderColor: '#C9AD6A',
  },
});
