import type { GlobalThemeOverrides } from 'naive-ui';
import { kanagawaDarkPalette, kanagawaLightPalette } from './theme/palette';

const appFontFamily = '\'Maple Mono\', \'Noto Sans TC\', \'PingFang TC\', \'Microsoft JhengHei\', sans-serif';

export const lightThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: appFontFamily,
    bodyColor: kanagawaLightPalette.background,
    cardColor: kanagawaLightPalette.surface,
    modalColor: kanagawaLightPalette.surface,
    popoverColor: kanagawaLightPalette.surface,
    tableColor: kanagawaLightPalette.surface,
    codeColor: kanagawaLightPalette.surfaceMuted,
    dividerColor: kanagawaLightPalette.border,
    borderColor: kanagawaLightPalette.border,
    borderRadius: '22px',
    primaryColor: kanagawaLightPalette.button,
    primaryColorHover: kanagawaLightPalette.buttonHover,
    primaryColorPressed: kanagawaLightPalette.buttonPressed,
    primaryColorSuppl: kanagawaLightPalette.buttonHover,
    infoColor: kanagawaLightPalette.button,
    infoColorHover: kanagawaLightPalette.buttonHover,
    infoColorPressed: kanagawaLightPalette.buttonPressed,
    successColor: kanagawaLightPalette.accent,
    successColorHover: '#dfbe57',
    successColorPressed: '#b99624',
    warningColor: kanagawaLightPalette.accent,
    warningColorHover: '#dfbe57',
    warningColorPressed: '#b99624',
    textColorBase: kanagawaLightPalette.text,
    textColor1: kanagawaLightPalette.text,
    textColor2: kanagawaLightPalette.textMuted,
    textColor3: kanagawaLightPalette.textMuted,
    placeholderColor: kanagawaLightPalette.textMuted,
    placeholderColorDisabled: kanagawaLightPalette.textMuted,
    inputColor: kanagawaLightPalette.surface,
    actionColor: kanagawaLightPalette.surfaceMuted,
  },

  Menu: {
    itemHeight: '32px',
  },

  Layout: {
    color: kanagawaLightPalette.background,
    siderColor: kanagawaLightPalette.background,
    siderBorderColor: kanagawaLightPalette.border,
  },

  Card: {
    color: kanagawaLightPalette.surface,
    borderColor: kanagawaLightPalette.border,
  },

  Button: {
    textColorTextPrimary: kanagawaLightPalette.button,
    textColorTextPrimaryHover: kanagawaLightPalette.buttonHover,
    textColorTextPrimaryPressed: kanagawaLightPalette.buttonPressed,
  },

  Select: {
    peers: {
      InternalSelection: {
        color: kanagawaLightPalette.surface,
        colorActive: kanagawaLightPalette.surface,
        colorDisabled: kanagawaLightPalette.surfaceMuted,
        border: `1px solid ${kanagawaLightPalette.border}`,
        borderActive: `1px solid ${kanagawaLightPalette.button}`,
        borderHover: `1px solid ${kanagawaLightPalette.button}`,
        textColor: kanagawaLightPalette.text,
        placeholderColor: kanagawaLightPalette.textMuted,
        caretColor: kanagawaLightPalette.textMuted,
      },
      InternalSelectMenu: {
        color: kanagawaLightPalette.surface,
        optionTextColor: kanagawaLightPalette.text,
        optionTextColorPressed: kanagawaLightPalette.text,
        optionColorPending: 'rgba(126, 156, 216, 0.18)',
      },
    },
  },

  Input: {
    color: kanagawaLightPalette.surface,
    colorFocus: kanagawaLightPalette.surface,
    textColor: kanagawaLightPalette.text,
    placeholderColor: kanagawaLightPalette.textMuted,
    border: `1px solid ${kanagawaLightPalette.border}`,
    borderHover: `1px solid ${kanagawaLightPalette.button}`,
    borderFocus: `1px solid ${kanagawaLightPalette.button}`,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: kanagawaLightPalette.surface },
    },
  },
};

export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    fontFamily: appFontFamily,
    bodyColor: kanagawaDarkPalette.background,
    cardColor: kanagawaDarkPalette.surface,
    modalColor: kanagawaDarkPalette.surface,
    popoverColor: kanagawaDarkPalette.surface,
    tableColor: kanagawaDarkPalette.surface,
    codeColor: kanagawaDarkPalette.surfaceMuted,
    dividerColor: kanagawaDarkPalette.border,
    borderColor: kanagawaDarkPalette.border,
    borderRadius: '22px',
    primaryColor: kanagawaDarkPalette.button,
    primaryColorHover: kanagawaDarkPalette.buttonHover,
    primaryColorPressed: kanagawaDarkPalette.buttonPressed,
    primaryColorSuppl: kanagawaDarkPalette.buttonHover,
    infoColor: kanagawaDarkPalette.button,
    infoColorHover: kanagawaDarkPalette.buttonHover,
    infoColorPressed: kanagawaDarkPalette.buttonPressed,
    successColor: kanagawaDarkPalette.accent,
    successColorHover: '#dfbe57',
    successColorPressed: '#b99624',
    warningColor: kanagawaDarkPalette.accent,
    warningColorHover: '#dfbe57',
    warningColorPressed: '#b99624',
    textColorBase: kanagawaDarkPalette.text,
    textColor1: kanagawaDarkPalette.text,
    textColor2: kanagawaDarkPalette.textMuted,
    textColor3: kanagawaDarkPalette.textMuted,
    placeholderColor: kanagawaDarkPalette.textMuted,
    placeholderColorDisabled: kanagawaDarkPalette.textMuted,
    inputColor: kanagawaDarkPalette.surface,
    actionColor: kanagawaDarkPalette.surfaceMuted,
  },

  Notification: {
    color: kanagawaDarkPalette.surface,
  },

  AutoComplete: {
    peers: {
      InternalSelectMenu: { height: '500px', color: kanagawaDarkPalette.surface },
    },
  },

  Menu: {
    itemHeight: '32px',
  },

  Select: {
    peers: {
      InternalSelection: {
        color: kanagawaDarkPalette.surface,
        colorActive: kanagawaDarkPalette.surface,
        colorDisabled: kanagawaDarkPalette.surfaceMuted,
        border: `1px solid ${kanagawaDarkPalette.border}`,
        borderActive: `1px solid ${kanagawaDarkPalette.button}`,
        borderHover: `1px solid ${kanagawaDarkPalette.button}`,
        textColor: kanagawaDarkPalette.text,
        placeholderColor: kanagawaDarkPalette.textMuted,
        caretColor: kanagawaDarkPalette.textMuted,
      },
      InternalSelectMenu: {
        color: kanagawaDarkPalette.surface,
        optionTextColor: kanagawaDarkPalette.text,
        optionTextColorPressed: kanagawaDarkPalette.text,
        optionColorPending: 'rgba(126, 156, 216, 0.2)',
      },
    },
  },

  Input: {
    color: kanagawaDarkPalette.surface,
    colorFocus: kanagawaDarkPalette.surface,
    textColor: kanagawaDarkPalette.text,
    placeholderColor: kanagawaDarkPalette.textMuted,
    border: `1px solid ${kanagawaDarkPalette.border}`,
    borderHover: `1px solid ${kanagawaDarkPalette.button}`,
    borderFocus: `1px solid ${kanagawaDarkPalette.button}`,
  },

  Layout: {
    color: kanagawaDarkPalette.background,
    siderColor: kanagawaDarkPalette.background,
    siderBorderColor: kanagawaDarkPalette.border,
  },

  Card: {
    color: kanagawaDarkPalette.surface,
    borderColor: kanagawaDarkPalette.border,
  },

  Table: {
    tdColor: kanagawaDarkPalette.surface,
    thColor: kanagawaDarkPalette.surfaceMuted,
  },
};
