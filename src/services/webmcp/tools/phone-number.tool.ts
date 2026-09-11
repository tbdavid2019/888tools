import lookup from 'country-code-lookup';
import { type CountryCode, parsePhoneNumber } from 'libphonenumber-js/max';
import type { WebMcpToolDefinition } from '../types';

export const phoneNumberTool: WebMcpToolDefinition = {
  name: 'parse_phone_number',
  description: 'Parse, validate, and format an international phone number (E.164, national, RFC3966) using Google libphonenumber.',
  readOnlyHint: true,
  inputSchema: {
    type: 'object',
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Phone number string to parse (e.g. "+886 912 345 678" or "0912345678")',
      },
      defaultCountry: {
        type: 'string',
        description: 'Default 2-letter ISO country code fallback if number lacks country prefix (e.g. "TW", "US", "JP")',
        default: 'TW',
      },
    },
    required: ['phoneNumber'],
  },
  execute: ({ phoneNumber, defaultCountry = 'TW' }) => {
    if (typeof phoneNumber !== 'string' || !phoneNumber.trim()) {
      return { isError: true, error: 'phoneNumber must be a non-empty string' };
    }

    try {
      const countryCode = (String(defaultCountry || 'TW').toUpperCase()) as CountryCode;
      const parsed = parsePhoneNumber(phoneNumber.trim(), countryCode);

      if (!parsed) {
        return { isValid: false, error: 'Unable to parse phone number' };
      }

      const isValid = parsed.isValid();
      const countryInfo = parsed.country ? lookup.byIso(parsed.country) : undefined;

      return {
        isValid,
        country: parsed.country,
        countryName: countryInfo?.country,
        countryCallingCode: parsed.countryCallingCode,
        nationalNumber: parsed.nationalNumber,
        internationalFormat: parsed.formatInternational(),
        nationalFormat: parsed.formatNational(),
        e164: parsed.format('E.164'),
        rfc3966: parsed.getURI(),
        type: parsed.getType(),
      };
    }
    catch (err: any) {
      return {
        isValid: false,
        error: err?.message || String(err),
      };
    }
  },
};
