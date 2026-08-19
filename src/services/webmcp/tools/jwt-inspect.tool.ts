import jwtDecode, { type JwtHeader, type JwtPayload } from 'jwt-decode';
import type { WebMcpToolDefinition } from '../types';

export const jwtInspectTool: WebMcpToolDefinition = {
  name: 'inspect_jwt',
  description: 'Decode and inspect a JSON Web Token (JWT) header and payload without verifying cryptographic signature.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      jwt: {
        type: 'string',
        description: 'The JWT string to decode (e.g. eyJhbGciOi...)',
      },
    },
    required: ['jwt'],
  },
  execute: ({ jwt }) => {
    if (!jwt || typeof jwt !== 'string') {
      return { isError: true, error: 'JWT token string required' };
    }

    try {
      const trimmed = jwt.trim();
      const header = jwtDecode<JwtHeader>(trimmed, { header: true });
      const payload = jwtDecode<JwtPayload>(trimmed);

      let isExpired = false;
      let expiresAt: string | undefined;
      let issuedAt: string | undefined;

      if (payload.exp) {
        const expDate = new Date(payload.exp * 1000);
        expiresAt = expDate.toISOString();
        isExpired = Date.now() > expDate.getTime();
      }

      if (payload.iat) {
        issuedAt = new Date(payload.iat * 1000).toISOString();
      }

      return {
        valid: true,
        header,
        payload,
        metadata: {
          isExpired,
          expiresAt,
          issuedAt,
          issuer: payload.iss,
          subject: payload.sub,
          audience: payload.aud,
        },
      };
    }
    catch (e: any) {
      return {
        valid: false,
        isError: true,
        error: `Failed to decode JWT: ${e?.message || String(e)}`,
      };
    }
  },
};
