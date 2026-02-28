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

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'function') {
      console.error(
        `[rehynav] Non-serializable value in ${context} params.${key}: function. ` +
          `Route params must be serializable (string, number, boolean, null, arrays, plain objects). ` +
          `Use the action string pattern for callbacks. See docs for recommended patterns.`,
      );
    }
  }
}
