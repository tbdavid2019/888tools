import type { GlobalThemeOverrides } from 'naive-ui';
import { warmPalette } from './theme/palette';

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    bodyColor: warmPalette.background,
    cardColor: warmPalette.surface,
    modalColor: warmPalette.surface,
    popoverColor: warmPalette.surface,
    tableColor: warmPalette.surface,
    codeColor: warmPalette.surfaceMuted,
    dividerColor: warmPalette.border,
    borderColor: warmPalette.border,
    borderRadius: '22px',
    primaryColor: warmPalette.button,
    primaryColorHover: warmPalette.buttonHover,
    primaryColorPressed: warmPalette.buttonPressed,
    primaryColorSuppl: warmPalette.buttonHover,
    infoColor: warmPalette.button,
    infoColorHover: warmPalette.buttonHover,
    infoColorPressed: warmPalette.buttonPressed,
    successColor: warmPalette.accent,
    successColorHover: '#dfbe57',
    successColorPressed: '#b99624',
    warningColor: warmPalette.accent,
    warningColorHover: '#dfbe57',
    warningColorPressed: '#b99624',
    textColorBase: warmPalette.text,
    textColor1: warmPalette.text,
    textColor2: warmPalette.textMuted,
    textColor3: warmPalette.textMuted,
    placeholderColor: warmPalette.textMuted,
    placeholderColorDisabled: warmPalette.textMuted,
    inputColor: warmPalette.surface,
    actionColor: warmPalette.surfaceMuted,
    actionColorHover: warmPalette.accentSoft,
    actionColorPressed: warmPalette.surfaceMuted,
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: warmPalette.background,
    siderColor: warmPalette.background,
    siderBorderColor: warmPalette.border,
  },

  Card: {
    color: warmPalette.surface,
    borderColor: warmPalette.border,
  },

  Button: {
    textColorTextPrimary: warmPalette.button,
    textColorTextPrimaryHover: warmPalette.buttonHover,
    textColorTextPrimaryPressed: warmPalette.buttonPressed,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: warmPalette.surface },
    },
  },
};

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    bodyColor: warmPalette.background,
    cardColor: warmPalette.surface,
    modalColor: warmPalette.surface,
    popoverColor: warmPalette.surface,
    tableColor: warmPalette.surface,
    codeColor: warmPalette.surfaceMuted,
    dividerColor: warmPalette.border,
    borderColor: warmPalette.border,
    borderRadius: '22px',
    primaryColor: warmPalette.button,
    primaryColorHover: warmPalette.buttonHover,
    primaryColorPressed: warmPalette.buttonPressed,
    primaryColorSuppl: warmPalette.buttonHover,
    infoColor: warmPalette.button,
    infoColorHover: warmPalette.buttonHover,
    infoColorPressed: warmPalette.buttonPressed,
    successColor: warmPalette.accent,
    successColorHover: '#dfbe57',
    successColorPressed: '#b99624',
    warningColor: warmPalette.accent,
    warningColorHover: '#dfbe57',
    warningColorPressed: '#b99624',
    textColorBase: warmPalette.text,
    textColor1: warmPalette.text,
    textColor2: warmPalette.textMuted,
    textColor3: warmPalette.textMuted,
    placeholderColor: warmPalette.textMuted,
    placeholderColorDisabled: warmPalette.textMuted,
    inputColor: warmPalette.surface,
    actionColor: warmPalette.surfaceMuted,
    actionColorHover: warmPalette.accentSoft,
    actionColorPressed: warmPalette.surfaceMuted,
  },

  Notification: {
    color: warmPalette.surface,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: warmPalette.surface },
    },
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: warmPalette.background,
    siderColor: warmPalette.background,
    siderBorderColor: warmPalette.border,
  },

  Card: {
    color: warmPalette.surface,
    borderColor: warmPalette.border,
  },

  Table: {
    tdColor: warmPalette.surface,
    thColor: warmPalette.surfaceMuted,
  },
};
