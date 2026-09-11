import { type FormatOptionsWithLanguage, format as formatSQL } from 'sql-formatter';
import type { WebMcpToolDefinition } from '../types';

export const sqlPrettifyTool: WebMcpToolDefinition = {
  name: 'prettify_sql',
  description: 'Format, prettify, and indent SQL queries with customizable dialect and uppercase/lowercase keywords.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      sql: {
        type: 'string',
        description: 'Raw SQL query string to format',
      },
      dialect: {
        type: 'string',
        enum: ['sql', 'mysql', 'postgresql', 'sqlite', 'bigquery', 'mariadb', 'tsql', 'plsql', 'redshift', 'spark'],
        description: 'SQL dialect (default "sql")',
        default: 'sql',
      },
      keywordCase: {
        type: 'string',
        enum: ['upper', 'lower', 'preserve'],
        description: 'Keyword letter casing (default "upper")',
        default: 'upper',
      },
      indent: {
        type: 'number',
        description: 'Number of spaces for indentation (default 2)',
        default: 2,
      },
    },
    required: ['sql'],
  },
  execute: ({ sql, dialect = 'sql', keywordCase = 'upper', indent = 2 }) => {
    if (typeof sql !== 'string' || !sql.trim()) {
      return { isError: true, error: 'sql query must be a non-empty string' };
    }

    try {
      const formatted = formatSQL(sql, {
        language: dialect as FormatOptionsWithLanguage['language'],
        keywordCase: keywordCase as any,
        tabWidth: Math.max(1, Math.min(Number(indent) || 2, 8)),
        linesBetweenQueries: 2,
      });

      return {
        success: true,
        dialect,
        formattedSql: formatted,
      };
    }
    catch (err: any) {
      return {
        isError: true,
        error: `Failed to format SQL: ${err?.message || String(err)}`,
      };
    }
  },
};
