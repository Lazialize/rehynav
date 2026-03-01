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

    // Stack screen: active tab, top of stack, no overlays
    if (state.overlays.length > 0) return false;
    const activeTabState = state.tabs[state.activeTab];
    const topEntry = activeTabState.stack[activeTabState.stack.length - 1];
    return topEntry.id === entryId;
  });
}
