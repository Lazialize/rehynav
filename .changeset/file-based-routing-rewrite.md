---
"rehynav": major
---

Rebuild rehynav as a file-based router with an Expo Router-compatible API, designed for the web and hybrid containers (Capacitor/Tauri).

**Breaking:** the imperative `createRouter()` / `tabs()` / `tab()` / `stack()` / `overlay()` / `screens()` configuration API and the `useTab` / `useOverlay` / `useRoute` hooks are removed. Apps now declare routes as files in an `app/` directory and pass the modules to `<RouterProvider context={...} />` (e.g. via `import.meta.glob`).

New surface:

- Conventions: `index`, `[param]`, `[...rest]`, `_layout`, `(group)`, `+not-found`.
- Navigators: `<Stack>` / `<Stack.Screen>`, `<Tabs>` / `<Tabs.Screen>` (with independent per-tab stacks), `<Slot>`.
- Navigation: `<Link>`, `<Redirect>`, `useRouter`, `useNavigation`, the global `router`, plus `usePathname`, `useSegments`, `useLocalSearchParams`, `useGlobalSearchParams`, `useFocusEffect`, `useIsFocused`, `useRootNavigationState`.
- The full navigation state is a serializable nested navigator tree that round-trips through the History API.
