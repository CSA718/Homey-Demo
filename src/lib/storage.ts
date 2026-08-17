// Safe localStorage wrapper. Some hosting contexts (e.g. a sandboxed
// cross-origin iframe) block Web Storage outright — accessing
// `localStorage` at all throws a SecurityError, not just a failed read.
// Since this whole app's "backend" is localStorage, an unguarded throw
// during initial render (auth state is read synchronously on mount)
// would crash the app before anything renders. Fall back to an in-memory
// store so the app stays fully interactive for the session even when
// persistence isn't available.

const memoryStore = new Map<string, string>();

function detectLocalStorage(): boolean {
  try {
    const testKey = "__homey_storage_test__";
    localStorage.setItem(testKey, "1");
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

const hasLocalStorage = detectLocalStorage();

export const storage = {
  getItem(key: string): string | null {
    if (hasLocalStorage) {
      try {
        return localStorage.getItem(key);
      } catch {
        // fall through to memory store
      }
    }
    return memoryStore.has(key) ? memoryStore.get(key)! : null;
  },
  setItem(key: string, value: string): void {
    if (hasLocalStorage) {
      try {
        localStorage.setItem(key, value);
        return;
      } catch {
        // fall through to memory store
      }
    }
    memoryStore.set(key, value);
  },
  removeItem(key: string): void {
    if (hasLocalStorage) {
      try {
        localStorage.removeItem(key);
        return;
      } catch {
        // fall through to memory store
      }
    }
    memoryStore.delete(key);
  },
};
