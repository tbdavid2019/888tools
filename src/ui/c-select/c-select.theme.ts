import { defineThemes } from '../theme/theme.models';
import { appThemes } from '../theme/themes';
import { kanagawaPalette } from '@/theme/palette';

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

    backgroundColor: kanagawaPalette.surface,
    borderColor: kanagawaPalette.border,
    dropdownShadow: kanagawaPalette.shadow,

    option: {
      hover: {
        backgroundColor: kanagawaPalette.accentSoft,
      },
      active: {
        textColor: appThemes.dark.primary.color,
      },
    },

    focus: {
      backgroundColor: kanagawaPalette.surface,
    },
  },
  light: {
    sizes,

    backgroundColor: kanagawaPalette.surface,
    borderColor: kanagawaPalette.border,
    dropdownShadow: kanagawaPalette.shadow,

    option: {
      hover: {
        backgroundColor: kanagawaPalette.accentSoft,
      },
      active: {
        textColor: appThemes.light.primary.color,
      },
    },

    focus: {
      backgroundColor: kanagawaPalette.surface,
    },
  },
});
