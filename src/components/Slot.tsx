import type { ReactElement } from 'react';
import { findNode, RouteRenderer, useNavigator } from './RouteRenderer.js';

/**
 * Renders the active child route of the current navigator with no surrounding
 * UI. Equivalent to Expo Router's `<Slot />`; useful as a pass-through layout.
 */
export function Slot(): ReactElement | null {
  const { state, layout } = useNavigator();
  const route = state.routes[state.index];
  if (!route) return null;
  const node = findNode(layout, route.name);
  if (!node) return null;
  return <RouteRenderer route={route} node={node} />;
}
