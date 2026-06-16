import { fireEvent, render, screen } from '@testing-library/react';
import { getStateFromPath } from '../core/matching.js';
import { buildRouteTree, type RouteContextMap } from '../core/route-tree.js';
import type { NavigatorState } from '../core/types.js';
import { ControllerContext, NavigatorContext } from '../hooks/context.js';
import { createController } from '../store/controller.js';
import { createNavigationStore } from '../store/navigation-store.js';
import { Link } from './Link.js';
import { Slot } from './Slot.js';
import { Stack } from './Stack.js';
import { Tabs } from './Tabs.js';

const C = () => () => null;
function ctx(keys: string[]): RouteContextMap {
  const out: RouteContextMap = {};
  for (const key of keys) out[key] = { default: C() as never };
  return out;
}
const tree = buildRouteTree(ctx(['./app/_layout.tsx', './app/index.tsx', './app/about.tsx']));

function controllerWrapper(basePath = '') {
  const store = createNavigationStore(getStateFromPath('/', tree).state);
  const controller = createController(store, tree, { basePath });
  return { store, controller };
}

describe('Link', () => {
  it('renders an href with the base path and ignores modified clicks', () => {
    const { store, controller } = controllerWrapper('/app');
    render(
      <ControllerContext.Provider value={controller}>
        <Link href="/about">go</Link>
      </ControllerContext.Provider>,
    );
    const anchor = screen.getByText('go');
    expect(anchor).toHaveAttribute('href', '/app/about');
    // A modified (e.g. ctrl) click should not be intercepted.
    fireEvent.click(anchor, { ctrlKey: true });
    expect(store.getState().routes[store.getState().index].name).toBe('index');
    // A plain click navigates.
    fireEvent.click(anchor);
    expect(store.getState().routes[store.getState().index].name).toBe('about');
  });
});

describe('Slot edge cases', () => {
  function emptyNav(): NavigatorState {
    return { type: 'stack', key: 'k', index: -1, routeNames: [], routes: [] };
  }
  function unknownNav(): NavigatorState {
    return {
      type: 'stack',
      key: 'k',
      index: 0,
      routeNames: [],
      routes: [{ key: 'x', name: 'ghost' }],
    };
  }

  it('renders nothing when there is no active route', () => {
    const { container } = render(
      <NavigatorContext.Provider value={{ state: emptyNav(), layout: tree }}>
        <Slot />
      </NavigatorContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when the active route has no matching node', () => {
    const { container } = render(
      <NavigatorContext.Provider value={{ state: unknownNav(), layout: tree }}>
        <Slot />
      </NavigatorContext.Provider>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('screen config markers', () => {
  it('Stack.Screen and Tabs.Screen render nothing', () => {
    const { container } = render(
      <>
        <Stack.Screen name="a" />
        <Tabs.Screen name="b" />
      </>,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
