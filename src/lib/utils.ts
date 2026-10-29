/**
 * Safe JSON serialization and deep clone helpers to prevent circular structure errors,
 * DOM element leakage, and React synthetic event serialization crashes.
 */

export function safeJsonStringify(data: any): string {
  const ancestors: any[] = [];

  return JSON.stringify(data, function (this: any, _key, value) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }

    // Filter out DOM nodes and React synthetic events
    if (
      (typeof HTMLElement !== 'undefined' && value instanceof HTMLElement) ||
      (typeof Node !== 'undefined' && value instanceof Node) ||
      '_reactName' in value ||
      'nativeEvent' in value
    ) {
      return undefined;
    }

    // Maintain ancestor chain for the current property path
    while (ancestors.length > 0 && ancestors[ancestors.length - 1] !== this) {
      ancestors.pop();
    }

    // Filter out true circular references only
    if (ancestors.includes(value)) {
      return undefined;
    }

    ancestors.push(value);
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
