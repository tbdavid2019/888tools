import { isValidCron } from 'cron-validator';
import cronstrue from 'cronstrue';
import type { WebMcpToolDefinition } from '../types';

export const crontabTool: WebMcpToolDefinition = {
  name: 'parse_crontab_expression',
  description: 'Validate and parse a Cron schedule expression into human-readable description.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      expression: {
        type: 'string',
        description: 'Cron expression string (e.g. "*/15 * * * *" or "0 0 1 1 *")',
      },
    },
    required: ['expression'],
  },
  execute: ({ expression }) => {
    if (typeof expression !== 'string' || !expression.trim()) {
      return { isError: true, error: 'Expression must be a non-empty string' };
    }

    const trimmed = expression.trim();
    const valid = isValidCron(trimmed, { allowBlankDay: true, alias: true, seconds: true });

    if (!valid) {
      return {
        isValid: false,
        expression: trimmed,
        description: 'Invalid cron expression',
      };
    }

    try {
      const description = cronstrue.toString(trimmed, {
        verbose: true,
        use24HourTimeFormat: true,
        throwExceptionOnParseError: false,
      });

      return {
        isValid: true,
        expression: trimmed,
        description,
      };
    }
    catch (err: any) {
      return {
        isValid: false,
        expression: trimmed,
        error: err?.message || String(err),
      };
    }
  },
};
