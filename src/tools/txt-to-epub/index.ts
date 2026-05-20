import { Book } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.txt-to-epub.title'),
  path: '/txt-to-epub',
  description: translate('tools.txt-to-epub.description'),
  keywords: ['txt', 'epub', 'book', 'novel', 'ebook', 'generator', 'converter'],
  component: () => import('./txt-to-epub.vue'),
  icon: Book,
});
