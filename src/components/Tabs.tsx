import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useLayoutEffect,
} from 'react';
import type { RouteNode } from '../core/types.js';
import { useController } from '../hooks/internal.js';
import { findNode, RouteRenderer, useNavigator } from './RouteRenderer.js';

/** Per-screen options for a tab screen. */
export interface TabsScreenOptions {
  title?: string;
  /** Set to `null` to hide this route from the tab bar. */
  href?: string | null;
}

export interface TabsScreenProps {
  name: string;
  options?: TabsScreenOptions;
}

/** Descriptor passed to a custom `tabBar` renderer. */
export interface TabDescriptor {
  name: string;
  title: string;
  href: string;
  isActive: boolean;
}

export interface TabsProps {
  children?: ReactNode;
  /** Custom tab bar renderer. Receives the tab descriptors and a navigate callback. */
  tabBar?: (props: { tabs: TabDescriptor[]; onSelect: (href: string) => void }) => ReactNode;
}

function ScreenConfig(_props: TabsScreenProps): null {
  return null;
}

function tabHref(node: RouteNode): string {
  const segments = node.name
    .split('/')
    .filter((s) => !(s.startsWith('(') && s.endsWith(')')) && s !== 'index');
  return `/${segments.join('/')}`;
}

function prettify(name: string): string {
  const last = name.split('/').pop() ?? name;
  return last.charAt(0).toUpperCase() + last.slice(1);
}

const barStyle: React.CSSProperties = {
  display: 'flex',
  flex: '0 0 auto',
  borderTop: '1px solid rgba(0,0,0,0.1)',
};

const tabButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px 4px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
};

interface TabsComponent {
  (props: TabsProps): ReactElement;
  Screen: (props: TabsScreenProps) => null;
}

/**
 * Tab navigator: renders independent per-tab stacks with a bottom tab bar.
 * Children may be `<Tabs.Screen name options />` elements to set titles or hide
 * routes from the bar (`options.href = null`).
 */
function TabsBase({ children, tabBar }: TabsProps): ReactElement {
  const { state, layout } = useNavigator();
  const controller = useController();
  const store = controller.store;

  useLayoutEffect(() => {
    store.dispatch({ type: 'SET_NAVIGATOR_TYPE', key: state.key, navigatorType: 'tab' });
  }, [store, state.key]);

  const optionsByName = new Map<string, TabsScreenOptions>();
  Children.forEach(children, (child) => {
    if (isValidElement<TabsScreenProps>(child) && child.type === ScreenConfig) {
      optionsByName.set(child.props.name, child.props.options ?? {});
    }
  });

  const activeName = state.routes[state.index]?.name;
  const tabs: TabDescriptor[] = layout.children
    .filter((node) => optionsByName.get(node.name)?.href !== null)
    .map((node) => ({
      name: node.name,
      title: optionsByName.get(node.name)?.title ?? prettify(node.name),
      href: tabHref(node),
      isActive: node.name === activeName,
    }));

  const onSelect = (href: string) => controller.jumpTo(href);

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}
      data-rehynav="tabs"
    >
      <div style={{ position: 'relative', flex: '1 1 auto', overflow: 'hidden' }}>
        {state.routes.map((route, index) => {
          const node = findNode(layout, route.name);
          if (!node) return null;
          const isActive = index === state.index;
          return (
            <div
              key={route.key}
              style={{ position: 'absolute', inset: 0, display: isActive ? 'block' : 'none' }}
              aria-hidden={!isActive}
            >
              <RouteRenderer route={route} node={node} />
            </div>
          );
        })}
      </div>
      {tabBar ? (
        tabBar({ tabs, onSelect })
      ) : (
        <nav style={barStyle} data-rehynav="tab-bar">
          {tabs.map((tab) => (
            <button
              key={tab.name}
              type="button"
              onClick={() => onSelect(tab.href)}
              style={{
                ...tabButtonStyle,
                fontWeight: tab.isActive ? 700 : 400,
                opacity: tab.isActive ? 1 : 0.6,
              }}
            >
              {tab.title}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export const Tabs: TabsComponent = Object.assign(TabsBase, { Screen: ScreenConfig });
