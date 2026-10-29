import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

type DeepMerge = (target: unknown, source: unknown) => Record<string, unknown>;

// Resolve deepmerge from the same dependency chain Workbox uses while bundling:
// workbox-build -> @rollup/plugin-node-resolve -> deepmerge.
const require = createRequire(import.meta.url);
const workboxBuildRequire = createRequire(require.resolve('workbox-build'));
const nodeResolveRequire = createRequire(
  workboxBuildRequire.resolve('@rollup/plugin-node-resolve'),
);
const merge = nodeResolveRequire('deepmerge') as DeepMerge;

describe('patched deepmerge resolved through Workbox', () => {
  it('does not allow a source __proto__ key to poison a nested result', () => {
    const source = JSON.parse('{"session":{"__proto__":{"isAdmin":true}}}');
    const result = merge({ session: null }, source);
    const session = result.session as Record<string, unknown>;

    expect(Object.getPrototypeOf(session)).toBe(Object.prototype);
    expect(session.isAdmin).toBeUndefined();
    expect(({} as { isAdmin?: boolean }).isAdmin).toBeUndefined();
  });

  it('does not copy an own __proto__ key from the target', () => {
    const target = JSON.parse('{"__proto__":{"isAdmin":true},"debug":false}');
    const result = merge(target, { verbose: true });

    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(Object.hasOwn(result, '__proto__')).toBe(false);
    expect(result.isAdmin).toBeUndefined();
    expect(result.debug).toBe(false);
    expect(result.verbose).toBe(true);
  });

  it('continues to merge ordinary nested objects', () => {
    expect(merge(
      { settings: { theme: 'light', compact: false } },
      { settings: { compact: true }, ready: true },
    )).toEqual({
      settings: { theme: 'light', compact: true },
      ready: true,
    });
  });
});
