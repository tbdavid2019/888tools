import { ForumOutlined } from '@vicons/material';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.p2p-chat.title'),
  path: '/p2p-chat',
  description: translate('tools.p2p-chat.description'),
  keywords: ['p2p', 'chat', 'webrtc', 'peerjs', 'encrypted', 'e2ee', 'private', 'secure'],
  component: () => import('./p2p-chat.vue'),
  icon: ForumOutlined,
  createdAt: new Date('2026-07-09'),
});
