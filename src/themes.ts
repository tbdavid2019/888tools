import type { GlobalThemeOverrides } from 'naive-ui';
import { kanagawaPalette } from './theme/palette';

const appFontFamily = '\'Maple Mono\', \'Noto Sans TC\', \'PingFang TC\', \'Microsoft JhengHei\', sans-serif';

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: appFontFamily,
    bodyColor: kanagawaPalette.light.background,
    cardColor: kanagawaPalette.light.surface,
    modalColor: kanagawaPalette.light.surface,
    popoverColor: kanagawaPalette.light.surface,
    tableColor: kanagawaPalette.light.surface,
    codeColor: kanagawaPalette.light.surfaceMuted,
    dividerColor: kanagawaPalette.light.border,
    borderColor: kanagawaPalette.light.border,
    borderRadius: '22px',
    primaryColor: kanagawaPalette.light.button,
    primaryColorHover: kanagawaPalette.light.buttonHover,
    primaryColorPressed: kanagawaPalette.light.buttonPressed,
    primaryColorSuppl: kanagawaPalette.light.buttonHover,
    infoColor: kanagawaPalette.light.button,
    infoColorHover: kanagawaPalette.light.buttonHover,
    infoColorPressed: kanagawaPalette.light.buttonPressed,
    successColor: kanagawaPalette.light.accent,
    successColorHover: '#dfbe57',
    successColorPressed: '#b99624',
    warningColor: kanagawaPalette.light.accent,
    warningColorHover: '#dfbe57',
    warningColorPressed: '#b99624',
    textColorBase: kanagawaPalette.light.text,
    textColor1: kanagawaPalette.light.text,
    textColor2: kanagawaPalette.light.textMuted,
    textColor3: kanagawaPalette.light.textMuted,
    placeholderColor: kanagawaPalette.light.textMuted,
    placeholderColorDisabled: kanagawaPalette.light.textMuted,
    inputColor: kanagawaPalette.light.surface,
    actionColor: kanagawaPalette.light.surfaceMuted,
    actionColorHover: kanagawaPalette.light.accentSoft,
    actionColorPressed: kanagawaPalette.light.surfaceMuted,
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: kanagawaPalette.light.background,
    siderColor: kanagawaPalette.light.background,
    siderBorderColor: kanagawaPalette.light.border,
  },

  Card: {
    color: kanagawaPalette.light.surface,
    borderColor: kanagawaPalette.light.border,
  },

  Button: {
    textColorTextPrimary: kanagawaPalette.light.button,
    textColorTextPrimaryHover: kanagawaPalette.light.buttonHover,
    textColorTextPrimaryPressed: kanagawaPalette.light.buttonPressed,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: kanagawaPalette.light.surface },
    },
  },
};

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: appFontFamily,
    bodyColor: kanagawaPalette.dark.background,
    cardColor: kanagawaPalette.dark.surface,
    modalColor: kanagawaPalette.dark.surface,
    popoverColor: kanagawaPalette.dark.surface,
    tableColor: kanagawaPalette.dark.surface,
    codeColor: kanagawaPalette.dark.surfaceMuted,
    dividerColor: kanagawaPalette.dark.border,
    borderColor: kanagawaPalette.dark.border,
    borderRadius: '22px',
    primaryColor: kanagawaPalette.dark.button,
    primaryColorHover: kanagawaPalette.dark.buttonHover,
    primaryColorPressed: kanagawaPalette.dark.buttonPressed,
    primaryColorSuppl: kanagawaPalette.dark.buttonHover,
    infoColor: kanagawaPalette.dark.button,
    infoColorHover: kanagawaPalette.dark.buttonHover,
    infoColorPressed: kanagawaPalette.dark.buttonPressed,
    successColor: kanagawaPalette.dark.accent,
    successColorHover: '#dfbe57',
    successColorPressed: '#b99624',
    warningColor: kanagawaPalette.dark.accent,
    warningColorHover: '#dfbe57',
    warningColorPressed: '#b99624',
    textColorBase: kanagawaPalette.dark.text,
    textColor1: kanagawaPalette.dark.text,
    textColor2: kanagawaPalette.dark.textMuted,
    textColor3: kanagawaPalette.dark.textMuted,
    placeholderColor: kanagawaPalette.dark.textMuted,
    placeholderColorDisabled: kanagawaPalette.dark.textMuted,
    inputColor: kanagawaPalette.dark.surface,
    actionColor: kanagawaPalette.dark.surfaceMuted,
    actionColorHover: kanagawaPalette.dark.accentSoft,
    actionColorPressed: kanagawaPalette.dark.surfaceMuted,
  },

  Notification: {
    color: kanagawaPalette.dark.surface,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: kanagawaPalette.dark.surface },
    },
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: kanagawaPalette.dark.background,
    siderColor: kanagawaPalette.dark.background,
    siderBorderColor: kanagawaPalette.dark.border,
  },

  Card: {
    color: kanagawaPalette.dark.surface,
    borderColor: kanagawaPalette.dark.border,
  },

  Table: {
    tdColor: kanagawaPalette.dark.surface,
    thColor: kanagawaPalette.dark.surfaceMuted,
  },
};
