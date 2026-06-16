import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { useController } from '../hooks/internal.js';
import { findNode, RouteRenderer, useNavigator } from './RouteRenderer.js';

/** Per-screen options for a stack screen. */
export interface StackScreenOptions {
  title?: string;
  /** Whether to show the default header for this screen. Defaults to the navigator setting. */
  headerShown?: boolean;
}

export interface StackScreenProps {
  name: string;
  options?: StackScreenOptions;
}

export interface StackProps {
  /** Default options applied to every screen in this navigator. */
  screenOptions?: StackScreenOptions;
  children?: ReactNode;
}

function ScreenConfig(_props: StackScreenProps): null {
  return null;
}

function prettify(name: string): string {
  const last = name.split('/').pop() ?? name;
  if (last === 'index') return '';
  return last.replace(/\[(\.\.\.)?(.+?)\]/g, '$2').replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

const layerStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  background: 'inherit',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  minHeight: 44,
  padding: '0 8px',
  borderBottom: '1px solid rgba(0,0,0,0.1)',
  flex: '0 0 auto',
};

function StackHeader({ title, canGoBack }: { title: string; canGoBack: boolean }): ReactElement {
  const controller = useController();
  return (
    <div style={headerStyle} data-rehynav="stack-header">
      {canGoBack && (
        <button
          type="button"
          onClick={() => controller.back()}
          style={{ marginRight: 8, cursor: 'pointer' }}
          aria-label="Go back"
        >
          ←
        </button>
      )}
      <span style={{ fontWeight: 600 }}>{title}</span>
    </div>
  );
}

interface StackComponent {
  (props: StackProps): ReactElement;
  Screen: (props: StackScreenProps) => null;
}

/**
 * Stack navigator: renders the active stack of screens with a default header.
 * Children may be `<Stack.Screen name options />` elements to configure screens.
 */
function StackBase({ screenOptions, children }: StackProps): ReactElement {
  const { state, layout } = useNavigator();

  const optionsByName = new Map<string, StackScreenOptions>();
  Children.forEach(children, (child) => {
    if (isValidElement<StackScreenProps>(child) && child.type === ScreenConfig) {
      optionsByName.set(child.props.name, child.props.options ?? {});
    }
  });

  return (
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }} data-rehynav="stack">
      {state.routes.map((route, index) => {
        const node = findNode(layout, route.name);
        if (!node) return null;
        const isTop = index === state.index;
        const options = { ...screenOptions, ...optionsByName.get(route.name) };
        const headerShown = options.headerShown ?? false;
        const title = options.title ?? prettify(route.name);
        return (
          <div
            key={route.key}
            style={{ ...layerStyle, display: isTop ? 'flex' : 'none' }}
            aria-hidden={!isTop}
          >
            {headerShown && <StackHeader title={title} canGoBack={index > 0} />}
            <div style={{ flex: '1 1 auto', overflow: 'auto' }}>
              <RouteRenderer route={route} node={node} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const Stack: StackComponent = Object.assign(StackBase, { Screen: ScreenConfig });
