import { FileSearch } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.file-type-detector.title'),
  path: '/file-type-detector',
  description: translate('tools.file-type-detector.description'),
  keywords: ['file', 'type', 'mime', 'detector', 'sniffer', 'magika', 'ebook', 'epub', 'format', 'inspector'],
  component: () => import('./file-type-detector.vue'),
  icon: FileSearch,
  createdAt: new Date('2025-01-15'),
});
