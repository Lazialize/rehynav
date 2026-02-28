import type { TabBarProps } from 'rehynav';
import { createRouter, Screen, TabNavigator } from 'rehynav';
import './App.css';

import { NewPostModal } from './overlays/NewPostModal';
import { ShareSheet } from './overlays/ShareSheet';
import type { AppRoutes } from './routes';
import { HomeScreen } from './screens/HomeScreen';
import { PostDetailScreen } from './screens/PostDetailScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SearchScreen } from './screens/SearchScreen';
import { SettingsScreen } from './screens/SettingsScreen';

// 1. createRouter — create a typed router instance.
//    All hooks and components returned are bound to your route types.
const router = createRouter<AppRoutes>({
  tabs: ['home', 'search', 'profile'],
  initialTab: 'home',
});

// Destructure hooks and components from the router
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

// 2. Custom tab bar — receives typed TabBarProps from rehynav
function AppTabBar({ tabs, onTabPress }: TabBarProps) {
  const icons: Record<string, string> = {
    home: '🏠',
    search: '🔍',
    profile: '👤',
  };

  return (
    <nav className="tab-bar">
      {tabs.map((tab) => (
        <button
          key={tab.name}
          type="button"
          className={`tab-item ${tab.isActive ? 'active' : ''}`}
          onClick={() => onTabPress(tab.name)}
        >
          <span className="tab-icon">{icons[tab.name] ?? '•'}</span>
          <span className="tab-label">{tab.name}</span>
          {tab.badge != null && <span className="tab-badge">{tab.badge}</span>}
        </button>
      ))}
    </nav>
  );
}

export function App() {
  return (
    // 3. NavigationProvider — wraps the app, enables urlSync for browser history
    <NavigationProvider urlSync>
      {/* 4. Screen — register route name → component mappings */}
      <Screen name="home" component={HomeScreen} />
      <Screen name="search" component={SearchScreen} />
      <Screen name="profile" component={ProfileScreen} />
      <Screen name="home/post-detail" component={PostDetailScreen} />
      <Screen name="search/post-detail" component={PostDetailScreen} />
      <Screen name="profile/settings" component={SettingsScreen} />
      <Screen name="new-post" component={NewPostModal} />
      <Screen name="share" component={ShareSheet} />

      {/* 5. TabNavigator — renders tabs + stacks + overlays */}
      <TabNavigator tabBar={AppTabBar} />
    </NavigationProvider>
  );
}
