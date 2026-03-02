import type { RoutePattern } from '../core/path-params.js';
import type { NavigationState, OverlayEntry, StackEntry } from '../core/types.js';
import { stateToUrl, urlToState } from '../core/url.js';
import type { NavigationStore } from '../store/navigation-store.js';

interface HistoryState {
  entryId: string;
  activeTab: string;
  tabStacks: Record<string, string[]>;
}

export interface HistorySyncConfig {
  tabs: string[];
  initialTab: string;
  createId: () => string;
  now: () => number;
  initialScreen?: string;
  screenNames?: string[];
}

export class HistorySyncManager {
  private store: NavigationStore;
  private basePath: string;
  private routePatterns?: Map<string, RoutePattern>;
  private config: HistorySyncConfig;
  private unsubscribe: (() => void) | null = null;
  private popStateHandler: ((event: PopStateEvent) => void) | null = null;
  private previousState: NavigationState | null = null;
  private isSyncing = false;
  private goBackAbort: AbortController | null = null;
  private goBackTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Max time (ms) to wait for popstate before resetting isSyncing */
  private static readonly GO_BACK_SAFETY_TIMEOUT = 100;

  constructor(
    store: NavigationStore,
    basePath: string = '/',
    routePatterns?: Map<string, RoutePattern>,
    config?: HistorySyncConfig,
  ) {
    this.store = store;
    this.basePath = basePath;
    this.routePatterns = routePatterns;
    this.config = config ?? { tabs: [], initialTab: '', createId: () => '', now: () => 0 };
  }

  start(): void {
    const state = this.store.getState();
    this.previousState = state;

    // Replace current history entry with initial state
    const url = stateToUrl(state, this.basePath, this.routePatterns);
    const historyState = this.createHistoryState(state);
    window.history.replaceState(historyState, '', url);

    // Persist initial params
    const topEntry = this.getTopEntry(state);
    if (topEntry) {
      this.persistParams(topEntry.id, topEntry.params);
    }

    // Listen for popstate (browser back/forward)
    this.popStateHandler = (event: PopStateEvent) => this.handlePopState(event);
    window.addEventListener('popstate', this.popStateHandler);

    // Subscribe to store changes
    this.unsubscribe = this.store.subscribe(() => {
      if (!this.isSyncing) {
        this.syncHistoryFromStateChange();
      }
    });
  }

  stop(): void {
    if (this.popStateHandler) {
      window.removeEventListener('popstate', this.popStateHandler);
      this.popStateHandler = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.cancelPendingGoBack();
  }

  private handlePopState(event: PopStateEvent): void {
    // Skip popstate events triggered by programmatic history.go() calls
    if (this.isSyncing) return;

    const historyState = event.state as HistoryState | null;
    if (!historyState?.entryId) return;

    this.isSyncing = true;
    try {
      const prevState = this.previousState;
      this.store.dispatch({ type: 'RESTORE_TO_ENTRY', entryId: historyState.entryId });

      // Check if restoration succeeded by verifying the top entry matches
      const newState = this.store.getState();
      const topEntryId = this.getTopEntryId(newState);
      if (topEntryId !== historyState.entryId) {
        // Entry was not found (destroyed by previous back navigation).
        // Reconstruct navigation state from the current URL.
        const reconstructed = urlToState(
          window.location.pathname + window.location.search,
          this.config,
          this.basePath,
          this.config.createId,
          this.config.now,
          this.routePatterns,
        );
        this.store.dispatch({ type: 'RESET_STATE', state: reconstructed });

        // Update history entry with the new entry IDs
        const updatedState = this.store.getState();
        const updatedHistoryState = this.createHistoryState(updatedState);
        window.history.replaceState(updatedHistoryState, '', undefined);
      }

      // Clean up sessionStorage for entries removed during popstate handling.
      // syncHistoryFromStateChange is skipped (isSyncing=true), so cleanup here.
      const currentState = this.store.getState();
      if (prevState) {
        this.cleanupRemovedEntries(prevState, currentState);
      }

      this.previousState = currentState;
    } finally {
      this.isSyncing = false;
    }
  }

  private collectEntryIds(state: NavigationState): Set<string> {
    const ids = new Set<string>();
    for (const tabState of Object.values(state.tabs)) {
      for (const entry of tabState.stack) {
        ids.add(entry.id);
      }
    }
    for (const entry of state.screens) {
      ids.add(entry.id);
    }
    for (const entry of state.overlays) {
      ids.add(entry.id);
    }
    return ids;
  }

  private cleanupRemovedEntries(prev: NavigationState, current: NavigationState): void {
    const prevIds = this.collectEntryIds(prev);
    const currentIds = this.collectEntryIds(current);
    for (const id of prevIds) {
      if (!currentIds.has(id)) {
        this.removeParams(id);
      }
    }
  }

  private syncHistoryFromStateChange(): void {
    const currentState = this.store.getState();
    const prev = this.previousState;

    if (!prev) return;

    this.cleanupRemovedEntries(prev, currentState);

    const url = stateToUrl(currentState, this.basePath, this.routePatterns);
    const historyState = this.createHistoryState(currentState);

    const topEntry = this.getTopEntry(currentState);
    if (topEntry) {
      this.persistParams(topEntry.id, topEntry.params);
    }

    // Layer transition
    if (prev.activeLayer !== currentState.activeLayer) {
      window.history.pushState(historyState, '', url);
      this.previousState = currentState;
      return;
    }

    // Screen layer changes
    if (currentState.activeLayer === 'screens') {
      if (currentState.screens.length > prev.screens.length) {
        window.history.pushState(historyState, '', url);
      } else if (currentState.screens.length < prev.screens.length) {
        const delta = prev.screens.length - currentState.screens.length;
        this.goBackSilently(delta, historyState, url);
      } else {
        window.history.replaceState(historyState, '', url);
      }
      this.previousState = currentState;
      return;
    }

    if (prev.activeTab !== currentState.activeTab) {
      // Tab switch: use replaceState so browser back does not navigate between tabs.
      // Tabs are parallel navigation paths, not sequential history.
      const overlayDelta = prev.overlays.length - currentState.overlays.length;
      if (overlayDelta > 0) {
        // Tab switch also closed overlays: rewind overlay history entries, then replace
        this.goBackSilently(overlayDelta, historyState, url);
      } else {
        window.history.replaceState(historyState, '', url);
      }
    } else if (currentState.overlays.length > prev.overlays.length) {
      // Overlay opened: push
      window.history.pushState(historyState, '', url);
    } else if (currentState.overlays.length < prev.overlays.length) {
      // Overlay closed: go back in browser history
      const delta = prev.overlays.length - currentState.overlays.length;
      this.goBackSilently(delta, historyState, url);
    } else {
      // Same tab, same overlay count: check stack depth
      const activeTab = currentState.activeTab;
      const currentStack = currentState.tabs[activeTab].stack;
      const prevStack = prev.tabs[activeTab].stack;

      if (currentStack.length > prevStack.length) {
        // Stack push
        window.history.pushState(historyState, '', url);
      } else if (currentStack.length < prevStack.length) {
        // Stack pop
        const delta = prevStack.length - currentStack.length;
        this.goBackSilently(delta, historyState, url);
      } else {
        // Same depth (replace, badge update, etc.)
        window.history.replaceState(historyState, '', url);
      }
    }

    this.previousState = currentState;
  }

  /**
   * Go back in browser history without triggering RESTORE_TO_ENTRY.
   * Sets isSyncing to prevent handlePopState from dispatching,
   * then replaces the resulting history entry with the correct state.
   *
   * Uses an AbortController so the listener can be cleaned up by stop(),
   * and a timeout fallback to reset isSyncing if popstate never fires
   * (e.g., history.go() delta exceeds available history depth).
   */
  private goBackSilently(delta: number, historyState: HistoryState, url: string): void {
    // Cancel any previous pending goBackSilently
    this.cancelPendingGoBack();

    this.isSyncing = true;

    const abort = new AbortController();
    this.goBackAbort = abort;

    const cleanup = () => {
      abort.abort();
      this.goBackAbort = null;
      if (this.goBackTimeout !== null) {
        clearTimeout(this.goBackTimeout);
        this.goBackTimeout = null;
      }
    };

    const onPopState = () => {
      if (abort.signal.aborted) return;
      window.history.replaceState(historyState, '', url);
      this.isSyncing = false;
      cleanup();
    };

    window.addEventListener('popstate', onPopState, { once: true, signal: abort.signal });

    // Safety timeout: reset isSyncing if popstate never fires
    this.goBackTimeout = setTimeout(() => {
      if (!abort.signal.aborted) {
        this.isSyncing = false;
        cleanup();
      }
    }, HistorySyncManager.GO_BACK_SAFETY_TIMEOUT);

    window.history.go(-delta);
  }

  private cancelPendingGoBack(): void {
    if (this.goBackAbort) {
      this.goBackAbort.abort();
      this.goBackAbort = null;
    }
    if (this.goBackTimeout !== null) {
      clearTimeout(this.goBackTimeout);
      this.goBackTimeout = null;
    }
    this.isSyncing = false;
  }

  createHistoryState(state: NavigationState): HistoryState {
    const tabStacks: Record<string, string[]> = {};
    for (const [tabName, tabState] of Object.entries(state.tabs)) {
      tabStacks[tabName] = tabState.stack.map((entry) => entry.route);
    }

    return {
      entryId: this.getTopEntryId(state),
      activeTab: state.activeTab,
      tabStacks,
    };
  }

  persistParams(entryId: string, params: Record<string, unknown>): void {
    try {
      const key = `rehynav:${entryId}`;
      sessionStorage.setItem(key, JSON.stringify(params));
    } catch {
      // sessionStorage may be unavailable or full; silently ignore
    }
  }

  /** Remove persisted params from sessionStorage for a given entry. */
  removeParams(entryId: string): void {
    try {
      sessionStorage.removeItem(`rehynav:${entryId}`);
    } catch {
      // sessionStorage may be unavailable; silently ignore
    }
  }

  getTotalDepth(state: NavigationState): number {
    if (state.activeLayer === 'screens') {
      return state.screens.length + state.overlays.length;
    }
    const activeTabState = state.tabs[state.activeTab];
    return activeTabState.stack.length + state.overlays.length;
  }

  getTopEntryId(state: NavigationState): string {
    const topEntry = this.getTopEntry(state);
    return topEntry.id;
  }

  getTopEntry(state: NavigationState): StackEntry | OverlayEntry {
    if (state.overlays.length > 0) {
      return state.overlays[state.overlays.length - 1];
    }
    if (state.activeLayer === 'screens' && state.screens.length > 0) {
      return state.screens[state.screens.length - 1];
    }
    const activeTabState = state.tabs[state.activeTab];
    return activeTabState.stack[activeTabState.stack.length - 1];
  }
}
