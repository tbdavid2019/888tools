import type { WebMcpToolDefinition } from '../types';

export const safelinkDecoderTool: WebMcpToolDefinition = {
  name: 'decode_safelink',
  description: 'Decode Outlook / Microsoft Office 365 or Google SafeLinks protected URLs back into their original target destination URL.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The SafeLinks protected URL (e.g. https://nam01.safelinks.protection.outlook.com/...)',
      },
    },
    required: ['url'],
  },
  execute: ({ url }) => {
    if (!url || typeof url !== 'string') {
      return { isError: true, error: 'URL string required' };
    }

    try {
      const parsed = new URL(url.trim());
      if (parsed.hostname.includes('safelinks.protection.outlook.com')) {
        const targetUrl = parsed.searchParams.get('url');
        if (targetUrl) {
          return {
            originalSafeLink: url,
            decodedUrl: targetUrl,
            service: 'Microsoft Outlook SafeLinks',
          };
        }
      }

      if (parsed.hostname.includes('google.com') && parsed.pathname === '/url') {
        const targetUrl = parsed.searchParams.get('q') || parsed.searchParams.get('url');
        if (targetUrl) {
          return {
            originalSafeLink: url,
            decodedUrl: targetUrl,
            service: 'Google Redirect',
          };
        }
      }

      // Check any standard url parameter
      const genericUrl = parsed.searchParams.get('url') || parsed.searchParams.get('target') || parsed.searchParams.get('dest');
      if (genericUrl) {
        return {
          originalSafeLink: url,
          decodedUrl: genericUrl,
          service: 'Generic Redirect',
        };
      }

      return {
        originalSafeLink: url,
        decodedUrl: url,
        note: 'No redirection parameter found in the provided URL.',
      };
    }
    catch (e: any) {
      return {
        isError: true,
        error: `Failed to parse URL: ${e?.message || String(e)}`,
      };
    }
  },
};
