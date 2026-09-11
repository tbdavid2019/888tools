import { colord, extend } from 'colord';
import a11yPlugin from 'colord/plugins/a11y';
import cmykPlugin from 'colord/plugins/cmyk';
import namesPlugin from 'colord/plugins/names';
import type { WebMcpToolDefinition } from '../types';

extend([a11yPlugin, cmykPlugin, namesPlugin]);

export const colorConverterTool: WebMcpToolDefinition = {
  name: 'convert_color',
  description: 'Convert colors between HEX, RGB, HSL, and CMYK color models with luminance, accessibility contrast, and color naming.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      color: {
        type: 'string',
        description: 'Input color in any valid CSS format (e.g. "#3498db", "rgb(52, 152, 219)", "hsl(204, 70%, 53%)", "dodgerblue")',
      },
    },
    required: ['color'],
  },
  execute: ({ color }) => {
    if (typeof color !== 'string' || !color.trim()) {
      return { isError: true, error: 'color must be a non-empty string' };
    }

    try {
      const parsed = colord(color.trim());
      if (!parsed.isValid()) {
        return { isError: true, isValid: false, error: `Invalid color format: "${color}"` };
      }

      return {
        success: true,
        isValid: true,
        hex: parsed.toHex(),
        rgb: parsed.toRgbString(),
        hsl: parsed.toHslString(),
        cmyk: parsed.toCmykString(),
        alpha: parsed.alpha(),
        luminance: Number(parsed.luminance().toFixed(2)),
        isDark: parsed.isDark(),
        isLight: parsed.isLight(),
      };
    }
    catch (err: any) {
      return { isError: true, error: `Color conversion failed: ${err?.message || String(err)}` };
    }
  },
};
