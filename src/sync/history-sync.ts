import type { RoutePattern } from '../core/path-params.js';
import type { NavigationState, OverlayEntry, StackEntry } from '../core/types.js';
import { stateToUrl } from '../core/url.js';
import type { NavigationStore } from '../store/navigation-store.js';

interface HistoryState {
  entryId: string;
  activeTab: string;
  tabStacks: Record<string, string[]>;
}

export class HistorySyncManager {
  private store: NavigationStore;
  private basePath: string;
  private routePatterns?: Map<string, RoutePattern>;
  private unsubscribe: (() => void) | null = null;
  private popStateHandler: ((event: PopStateEvent) => void) | null = null;
  private previousState: NavigationState | null = null;
  private isSyncing = false;

  constructor(
    store: NavigationStore,
    basePath: string = '/',
    routePatterns?: Map<string, RoutePattern>,
  ) {
    this.store = store;
    this.basePath = basePath;
    this.routePatterns = routePatterns;
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
  }

  private handlePopState(event: PopStateEvent): void {
    // Skip popstate events triggered by programmatic history.go() calls
    if (this.isSyncing) return;

    const historyState = event.state as HistoryState | null;
    if (!historyState?.entryId) return;

    this.isSyncing = true;
    try {
      this.store.dispatch({ type: 'RESTORE_TO_ENTRY', entryId: historyState.entryId });
      this.previousState = this.store.getState();
    } finally {
      this.isSyncing = false;
    }
  }

  private syncHistoryFromStateChange(): void {
    const currentState = this.store.getState();
    const prev = this.previousState;

    if (!prev) return;

    const url = stateToUrl(currentState, this.basePath, this.routePatterns);
    const historyState = this.createHistoryState(currentState);

    const topEntry = this.getTopEntry(currentState);
    if (topEntry) {
      this.persistParams(topEntry.id, topEntry.params);
    }

    if (prev.activeTab !== currentState.activeTab) {
      // Tab switch: always push a new history entry so browser back
      // returns to the previous tab with its stack intact
      const overlayDelta = prev.overlays.length - currentState.overlays.length;
      if (overlayDelta > 0) {
        // Tab switch also closed overlays: rewind overlay history entries, then push tab switch
        this.goBackAndPush(overlayDelta, historyState, url);
      } else {
        window.history.pushState(historyState, '', url);
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
   * Go back in browser history and then push a new entry.
   * Used when a tab switch also closes overlays: rewind the overlay entries,
   * then push the new tab's history entry.
   */
  private goBackAndPush(delta: number, historyState: HistoryState, url: string): void {
    this.isSyncing = true;
    window.history.go(-delta);
    const onPopState = () => {
      window.history.pushState(historyState, '', url);
      this.isSyncing = false;
    };
    window.addEventListener('popstate', onPopState, { once: true });
  }

  /**
   * Go back in browser history without triggering RESTORE_TO_ENTRY.
   * Sets isSyncing to prevent handlePopState from dispatching,
   * then replaces the resulting history entry with the correct state.
   */
  private goBackSilently(delta: number, historyState: HistoryState, url: string): void {
    this.isSyncing = true;
    window.history.go(-delta);
    const onPopState = () => {
      window.history.replaceState(historyState, '', url);
      this.isSyncing = false;
    };
    window.addEventListener('popstate', onPopState, { once: true });
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

  getTotalDepth(state: NavigationState): number {
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
    const activeTabState = state.tabs[state.activeTab];
    return activeTabState.stack[activeTabState.stack.length - 1];
  }
}
