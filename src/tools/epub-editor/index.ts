import { Book } from '@vicons/tabler';
import { translate } from '@/plugins/i18n.plugin';
import { defineTool } from '../tool';

export const tool = defineTool({
  name: translate('tools.epub-editor.title'),
  path: '/epub-editor',
  description: translate('tools.epub-editor.description'),
  keywords: [
    'epub',
    'editor',
    'converter',
    'simplified',
    'traditional',
    'chinese',
    'metadata',
  ],
  component: () => import('./epub-editor.vue'),
  icon: Book,
});
