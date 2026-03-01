import type { ErrorFallbackProps, TabBarProps } from 'rehynav';
import { createRouter, overlay, stack, TabNavigator, tab } from 'rehynav';
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
  overlays: [overlay('new-post', NewPostModal), overlay('share', ShareSheet)],
  initialTab: 'home',
});

export const {
  NavigationProvider,
  useNavigation,
  useRoute,
  useTab,
  useOverlay,
  useBeforeNavigate,
  useBackHandler,
  useFocusEffect,
  useIsFocused,
  useScrollRestoration,
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

function AppErrorFallback({ error, route, retry }: ErrorFallbackProps) {
  return (
    <div className="screen" style={{ textAlign: 'center', padding: 32 }}>
      <h2>Oops!</h2>
      <p>
        Something went wrong in <code>{route}</code>
      </p>
      <pre style={{ fontSize: 12, color: '#c00' }}>{error.message}</pre>
      <button type="button" onClick={retry} style={{ marginTop: 16, padding: '8px 16px' }}>
        Try Again
      </button>
    </div>
  );
}

export function App() {
  return (
    <NavigationProvider urlSync>
      <TabNavigator tabBar={AppTabBar} errorFallback={AppErrorFallback} />
    </NavigationProvider>
  );
}
