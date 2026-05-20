import { BrandTwitter } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.post-writer.title'),
  path: '/post-writer',
  description: translate('tools.post-writer.description'),
  keywords: ['post', 'writer', 'editor', 'facebook', 'instagram', 'threads', 'broetry', 'magazine', 'align'],
  component: () => import('./post-writer.vue'),
  icon: BrandTwitter,
});
