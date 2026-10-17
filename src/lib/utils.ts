/**
 * Safe JSON serialization and deep clone helpers to prevent circular structure errors,
 * DOM element leakage, and React synthetic event serialization crashes.
 */

export function safeJsonStringify(data: any): string {
  const seen = new WeakSet();

  return JSON.stringify(data, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      // Filter out DOM nodes and React synthetic events
      if (
        (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) ||
        (typeof Node !== 'undefined' && value instanceof Node) ||
        '_reactName' in value ||
        'nativeEvent' in value
      ) {
        return undefined;
      }

      // Filter out circular references
      if (seen.has(value)) {
        return undefined;
      }
      seen.add(value);
    }
    return value;
  });
}

export function safeClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  try {
    const serialized = safeJsonStringify(obj);
    return JSON.parse(serialized);
  } catch (err) {
    console.warn('safeClone warning:', err);
    return { ...obj };
  }
}
