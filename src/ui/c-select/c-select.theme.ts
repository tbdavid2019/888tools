import { defineThemes } from '../theme/theme.models';
import { appThemes } from '../theme/themes';
import { kanagawaDarkPalette, kanagawaLightPalette } from '@/theme/palette';

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

    backgroundColor: kanagawaDarkPalette.surface,
    borderColor: kanagawaDarkPalette.border,
    dropdownShadow: kanagawaDarkPalette.shadow,

    option: {
      hover: {
        backgroundColor: kanagawaDarkPalette.accentSoft,
      },
      active: {
        textColor: appThemes.dark.primary.color,
      },
    },

    focus: {
      backgroundColor: kanagawaDarkPalette.surface,
    },
  },
  light: {
    sizes,

    backgroundColor: kanagawaLightPalette.surface,
    borderColor: kanagawaLightPalette.border,
    dropdownShadow: kanagawaLightPalette.shadow,

    option: {
      hover: {
        backgroundColor: kanagawaLightPalette.accentSoft,
      },
      active: {
        textColor: appThemes.light.primary.color,
      },
    },

    focus: {
      backgroundColor: kanagawaLightPalette.surface,
    },
  },
});
