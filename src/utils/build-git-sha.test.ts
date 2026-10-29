import { describe, expect, it } from 'vitest';
import { resolveBuildGitSha } from './build-git-sha';

describe('resolveBuildGitSha', () => {
  it('uses and shortens the CI commit SHA', () => {
    expect(resolveBuildGitSha('abcdef0123456789')).toBe('abcdef0');
  });

  it('uses the local Git SHA outside CI', () => {
    expect(resolveBuildGitSha(undefined, '123456789abcdef0')).toBe('1234567');
  });

  it('uses a clear fallback when neither SHA is available', () => {
    expect(resolveBuildGitSha()).toBe('local');
  });
});
