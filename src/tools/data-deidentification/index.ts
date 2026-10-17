import { ShieldLock } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.data-deidentification.title'),
  path: '/data-deidentification',
  description: translate('tools.data-deidentification.description'),
  keywords: [
    'data',
    'deidentification',
    'pii',
    'mask',
    'anonymize',
    'redaction',
    'taiwan',
    'id',
    'restore',
    '去識別化',
    '個資遮罩',
    '脫敏',
    '還原',
  ],
  component: () => import('./data-deidentification.vue'),
  icon: ShieldLock,
  createdAt: new Date('2026-10-18'),
});
