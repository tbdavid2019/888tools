import { defineConfig } from 'figue';
import { siteConfig } from '../site.config.js';

interface SimpleSchema<T> {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly types?: { readonly input: unknown; readonly output: T };
    readonly validate: (value: unknown) => { readonly value: T } | { readonly issues: ReadonlyArray<{ readonly message: string }> };
  };
}

function createSchema<T>(validateValue: (value: unknown) => { value: T } | { message: string }): SimpleSchema<T> {
  return {
    '~standard': {
      version: 1,
      vendor: '888tools',
      validate(value: unknown) {
        const result = validateValue(value);
        return 'message' in result ? { issues: [{ message: result.message }] } : { value: result.value };
      },
    },
  };
}

const stringSchema = createSchema<string>(value =>
  typeof value === 'string' ? { value } : { message: `Expected string, got ${typeof value}` },
);

const booleanSchema = createSchema<boolean>((value) => {
  if (typeof value === 'boolean') {
    return { value };
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') {
      return { value: true };
    }
    if (normalized === 'false' || normalized === '0') {
      return { value: false };
    }
  }
  return { message: `Expected boolean, got ${String(value)}` };
});

function enumSchema<const T extends readonly string[]>(values: T) {
  return createSchema<T[number]>(value =>
    typeof value === 'string' && values.includes(value)
      ? { value: value as T[number] }
      : { message: `Expected one of [${values.join(', ')}], got ${String(value)}` },
  );
}

export const { config } = defineConfig(
  {
    app: {
      gitSha: {
        doc: 'Application build Git SHA',
        schema: stringSchema,
        default: 'local',
        env: 'GIT_SHA',
      },
      baseUrl: {
        doc: 'Application base url',
        schema: stringSchema,
        default: '/',
        env: 'BASE_URL',
      },
      siteOrigin: {
        doc: 'Application canonical site origin',
        schema: stringSchema,
        default: siteConfig.origin,
        env: 'VITE_SITE_ORIGIN',
      },
      env: {
        doc: 'Application current env',
        schema: enumSchema(['production', 'development', 'preview', 'test']),
        default: 'development',
        env: 'VITE_APP_ENV',
      },
    },
    plausible: {
      isTrackerEnabled: {
        doc: 'Is the tracker enabled',
        schema: booleanSchema,
        default: false,
        env: 'VITE_TRACKER_ENABLED',
      },
      domain: {
        doc: 'Plausible current domain',
        schema: stringSchema,
        default: '',
        env: 'VITE_PLAUSIBLE_DOMAIN',
      },
      apiHost: {
        doc: 'Plausible remote api host',
        schema: stringSchema,
        default: '',
        env: 'VITE_PLAUSIBLE_API_HOST',
      },
      trackLocalhost: {
        doc: 'Enable or disable localhost tracking by plausible',
        schema: booleanSchema,
        default: false,
      },
    },
    ga: {
      measurementId: {
        doc: 'Google Analytics 4 measurement ID',
        schema: stringSchema,
        default: 'G-73FLRKFM5F',
        env: 'VITE_GA_MEASUREMENT_ID',
      },
      isEnabled: {
        doc: 'Enable or disable Google Analytics 4 tracking',
        schema: booleanSchema,
        default: true,
        env: 'VITE_GA_ENABLED',
      },
    },
    p2pChat: {
      signalingUrl: {
        doc: 'P2P chat room signaling Worker URL',
        schema: stringSchema,
        default: 'https://david888-p2p-room-signal.oobwei.workers.dev',
        env: 'VITE_P2P_ROOM_SIGNALING_URL',
      },
    },
    showBanner: {
      doc: 'Show the banner',
      schema: booleanSchema,
      default: false,
      env: 'VITE_SHOW_BANNER',
    },
    showSponsorBanner: {
      doc: 'Show the sponsor banner',
      schema: booleanSchema,
      default: false,
      env: 'VITE_SHOW_SPONSOR_BANNER',
    },
  },
  {
    envSource: {
      ...import.meta.env,
      // GIT_SHA is statically replaced during build time (see 'define' in vite.config.ts).
      GIT_SHA: import.meta.env.GIT_SHA,
    },
  },
);
