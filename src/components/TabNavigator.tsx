import { useRef } from 'react';
import { useNavigationSelector } from '../hooks/useNavigationSelector.js';
import { useTab } from '../hooks/useTab.js';
import type { TabBarProps, TabInfo, TabNavigatorProps } from '../types/props.js';
import { ErrorFallbackContext } from './ErrorFallbackContext.js';
import { OverlayRenderer } from './OverlayRenderer.js';
import { PreloadProvider } from './PreloadContext.js';
import { PreloadRenderer } from './PreloadRenderer.js';
import { StackRenderer } from './StackRenderer.js';
import { SuspenseFallbackContext } from './SuspenseFallbackContext.js';

function DefaultTabBar({ tabs, onTabPress }: TabBarProps): React.ReactElement {
  return (
    <div
      style={{ display: 'flex', borderTop: '1px solid #ccc' }}
      role="tablist"
      data-rehynav-tabbar
    >
      {tabs.map((tab) => (
        <button
          key={tab.name}
          type="button"
          role="tab"
          onClick={() => onTabPress(tab.name)}
          style={{
            flex: 1,
            padding: '8px 0',
            border: 'none',
            background: tab.isActive ? '#e0e0ff' : 'transparent',
            fontWeight: tab.isActive ? 'bold' : 'normal',
            cursor: 'pointer',
          }}
          aria-selected={tab.isActive}
        >
          {tab.name}
          {tab.badge != null && <span style={{ marginLeft: 4 }}>({tab.badge})</span>}
        </button>
      ))}
    </div>
  );
}

function TabContent({
  preserveState,
  lazy,
  maxStackDepth,
}: {
  preserveState: boolean;
  lazy: boolean;
  maxStackDepth: number;
}): React.ReactElement {
  const { activeTab, tabs } = useTab();
  const tabStates = useNavigationSelector((s) => s.tabs);
  const visitedTabsRef = useRef(new Set<string>([activeTab]));
  visitedTabsRef.current.add(activeTab);
  const visitedTabs = visitedTabsRef.current;

  return (
    <>
      {tabs.map((tabName) => {
        const tabState = tabStates[tabName];
        const isActive = tabName === activeTab;
        const hasBeenActive = tabState.hasBeenActive || visitedTabs.has(tabName);

        // Warn if maxStackDepth exceeded
        if (process.env.NODE_ENV !== 'production' && tabState.stack.length > maxStackDepth) {
          console.warn(
            `[rehynav] Tab "${tabName}" stack depth (${tabState.stack.length}) exceeds maxStackDepth (${maxStackDepth}). Consider popping screens.`,
          );
        }

        // Lazy loading: don't render until tab has been active
        if (lazy && !hasBeenActive) {
          return null;
        }

        // preserveState=false: only render active tab
        if (!preserveState && !isActive) {
          return null;
        }

        return (
          <div
            key={tabName}
            data-rehynav-tab={tabName}
            style={{ display: isActive ? 'block' : 'none' }}
          >
            <StackRenderer stack={tabState.stack} />
          </div>
        );
      })}
    </>
  );
}

export function TabNavigator({
  tabBar,
  tabBarPosition = 'bottom',
  preserveState = true,
  lazy = true,
  maxStackDepth = 10,
  suspenseFallback = null,
  errorFallback,
}: TabNavigatorProps): React.ReactElement {
  const { activeTab, tabs, switchTab } = useTab();
  const badges = useNavigationSelector((s) => s.badges);

  const TabBarComponent = tabBar ?? DefaultTabBar;

  const tabInfos: TabInfo[] = tabs.map((name) => ({
    name,
    isActive: name === activeTab,
    badge: badges[name],
  }));

  const tabBarElement = (
    <TabBarComponent tabs={tabInfos} activeTab={activeTab} onTabPress={switchTab} />
  );

  return (
    <PreloadProvider>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {tabBarPosition === 'top' && tabBarElement}
        <ErrorFallbackContext.Provider value={errorFallback}>
          <SuspenseFallbackContext.Provider value={suspenseFallback}>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              <TabContent preserveState={preserveState} lazy={lazy} maxStackDepth={maxStackDepth} />
            </div>
            <OverlayRenderer />
          </SuspenseFallbackContext.Provider>
        </ErrorFallbackContext.Provider>
        {tabBarPosition === 'bottom' && tabBarElement}
        <PreloadRenderer />
      </div>
    </PreloadProvider>
  );
}
