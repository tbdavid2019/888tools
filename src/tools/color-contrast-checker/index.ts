import { Contrast } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.color-contrast-checker.title'),
  path: '/color-contrast-checker',
  description: translate('tools.color-contrast-checker.description'),
  keywords: [
    'color',
    'colour',
    'contrast',
    'checker',
    'wcag',
    'a11y',
    'accessibility',
    'aa',
    'aaa',
    'luminance',
    'readability',
    '色彩',
    '對比',
    '對比度',
    '無障礙',
    '設計色彩',
    '配色',
    '檢測',
  ],
  component: () => import('./color-contrast-checker.vue'),
  icon: Contrast,
});
