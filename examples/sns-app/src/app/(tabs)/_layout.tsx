import { Tabs } from 'rehynav';

export const unstable_settings = { initialRouteName: '(home)' };

/**
 * Bottom tab navigator. Each tab is its own folder with an independent stack,
 * so navigating deep in one tab and switching tabs preserves both stacks.
 */
export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="(home)" options={{ title: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
