import type { Href } from './core/href.js';
import type { Params } from './core/types.js';
import type { NavigationController } from './store/controller.js';

let activeController: NavigationController | null = null;

/** Registers the controller backing the global `router`. Called by the provider. */
export function setActiveController(controller: NavigationController | null): void {
  activeController = controller;
}

function requireController(): NavigationController {
  if (!activeController) {
    throw new Error('rehynav: no active router. Did you render <RouterProvider>?');
  }
  return activeController;
}

/**
 * Global imperative navigation object, usable outside of React components
 * (event handlers, native back-button listeners, etc.). Mirrors Expo Router's
 * `router` singleton.
 */
export const router = {
  navigate(href: Href, params?: Params): void {
    requireController().navigate(href, params);
  },
  push(href: Href, params?: Params): void {
    requireController().push(href, params);
  },
  replace(href: Href, params?: Params): void {
    requireController().replace(href, params);
  },
  back(): void {
    requireController().back();
  },
  canGoBack(): boolean {
    return activeController ? activeController.canGoBack() : false;
  },
  setParams(params: Params): void {
    requireController().setParams(params);
  },
};

export type Router = typeof router;
