import { Lock } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.password-generator.title'),
  path: '/password-generator',
  description: translate('tools.password-generator.description'),
  keywords: [
    'password',
    'generator',
    'passphrase',
    'pin',
    'random',
    'security',
    'token',
    '密碼',
    '密碼產生器',
    '隨機密碼',
    '安全密碼',
  ],
  component: () => import('./password-generator.vue'),
  icon: Lock,
});
