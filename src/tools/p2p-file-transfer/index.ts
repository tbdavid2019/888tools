import { WifiTetheringOutlined } from '@vicons/material';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.p2p-file-transfer.title'),
  path: '/p2p-file-transfer',
  description: translate('tools.p2p-file-transfer.description'),
  keywords: ['p2p', 'file', 'transfer', 'webrtc', 'peerjs', 'share', 'direct'],
  component: () => import('./p2p-file-transfer.vue'),
  icon: WifiTetheringOutlined,
  createdAt: new Date('2026-06-23'),
});
