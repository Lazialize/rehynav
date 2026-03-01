import { useContext } from 'react';
import { RouteContext } from './context.js';
import { useNavigationSelector } from './useNavigationSelector.js';

export function useIsFocused(): boolean {
  const routeCtx = useContext(RouteContext);
  const entryId = routeCtx?.entryId ?? null;

  return useNavigationSelector((state) => {
    if (entryId === null) return false;

    // Check if this entry is an overlay
    const overlayIndex = state.overlays.findIndex((o) => o.id === entryId);
    if (overlayIndex !== -1) {
      return overlayIndex === state.overlays.length - 1;
    }

    // If overlays are open, nothing underneath is focused
    if (state.overlays.length > 0) return false;

    // Screen layer: top of screen stack is focused
    if (state.activeLayer === 'screens') {
      if (state.screens.length === 0) return false;
      const topScreen = state.screens[state.screens.length - 1];
      return topScreen.id === entryId;
    }

    // Tab layer: active tab, top of stack
    const activeTabState = state.tabs[state.activeTab];
    const topEntry = activeTabState.stack[activeTabState.stack.length - 1];
    return topEntry.id === entryId;
  });
}
