// ---- Serializable Constraint ----

export type Serializable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Serializable[]
  | { [key: string]: Serializable };

// ---- Stack Entry ----

export interface StackEntry {
  /** Unique ID for this entry (for React keys and History API state) */
  id: string;
  /** Route name (e.g., "home/detail") */
  route: string;
  /** Route params (must be serializable) */
  params: Record<string, Serializable>;
  /** Timestamp when this entry was pushed (for ordering/debugging) */
  timestamp: number;
}

// ---- Per-Tab State ----

export interface TabState {
  /** Tab root route name (e.g., "home") */
  name: string;
  /** Stack of screens within this tab. Index 0 = root, last = top. */
  stack: StackEntry[];
  /** Whether this tab has been mounted at least once (for lazy loading) */
  hasBeenActive: boolean;
}

// ---- Overlay Layer ----

export interface OverlayEntry {
  id: string;
  route: string;
  params: Record<string, Serializable>;
  timestamp: number;
}

// ---- Root Navigation State ----

export interface NavigationState {
  /** All tab states, keyed by tab name */
  tabs: Record<string, TabState>;
  /** Currently active tab name */
  activeTab: string;
  /** Ordered list of tabs (for tab bar rendering) */
  tabOrder: string[];
  /** Overlay stack (rendered above tabs) */
  overlays: OverlayEntry[];
  /** Tab badge values */
  badges: Record<string, string | number | undefined>;
  /** Screen stack (rendered instead of tabs when activeLayer is 'screens') */
  screens: StackEntry[];
  /** Which layer is currently active */
  activeLayer: 'screens' | 'tabs';
}

// ---- Navigation Actions ----

export type NavigationAction =
  | {
      type: 'PUSH';
      route: string;
      params: Record<string, Serializable>;
      id: string;
      timestamp: number;
    }
  | { type: 'POP' }
  | { type: 'POP_TO_ROOT' }
  | {
      type: 'REPLACE';
      route: string;
      params: Record<string, Serializable>;
      id: string;
      timestamp: number;
    }
  | { type: 'SWITCH_TAB'; tab: string }
  | { type: 'SWITCH_TAB_AND_RESET'; tab: string }
  | {
      type: 'OPEN_OVERLAY';
      route: string;
      params: Record<string, Serializable>;
      id: string;
      timestamp: number;
    }
  | { type: 'CLOSE_OVERLAY'; route?: string }
  | { type: 'GO_BACK' }
  | { type: 'RESTORE_TO_ENTRY'; entryId: string }
  | { type: 'RESET_STATE'; state: NavigationState }
  | { type: 'SET_BADGE'; tab: string; badge: string | number | undefined }
  | {
      type: 'PUSH_SCREEN';
      route: string;
      params: Record<string, Serializable>;
      id: string;
      timestamp: number;
    }
  | { type: 'POP_SCREEN' }
  | { type: 'POP_SCREEN_TO_ROOT' }
  | {
      type: 'REPLACE_SCREEN';
      route: string;
      params: Record<string, Serializable>;
      id: string;
      timestamp: number;
    }
  | { type: 'NAVIGATE_TO_TABS'; tab?: string }
  | {
      type: 'NAVIGATE_TO_SCREEN';
      route: string;
      params: Record<string, Serializable>;
      id: string;
      timestamp: number;
    };

// ---- Navigation Direction ----

export type NavigationDirection = 'back' | 'forward' | 'push' | 'replace' | 'tab-switch';

// ---- Back Result ----

export interface BackResult {
  /** Whether the back action was handled */
  handled: boolean;
  /** The new navigation state after the back action */
  state: NavigationState;
}

// ---- Route Info ----

export interface RouteInfo {
  route: string;
  params: Record<string, Serializable>;
}
