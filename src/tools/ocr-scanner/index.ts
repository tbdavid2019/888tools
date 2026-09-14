import { IconTextRecognition } from '@tabler/icons-vue';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.ocr-scanner.title'),
  path: '/ocr-scanner',
  description: translate('tools.ocr-scanner.description'),
  keywords: [
    'ocr',
    'scanner',
    'webgpu',
    'paddleocr',
    'ppocr',
    'table',
    'text',
    'image',
    'recognition',
    'excel',
    '文字辨識',
    '表格辨識',
    '提取文字',
    '二維表格',
  ],
  component: () => import('./ocr-scanner.vue'),
  icon: IconTextRecognition,
  createdAt: new Date('2026-09-14'),
});
