import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { Serializable } from '../core/types.js';

export interface PreloadEntry {
  id: string;
  route: string;
  params: Record<string, Serializable>;
  createdAt: number;
}

export interface PreloadContextValue {
  entries: PreloadEntry[];
  preload(route: string, params: Record<string, Serializable>): void;
  promote(route: string, params: Record<string, Serializable>): PreloadEntry | undefined;
}

const Context = createContext<PreloadContextValue | null>(null);

let preloadIdCounter = 0;

export function PreloadProvider({
  children,
  maxPreloads = 3,
  ttl = 30000,
}: {
  children: React.ReactNode;
  maxPreloads?: number;
  ttl?: number;
}): React.ReactElement {
  const [entries, setEntries] = useState<PreloadEntry[]>([]);
  const entriesRef = useRef(entries);
  entriesRef.current = entries;

  const preload = useCallback(
    (route: string, params: Record<string, Serializable>) => {
      setEntries((prev) => {
        // Don't duplicate
        const existing = prev.find(
          (e) => e.route === route && JSON.stringify(e.params) === JSON.stringify(params),
        );
        if (existing) return prev;

        // Evict expired
        const now = Date.now();
        const fresh = prev.filter((e) => now - e.createdAt < ttl);

        const entry: PreloadEntry = {
          id: `preload-${++preloadIdCounter}`,
          route,
          params,
          createdAt: now,
        };

        const next = [...fresh, entry];
        // Enforce max limit (evict oldest)
        if (next.length > maxPreloads) {
          return next.slice(next.length - maxPreloads);
        }
        return next;
      });
    },
    [maxPreloads, ttl],
  );

  const promote = useCallback(
    (route: string, params: Record<string, Serializable>): PreloadEntry | undefined => {
      const match = entriesRef.current.find(
        (e) => e.route === route && JSON.stringify(e.params) === JSON.stringify(params),
      );
      if (match) {
        setEntries((prev) => prev.filter((e) => e.id !== match.id));
      }
      return match;
    },
    [],
  );

  return <Context.Provider value={{ entries, preload, promote }}>{children}</Context.Provider>;
}

export function usePreloadContext(): PreloadContextValue {
  const ctx = useContext(Context);
  if (!ctx) {
    throw new Error('usePreloadContext must be used within PreloadProvider');
  }
  return ctx;
}

export function useOptionalPreloadContext(): PreloadContextValue | null {
  return useContext(Context);
}
