export type RoutePattern = {
  paramNames: string[];
  regex: RegExp;
  toPath: (params: Record<string, string>) => string;
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseRoutePatterns(routes: string[]): Map<string, RoutePattern> {
  const patterns = new Map<string, RoutePattern>();

  for (const route of routes) {
    const segments = route.split('/');
    const paramNames: string[] = [];
    const regexParts: string[] = [];

    for (const segment of segments) {
      if (segment.startsWith(':')) {
        const paramName = segment.slice(1);
        paramNames.push(paramName);
        regexParts.push('([^/]+)');
      } else {
        regexParts.push(escapeRegex(segment));
      }
    }

    const regex = new RegExp(`^${regexParts.join('/')}$`);

    const toPath = (params: Record<string, string>): string => {
      return segments
        .map((segment) => {
          if (segment.startsWith(':')) {
            return params[segment.slice(1)];
          }
          return segment;
        })
        .join('/');
    };

    patterns.set(route, { paramNames, regex, toPath });
  }

  return patterns;
}

export function matchUrl(
  pathname: string,
  patterns: Map<string, RoutePattern>,
): { route: string; params: Record<string, string> } | null {
  // First pass: try exact (non-parameterized) patterns
  for (const [route, pattern] of patterns) {
    if (pattern.paramNames.length === 0 && pattern.regex.test(pathname)) {
      return { route, params: {} };
    }
  }

  // Second pass: try parameterized patterns
  for (const [route, pattern] of patterns) {
    if (pattern.paramNames.length === 0) continue;

    const match = pathname.match(pattern.regex);
    if (match) {
      const params: Record<string, string> = {};
      for (let i = 0; i < pattern.paramNames.length; i++) {
        params[pattern.paramNames[i]] = match[i + 1];
      }
      return { route, params };
    }
  }

  return null;
}
