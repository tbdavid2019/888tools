import { defineThemes } from '../theme/theme.models';
import { appThemes } from '../theme/themes';
import { warmPalette } from '@/theme/palette';

const sizes = {
  small: {
    height: '28px',
    fontSize: '12px',
  },
  medium: {
    height: '34px',
    fontSize: '14px',
  },
  large: {
    height: '40px',
    fontSize: '16px',
  },
};

export const { useTheme } = defineThemes({
  dark: {
    sizes,

    backgroundColor: warmPalette.surface,
    borderColor: warmPalette.border,
    dropdownShadow: warmPalette.shadow,

    option: {
      hover: {
        backgroundColor: warmPalette.accentSoft,
      },
      active: {
        textColor: appThemes.dark.primary.color,
      },
    },

    focus: {
      backgroundColor: warmPalette.surface,
    },
  },
  light: {
    sizes,

    backgroundColor: warmPalette.surface,
    borderColor: warmPalette.border,
    dropdownShadow: warmPalette.shadow,

    option: {
      hover: {
        backgroundColor: warmPalette.accentSoft,
      },
      active: {
        textColor: appThemes.light.primary.color,
      },
    },

    focus: {
      backgroundColor: warmPalette.surface,
    },
  },
});
