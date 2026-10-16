import { Palette } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.color-converter.title'),
  path: '/color-converter',
  description: translate('tools.color-converter.description'),
  keywords: [
    'color',
    'converter',
    'pantone',
    '潘通',
    '色票',
    'delta e',
    'delta e 2000',
    'cmyk',
    'hex',
    'rgb',
    'hsl',
    'eyedropper',
    '滴管',
    '取色',
    '截圖取色',
    '設計色彩',
  ],
  component: () => import('./color-converter.vue'),
  icon: Palette,
  redirectFrom: ['/color-picker-converter'],
});
