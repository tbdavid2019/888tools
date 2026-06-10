import type { GlobalThemeOverrides } from 'naive-ui';
import { kanagawaPalette } from './theme/palette';

const appFontFamily = '\'Maple Mono\', \'Noto Sans TC\', \'PingFang TC\', \'Microsoft JhengHei\', sans-serif';

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: appFontFamily,
    bodyColor: kanagawaPalette.background,
    cardColor: kanagawaPalette.surface,
    modalColor: kanagawaPalette.surface,
    popoverColor: kanagawaPalette.surface,
    tableColor: kanagawaPalette.surface,
    codeColor: kanagawaPalette.surfaceMuted,
    dividerColor: kanagawaPalette.border,
    borderColor: kanagawaPalette.border,
    borderRadius: '22px',
    primaryColor: kanagawaPalette.button,
    primaryColorHover: kanagawaPalette.buttonHover,
    primaryColorPressed: kanagawaPalette.buttonPressed,
    primaryColorSuppl: kanagawaPalette.buttonHover,
    infoColor: kanagawaPalette.button,
    infoColorHover: kanagawaPalette.buttonHover,
    infoColorPressed: kanagawaPalette.buttonPressed,
    successColor: kanagawaPalette.accent,
    successColorHover: '#dfbe57',
    successColorPressed: '#b99624',
    warningColor: kanagawaPalette.accent,
    warningColorHover: '#dfbe57',
    warningColorPressed: '#b99624',
    textColorBase: kanagawaPalette.text,
    textColor1: kanagawaPalette.text,
    textColor2: kanagawaPalette.textMuted,
    textColor3: kanagawaPalette.textMuted,
    placeholderColor: kanagawaPalette.textMuted,
    placeholderColorDisabled: kanagawaPalette.textMuted,
    inputColor: kanagawaPalette.surface,
    actionColor: kanagawaPalette.surfaceMuted,
    actionColorHover: kanagawaPalette.accentSoft,
    actionColorPressed: kanagawaPalette.surfaceMuted,
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: kanagawaPalette.background,
    siderColor: kanagawaPalette.background,
    siderBorderColor: kanagawaPalette.border,
  },

  Card: {
    color: kanagawaPalette.surface,
    borderColor: kanagawaPalette.border,
  },

  Button: {
    textColorTextPrimary: kanagawaPalette.button,
    textColorTextPrimaryHover: kanagawaPalette.buttonHover,
    textColorTextPrimaryPressed: kanagawaPalette.buttonPressed,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: kanagawaPalette.surface },
    },
  },
};

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: appFontFamily,
    bodyColor: kanagawaPalette.background,
    cardColor: kanagawaPalette.surface,
    modalColor: kanagawaPalette.surface,
    popoverColor: kanagawaPalette.surface,
    tableColor: kanagawaPalette.surface,
    codeColor: kanagawaPalette.surfaceMuted,
    dividerColor: kanagawaPalette.border,
    borderColor: kanagawaPalette.border,
    borderRadius: '22px',
    primaryColor: kanagawaPalette.button,
    primaryColorHover: kanagawaPalette.buttonHover,
    primaryColorPressed: kanagawaPalette.buttonPressed,
    primaryColorSuppl: kanagawaPalette.buttonHover,
    infoColor: kanagawaPalette.button,
    infoColorHover: kanagawaPalette.buttonHover,
    infoColorPressed: kanagawaPalette.buttonPressed,
    successColor: kanagawaPalette.accent,
    successColorHover: '#dfbe57',
    successColorPressed: '#b99624',
    warningColor: kanagawaPalette.accent,
    warningColorHover: '#dfbe57',
    warningColorPressed: '#b99624',
    textColorBase: kanagawaPalette.text,
    textColor1: kanagawaPalette.text,
    textColor2: kanagawaPalette.textMuted,
    textColor3: kanagawaPalette.textMuted,
    placeholderColor: kanagawaPalette.textMuted,
    placeholderColorDisabled: kanagawaPalette.textMuted,
    inputColor: kanagawaPalette.surface,
    actionColor: kanagawaPalette.surfaceMuted,
    actionColorHover: kanagawaPalette.accentSoft,
    actionColorPressed: kanagawaPalette.surfaceMuted,
  },

  Notification: {
    color: kanagawaPalette.surface,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: kanagawaPalette.surface },
    },
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: kanagawaPalette.background,
    siderColor: kanagawaPalette.background,
    siderBorderColor: kanagawaPalette.border,
  },

  Card: {
    color: kanagawaPalette.surface,
    borderColor: kanagawaPalette.border,
  },

  Table: {
    tdColor: kanagawaPalette.surface,
    thColor: kanagawaPalette.surfaceMuted,
  },
};
