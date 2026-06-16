import { type ReactElement, useContext } from 'react';
import type { NavigationRoute, RouteNode } from '../core/types.js';
import { NavigatorContext, type NavigatorContextValue, RouteContext } from '../hooks/context.js';
import { Slot } from './Slot.js';

/** Reads the current navigator slice. Throws when used outside a layout. */
export function useNavigator(): NavigatorContextValue {
  const value = useContext(NavigatorContext);
  if (!value) {
    throw new Error(
      'rehynav: navigator components (<Stack>, <Tabs>, <Slot>) must be rendered from a _layout.',
    );
  }
  return value;
}

function MissingComponent({ name }: { name: string }): ReactElement {
  return (
    <div data-rehynav-error="missing-component">
      {`rehynav: route "${name}" has no default-exported component.`}
    </div>
  );
}

/**
 * Renders a single route entry. Leaf routes render their component inside a
 * {@link RouteContext}; layout routes additionally provide a {@link NavigatorContext}
 * for their nested navigator and render their layout component (defaulting to a
 * {@link Slot}).
 */
export function RouteRenderer({
  route,
  node,
}: {
  route: NavigationRoute;
  node: RouteNode;
}): ReactElement {
  if (node.type === 'layout') {
    const Layout = node.component;
    return (
      <RouteContext.Provider value={{ route, node }}>
        <NavigatorContext.Provider value={{ state: route.state ?? emptyState(node), layout: node }}>
          {Layout ? <Layout /> : <Slot />}
        </NavigatorContext.Provider>
      </RouteContext.Provider>
    );
  }

  const Component = node.component;
  return (
    <RouteContext.Provider value={{ route, node }}>
      {Component ? <Component /> : <MissingComponent name={node.name} />}
    </RouteContext.Provider>
  );
}

function emptyState(node: RouteNode): NavigatorContextValue['state'] {
  return {
    type: 'stack',
    key: `empty-${node.name}`,
    index: -1,
    routeNames: node.children.map((c) => c.name),
    routes: [],
  };
}

/** Finds the route node for a route name within a layout's children. */
export function findNode(layout: RouteNode, name: string): RouteNode | undefined {
  return layout.children.find((child) => child.name === name);
}
