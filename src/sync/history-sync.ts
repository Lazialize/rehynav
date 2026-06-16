import { stripBasePath, withBasePath } from '../core/href.js';
import { getPathFromState, getStateFromPath } from '../core/matching.js';
import type { NavigatorState, RouteNode } from '../core/types.js';
import type { NavigationStore } from '../store/navigation-store.js';

export interface HistorySyncConfig {
  basePath: string;
}

interface HistoryEntryState {
  rehynav: NavigatorState;
}

/**
 * Bidirectional synchronization between the navigation store and the browser
 * History API. The full navigation state is stored in `history.state` so that
 * back/forward restores the exact tree (including independent tab stacks).
 */
export class HistorySync {
  private unsubscribe: (() => void) | null = null;
  private popping = false;

  constructor(
    private store: NavigationStore,
    private tree: RouteNode,
    private config: HistorySyncConfig,
  ) {}

  /** Returns the pathname for a given state, with the base path applied. */
  private urlFor(state: NavigatorState): string {
    return withBasePath(getPathFromState(state), this.config.basePath);
  }

  start(): void {
    if (typeof window === 'undefined') return;

    // Seed the current history entry with the initial state.
    window.history.replaceState(
      { rehynav: this.store.getState() } satisfies HistoryEntryState,
      '',
      this.urlFor(this.store.getState()),
    );

    window.addEventListener('popstate', this.handlePopState);

    this.unsubscribe = this.store.subscribe(() => {
      if (this.popping) return;
      const state = this.store.getState();
      const url = this.urlFor(state);
      const current = `${window.location.pathname}${window.location.search}`;
      if (url !== current) {
        window.history.pushState({ rehynav: state } satisfies HistoryEntryState, '', url);
      } else {
        window.history.replaceState({ rehynav: state } satisfies HistoryEntryState, '', url);
      }
    });
  }

  private handlePopState = (event: PopStateEvent): void => {
    const saved = (event.state as HistoryEntryState | null)?.rehynav;
    const next =
      saved ??
      getStateFromPath(
        stripBasePath(`${window.location.pathname}${window.location.search}`, this.config.basePath),
        this.tree,
      ).state;
    this.popping = true;
    try {
      this.store.dispatch({ type: 'RESET', state: next });
    } finally {
      this.popping = false;
    }
  };

  stop(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('popstate', this.handlePopState);
    this.unsubscribe?.();
    this.unsubscribe = null;
  }
}
