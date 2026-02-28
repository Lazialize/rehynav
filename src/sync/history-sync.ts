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
  private unsubscribe: (() => void) | null = null;
  private popStateHandler: ((event: PopStateEvent) => void) | null = null;
  private previousDepth = 0;
  private isSyncing = false;

  constructor(store: NavigationStore, basePath: string = '/') {
    this.store = store;
    this.basePath = basePath;
  }

  start(): void {
    const state = this.store.getState();
    this.previousDepth = this.getTotalDepth(state);

    // Replace current history entry with initial state
    const url = stateToUrl(state, this.basePath);
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
    const historyState = event.state as HistoryState | null;
    if (!historyState?.entryId) return;

    this.isSyncing = true;
    try {
      this.store.dispatch({ type: 'RESTORE_TO_ENTRY', entryId: historyState.entryId });
      const newState = this.store.getState();
      this.previousDepth = this.getTotalDepth(newState);
    } finally {
      this.isSyncing = false;
    }
  }

  private syncHistoryFromStateChange(): void {
    const state = this.store.getState();
    const currentDepth = this.getTotalDepth(state);
    const url = stateToUrl(state, this.basePath);
    const historyState = this.createHistoryState(state);

    const topEntry = this.getTopEntry(state);
    if (topEntry) {
      this.persistParams(topEntry.id, topEntry.params);
    }

    if (currentDepth > this.previousDepth) {
      // Depth increased: push new entry
      window.history.pushState(historyState, '', url);
    } else if (currentDepth < this.previousDepth) {
      // Depth decreased: go back
      const delta = this.previousDepth - currentDepth;
      // Replace after going back to update URL
      this.isSyncing = true;
      window.history.go(-delta);
      // Wait for the popstate event from go() before replacing state and resetting sync flag
      const onGoPopState = () => {
        window.history.replaceState(historyState, '', url);
        this.isSyncing = false;
      };
      window.addEventListener('popstate', onGoPopState, { once: true });
    } else {
      // Same depth, different route: replace
      window.history.replaceState(historyState, '', url);
    }

    this.previousDepth = currentDepth;
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
