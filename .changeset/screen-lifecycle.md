---
'rehynav': minor
---

Add screen lifecycle features:

- `useFocusEffect`: Run effects when screen gains/loses focus
- `useIsFocused`: Check if current screen is focused
- `useScrollRestoration`: Save and restore scroll position across navigation
- Lazy loading: Pass `React.lazy()` components to `tab()`/`stack()`/`overlay()`
- Error boundaries: Per-route error catching with customizable fallback UI
- Screen preloading: `preload()` method on `useNavigation()` for pre-rendering screens
