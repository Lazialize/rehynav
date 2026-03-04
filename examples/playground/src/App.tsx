import type { TabBarProps } from 'rehynav';
import { createRouter, overlay, screen, screens, stack, tab, tabs } from 'rehynav';
import './App.css';

import { ConfirmOverlay } from './overlays/ConfirmOverlay';
import { DetailOverlay } from './overlays/DetailOverlay';
import { AuthScreen } from './screens/AuthScreen';
import { DetailScreen } from './screens/DetailScreen';
import { HomeScreen } from './screens/HomeScreen';
import { NavigationProbesScreen } from './screens/NavigationProbesScreen';
import { SettingsScreen } from './screens/SettingsScreen';

function PlaygroundTabBar({ tabs: tabList, onTabPress }: TabBarProps) {
  const icons: Record<string, string> = {
    home: 'H',
    probes: 'P',
    settings: 'S',
  };

  return (
    <nav className="tab-bar">
      {tabList.map((t) => (
        <button
          key={t.name}
          type="button"
          className={`tab-item ${t.isActive ? 'active' : ''}`}
          onClick={() => onTabPress(t.name)}
        >
          <span className="tab-icon">{icons[t.name] ?? '?'}</span>
          <span className="tab-label">{t.name}</span>
          {t.badge != null && <span className="tab-badge">{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
}

export const router = createRouter(
  [
    screens([screen('auth', AuthScreen)], {
      initialScreen: 'auth',
    }),
    tabs(
      [
        tab('home', HomeScreen, [stack('detail/:id', DetailScreen)]),
        tab('probes', NavigationProbesScreen),
        tab('settings', SettingsScreen),
      ],
      {
        initialTab: 'home',
        tabBar: PlaygroundTabBar,
      },
    ),
    overlay('confirm', ConfirmOverlay),
    overlay('detail-overlay', DetailOverlay),
  ],
  { urlSync: true },
);
