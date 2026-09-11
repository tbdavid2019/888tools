import QRCode from 'qrcode';
import type { WebMcpToolDefinition } from '../types';

export const qrCodeTool: WebMcpToolDefinition = {
  name: 'generate_qr_code',
  description: 'Generate a QR code image as an SVG string or Base64 Data URL from text or URL.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text, URL, or data payload to encode into QR code',
      },
      format: {
        type: 'string',
        enum: ['dataUrl', 'svg'],
        description: 'Output format: "dataUrl" (PNG image) or "svg" (vector SVG text). Default "dataUrl".',
        default: 'dataUrl',
      },
      errorCorrection: {
        type: 'string',
        enum: ['L', 'M', 'Q', 'H'],
        description: 'Error correction level: L (7%), M (15%), Q (25%), H (30%). Default "M".',
        default: 'M',
      },
      width: {
        type: 'number',
        description: 'Width in pixels for PNG dataUrl (default 300)',
        default: 300,
      },
    },
    required: ['text'],
  },
  execute: async ({ text, format = 'dataUrl', errorCorrection = 'M', width = 300 }) => {
    if (typeof text !== 'string' || !text.trim()) {
      return { isError: true, error: 'text must be a non-empty string' };
    }

    const ec = ['L', 'M', 'Q', 'H'].includes(errorCorrection) ? (errorCorrection as 'L' | 'M' | 'Q' | 'H') : 'M';

    try {
      if (format === 'svg') {
        const svg = await QRCode.toString(text, {
          type: 'svg',
          errorCorrectionLevel: ec,
          margin: 2,
        });

        return {
          success: true,
          format: 'svg',
          svg,
        };
      }

      const dataUrl = await QRCode.toDataURL(text, {
        errorCorrectionLevel: ec,
        margin: 2,
        width: Number(width) || 300,
      });

      return {
        success: true,
        format: 'dataUrl',
        dataUrl,
      };
    }
    catch (err: any) {
      return {
        isError: true,
        error: `Failed to generate QR code: ${err?.message || String(err)}`,
      };
    }
  },
};
