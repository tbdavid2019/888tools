import { Clock } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.online-clock.title'),
  path: '/online-clock',
  description: translate('tools.online-clock.description'),
  keywords: [
    'time',
    'clock',
    'online-clock',
    'online clock',
    'timer',
    'watch',
    'digital',
    'analog',
    'flip',
    'timezone',
    'ntp',
    '時鐘',
    '時間',
    '線上時鐘',
    '翻頁時鐘',
    '數位時鐘',
    '模擬時鐘',
    '電子鐘',
    '網路校時',
  ],
  component: () => import('./online-clock.vue'),
  icon: Clock,
  createdAt: new Date('2026-06-23'),
});
