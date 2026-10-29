const SHORT_SHA_LENGTH = 7;

export function resolveBuildGitSha(ciSha?: string, localSha?: string) {
  const sha = ciSha?.trim() || localSha?.trim();
  return sha ? sha.slice(0, SHORT_SHA_LENGTH) : 'local';
}
