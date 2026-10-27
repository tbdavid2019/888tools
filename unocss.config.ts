import {
  defineConfig,
  presetAttributify,
  presetTypography,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss';

import { presetScrollbar } from 'unocss-preset-scrollbar';

export default defineConfig({
  presets: [presetUno(), presetAttributify({ ignoreAttributes: ['size'] }), presetTypography(), presetScrollbar()],
  transformers: [transformerDirectives(), transformerVariantGroup()],
  theme: {
    fontSize: {
      xs: 'var(--type-caption)',
      sm: 'var(--type-label)',
      base: 'var(--type-body)',
      lg: 'var(--type-subheading)',
      xl: 'var(--type-card-title)',
      '2xl': 'var(--type-section-title)',
      '3xl': 'var(--type-page-title)',
    },
    colors: {
      primary: '#17324D',
      saffron: '#FFB010',
      clay: '#A9471D',
      ink: '#2B251A',
      cream: '#FFF9E8',
      canvas: '#FFF0CC',
    },
  },
  shortcuts: {
    'pretty-scrollbar': 'scrollbar scrollbar-rounded scrollbar-thumb-color-gray-300 scrollbar-track-color-gray-100 dark:scrollbar-thumb-color-#424242 dark:scrollbar-track-color-#686868',
    'divider': 'h-1px bg-current op-10',
    'bg-surface': 'bg-#fff9e8 dark:bg-#172636',
    'bg-background': 'bg-#fff0cc dark:bg-#101b27',
  },
});
