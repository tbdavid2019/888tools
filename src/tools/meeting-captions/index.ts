import { Microphone } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.meeting-captions.title'),
  path: '/meeting-captions',
  description: translate('tools.meeting-captions.description'),
  keywords: ['whisper', 'meeting', 'captions', 'transcription', 'microphone', 'live', 'subtitle'],
  component: () => import('./meeting-captions.vue'),
  icon: Microphone,
  createdAt: new Date('2026-06-23'),
});
