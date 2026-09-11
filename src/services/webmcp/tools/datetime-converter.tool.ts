import {
  formatISO,
  formatISO9075,
  formatRFC3339,
  formatRFC7231,
  getUnixTime,
  isValid,
  parseISO,
} from 'date-fns';
import type { WebMcpToolDefinition } from '../types';

export const datetimeConverterTool: WebMcpToolDefinition = {
  name: 'convert_datetime',
  description: 'Convert between Unix timestamps, ISO 8601, ISO 9075, RFC 3339, and RFC 7231 date-time formats.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description: 'Input date string, ISO timestamp, or Unix epoch number (seconds or milliseconds). If omitted or "now", current time is used.',
        default: 'now',
      },
    },
  },
  execute: ({ input = 'now' }) => {
    let date: Date;

    if (!input || input === 'now') {
      date = new Date();
    }
    else if (typeof input === 'number' || /^\d+$/.test(String(input).trim())) {
      const num = Number(input);
      // Determine if seconds or milliseconds
      date = num < 10000000000 ? new Date(num * 1000) : new Date(num);
    }
    else {
      const parsed = parseISO(String(input).trim());
      date = isValid(parsed) ? parsed : new Date(String(input).trim());
    }

    if (!isValid(date)) {
      return {
        isError: true,
        error: `Cannot parse date from input: "${input}"`,
      };
    }

    return {
      success: true,
      timestampMs: date.getTime(),
      unixTimestampSec: getUnixTime(date),
      iso8601: formatISO(date),
      iso9075: formatISO9075(date),
      rfc3339: formatRFC3339(date),
      rfc7231: formatRFC7231(date),
      utc: date.toUTCString(),
    };
  },
};
