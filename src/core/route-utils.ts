/**
 * Resolves which tab a route belongs to based on its first path segment.
 * "home/detail/comments" -> "home"
 * "home" -> "home"
 */
export function resolveTabForRoute(route: string, tabOrder: string[]): string | null {
  const firstSegment = route.split('/')[0];
  return tabOrder.includes(firstSegment) ? firstSegment : null;
}

/**
 * Finds the closest match for a string from a list of candidates
 * using Levenshtein distance. Returns null if no candidates exist
 * or the best match distance exceeds the threshold.
 */
export function findClosestMatch(
  input: string,
  candidates: string[],
  maxDistance = 5,
): string | null {
  if (candidates.length === 0) return null;

  let bestMatch: string | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(input, candidate);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = candidate;
    }
  }

  return bestDistance <= maxDistance ? bestMatch : null;
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Use a single-row DP approach for space efficiency
  const prev = new Array<number>(n + 1);
  const curr = new Array<number>(n + 1);

  for (let j = 0; j <= n; j++) {
    prev[j] = j;
  }

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        curr[j] = prev[j - 1];
      } else {
        curr[j] = 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
      }
    }
    // Copy curr to prev
    for (let j = 0; j <= n; j++) {
      prev[j] = curr[j];
    }
  }

  return prev[n];
}
