import type { TabBarProps } from 'rehynav';
import { createRouter, modal, sheet, stack, TabNavigator, tab } from 'rehynav';
import './App.css';

import { NewPostModal } from './overlays/NewPostModal';
import { ShareSheet } from './overlays/ShareSheet';
import { HomeScreen } from './screens/HomeScreen';
import { PostDetailScreen } from './screens/PostDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';

const postDetail = stack('post-detail/:postId', PostDetailScreen);

const router = createRouter({
  tabs: [
    tab('home', HomeScreen, [postDetail]),
    tab('search', SearchScreen, [postDetail]),
    tab('profile', ProfileScreen, [stack('settings', SettingsScreen)]),
  ],
  modals: [modal('new-post', NewPostModal)],
  sheets: [sheet('share', ShareSheet)],
  initialTab: 'home',
});

export const {
  NavigationProvider,
  useNavigation,
  useRoute,
  useTab,
  useModal,
  useSheet,
  useBeforeNavigate,
  useBackHandler,
} = router;

function AppTabBar({ tabs, onTabPress }: TabBarProps) {
  const icons: Record<string, string> = {
    home: '🏠',
    search: '🔍',
    profile: '👤',
  };

  return (
    <nav className="tab-bar">
      {tabs.map((t) => (
        <button
          key={t.name}
          type="button"
          className={`tab-item ${t.isActive ? 'active' : ''}`}
          onClick={() => onTabPress(t.name)}
        >
          <span className="tab-icon">{icons[t.name] ?? '•'}</span>
          <span className="tab-label">{t.name}</span>
          {t.badge != null && <span className="tab-badge">{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
}

export function App() {
  return (
    <NavigationProvider urlSync>
      <TabNavigator tabBar={AppTabBar} />
    </NavigationProvider>
  );
}
