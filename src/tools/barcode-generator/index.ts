import { Barcode } from '@vicons/tabler';
import { defineTool } from '../tool';
import { translate } from '@/plugins/i18n.plugin';

export const tool = defineTool({
  name: translate('tools.barcode-generator.title'),
  path: '/barcode-generator',
  description: translate('tools.barcode-generator.description'),
  keywords: ['barcode', 'generator', 'bwip-js', 'pdf417', 'qrcode', 'datamatrix', 'ean13'],
  component: () => import('./barcode-generator.vue'),
  icon: Barcode,
  createdAt: new Date('2025-12-31'),
});