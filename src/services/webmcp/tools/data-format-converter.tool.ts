import { parse as parseToml, stringify as stringifyToml } from 'iarna-toml-esm';
import convert from 'xml-js';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import type { WebMcpToolDefinition } from '../types';

export const dataFormatConverterTool: WebMcpToolDefinition = {
  name: 'convert_data_format',
  description: 'Convert data between JSON, YAML, TOML, and XML formats with full bidirectional conversion support.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Input text content in the source format',
      },
      from: {
        type: 'string',
        enum: ['json', 'yaml', 'toml', 'xml'],
        description: 'Source data format: "json", "yaml", "toml", or "xml"',
      },
      to: {
        type: 'string',
        enum: ['json', 'yaml', 'toml', 'xml'],
        description: 'Target data format: "json", "yaml", "toml", or "xml"',
      },
      indent: {
        type: 'number',
        description: 'Number of spaces for indentation (where applicable, default 2)',
        default: 2,
      },
    },
    required: ['content', 'from', 'to'],
  },
  execute: ({ content, from, to, indent = 2 }) => {
    if (typeof content !== 'string' || !content.trim()) {
      return { isError: true, error: 'Input content must be a non-empty string' };
    }

    const srcFormat = String(from).toLowerCase();
    const dstFormat = String(to).toLowerCase();
    const spaces = Math.max(1, Math.min(Number(indent) || 2, 8));

    let parsedObj: any;

    try {
      switch (srcFormat) {
        case 'json':
          parsedObj = JSON.parse(content);
          break;
        case 'yaml':
        case 'yml':
          parsedObj = parseYaml(content, { merge: true });
          break;
        case 'toml':
          parsedObj = parseToml(content);
          break;
        case 'xml': {
          const raw = convert.xml2js(content, { compact: true });
          parsedObj = raw;
          break;
        }
        default:
          return { isError: true, error: `Unsupported source format: ${from}` };
      }
    }
    catch (err: any) {
      return { isError: true, error: `Failed to parse ${from.toUpperCase()} content: ${err?.message || String(err)}` };
    }

    try {
      let outputText = '';
      switch (dstFormat) {
        case 'json':
          outputText = JSON.stringify(parsedObj, null, spaces);
          break;
        case 'yaml':
        case 'yml':
          outputText = stringifyYaml(parsedObj, { indent: spaces });
          break;
        case 'toml':
          outputText = [stringifyToml(parsedObj)].flat().join('\n').trim();
          break;
        case 'xml':
          outputText = convert.js2xml(parsedObj, { compact: true, spaces });
          break;
        default:
          return { isError: true, error: `Unsupported target format: ${to}` };
      }

      return {
        success: true,
        from: srcFormat,
        to: dstFormat,
        result: outputText,
      };
    }
    catch (err: any) {
      return { isError: true, error: `Failed to format to ${to.toUpperCase()}: ${err?.message || String(err)}` };
    }
  },
};
