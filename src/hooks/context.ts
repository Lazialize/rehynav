import { type Context, createContext } from 'react';
import type { NavigationRoute, NavigatorState, RouteNode } from '../core/types.js';
import type { NavigationController } from '../store/controller.js';
import type { NavigationStore } from '../store/navigation-store.js';

/** The navigation store for the current router. */
export const NavigationStoreContext: Context<NavigationStore | null> =
  createContext<NavigationStore | null>(null);

/** The imperative navigation controller for the current router. */
export const ControllerContext: Context<NavigationController | null> =
  createContext<NavigationController | null>(null);

/** The static route tree (root layout node). */
export const RouteTreeContext: Context<RouteNode | null> = createContext<RouteNode | null>(null);

/** The slice of navigation state and the layout node owned by the current navigator. */
export interface NavigatorContextValue {
  state: NavigatorState;
  layout: RouteNode;
}
export const NavigatorContext: Context<NavigatorContextValue | null> =
  createContext<NavigatorContextValue | null>(null);

/** The route instance and route node currently being rendered. */
export interface RouteContextValue {
  route: NavigationRoute;
  node: RouteNode;
}
export const RouteContext: Context<RouteContextValue | null> =
  createContext<RouteContextValue | null>(null);
