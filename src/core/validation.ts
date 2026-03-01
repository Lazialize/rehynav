export function validateStackRoutes(stacks: Record<string, unknown>, tabs: string[]): void {
  if (process.env.NODE_ENV === 'production') return;

  for (const stackRoute of Object.keys(stacks)) {
    const prefix = stackRoute.split('/')[0];
    if (!tabs.includes(prefix)) {
      console.error(
        `[rehynav] Stack route "${stackRoute}" has prefix "${prefix}" which is not a registered tab. ` +
          `Registered tabs: ${tabs.join(', ')}`,
      );
    }
  }
}

export function validateSerializable(params: Record<string, unknown>, context: string): void {
  if (process.env.NODE_ENV === 'production') return;

  function check(value: unknown, path: string): void {
    if (value === null || value === undefined) return;

    const type = typeof value;
    if (type === 'function' || type === 'symbol') {
      console.error(
        `[rehynav] Non-serializable value in ${context} ${path}: ${type}. ` +
          `Route params must be serializable (string, number, boolean, null, arrays, plain objects). ` +
          `Use the action string pattern for callbacks. See docs for recommended patterns.`,
      );
      return;
    }

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        check(value[i], `${path}[${i}]`);
      }
      return;
    }

    if (type === 'object') {
      for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
        check(val, `${path}.${key}`);
      }
    }
  }

  for (const [key, value] of Object.entries(params)) {
    check(value, `params.${key}`);
  }
}
