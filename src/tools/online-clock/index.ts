import { Clock } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.online-clock.title'),
  path: '/online-clock',
  description: translate('tools.online-clock.description'),
  keywords: ['clock', 'time', 'flip'],
  component: () => import('./online-clock.vue'),
  icon: Clock,
  createdAt: new Date('2026-06-23'),
});
