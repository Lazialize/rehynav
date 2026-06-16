let counter = 0;

/**
 * Generates a unique key for a navigation route instance. Used for React keys
 * and to address entries in the History API state.
 */
export function createId(prefix = 'r'): string {
  counter = (counter + 1) % Number.MAX_SAFE_INTEGER;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`;
}
