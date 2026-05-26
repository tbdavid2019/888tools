import { ColorSwatch } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.find-color.title'),
  path: '/find-color',
  description: translate('tools.find-color.description'),
  keywords: ['color', 'palette', 'pantone', 'pinterest', '2026', '2025', '2024', 'design', 'brand'],
  component: () => import('./find-color.vue'),
  icon: ColorSwatch,
});
