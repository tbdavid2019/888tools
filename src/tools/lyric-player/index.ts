import { Music } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.lyric-player.title'),
  path: '/lyric-player',
  description: translate('tools.lyric-player.description'),
  keywords: ['lyrics', 'lrc', 'whisper', 'audio', 'music', 'transcription', 'karaoke'],
  component: () => import('./lyric-player.vue'),
  icon: Music,
  createdAt: new Date('2026-05-26'),
});
