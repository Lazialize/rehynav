# rehynav

## 0.2.0

### Minor Changes

- [`7b436f1`](https://github.com/Lazialize/rehynav/commit/7b436f1036ba814151a5dea2c211676ea39616dd) Thanks [@Lazialize](https://github.com/Lazialize)! - Replace three-layer route definition with function-based API (`tab`, `stack`, `modal`, `sheet`). Breaking change: Screen component removed, old RouteMap types removed, createRouter signature changed.

- [`14aff41`](https://github.com/Lazialize/rehynav/commit/14aff41c07f1f5ef17250a3f291d797af75f20b7) Thanks [@Lazialize](https://github.com/Lazialize)! - Add screen lifecycle features:

  - `useFocusEffect`: Run effects when screen gains/loses focus
  - `useIsFocused`: Check if current screen is focused
  - `useScrollRestoration`: Save and restore scroll position across navigation
  - Lazy loading: Pass `React.lazy()` components to `tab()`/`stack()`/`overlay()`
  - Error boundaries: Per-route error catching with customizable fallback UI
  - Screen preloading: `preload()` method on `useNavigation()` for pre-rendering screens

- [`aba328f`](https://github.com/Lazialize/rehynav/commit/aba328f47124d782581723ed36ffd246f64597a1) Thanks [@Lazialize](https://github.com/Lazialize)! - Unify modal/sheet into single overlay concept

  - Remove `OverlayType` type and `type` field from `OverlayEntry`
  - Remove `overlayType` from `OPEN_OVERLAY` action
  - Replace `modal()` and `sheet()` route helpers with `overlay()`
  - Replace `useModal` and `useSheet` hooks with unified `useOverlay`
  - Replace `modals`/`sheets` config keys with single `overlays` key
  - Unify CSS class to `rehynav-overlay`, remove `data-overlay-type` attribute
  - Update type inference (`TModals`/`TSheets` → `TOverlays`)

### Patch Changes

- [#18](https://github.com/Lazialize/rehynav/pull/18) [`1789872`](https://github.com/Lazialize/rehynav/commit/1789872f57d7abc6535ab9c6ffcbc407fad6aec2) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix memory leak: clean up stale scroll positions and sessionStorage entries when navigation entries are removed

  `useScrollRestoration` now removes scroll positions from its internal Map when components unmount. `HistorySyncManager` now detects removed entries on state changes and removes their sessionStorage params, preventing unbounded storage growth.

- [#16](https://github.com/Lazialize/rehynav/pull/16) [`a466b92`](https://github.com/Lazialize/rehynav/commit/a466b92736dcd7b103b9481bc2ab9d4d954bedba) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix `CLOSE_OVERLAY` by route to remove the topmost matching overlay

  Previously, `CLOSE_OVERLAY` with a route used `findIndex`, which removed the first (bottom-most) matching overlay. When the same overlay route was opened multiple times, the wrong instance was closed. Now uses reverse search to close the topmost (most recently opened) match.

- [#15](https://github.com/Lazialize/rehynav/pull/15) [`09ccc4f`](https://github.com/Lazialize/rehynav/commit/09ccc4f41e75de70b698c9b11fa23f58ad5794d2) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix `goBackSilently` permanently locking history sync when `popstate` never fires

  Added AbortController-based listener management and a timeout fallback to `goBackSilently()`. `stop()` now resets `isSyncing` and cancels any pending listener/timeout, preventing broken state after stop/start cycles.

- [#14](https://github.com/Lazialize/rehynav/pull/14) [`4fe504e`](https://github.com/Lazialize/rehynav/commit/4fe504e5543d99f0fd5c938cf043a2489347be48) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix `PUSH_SCREEN` to set `activeLayer` to `'screens'`

  Previously, `PUSH_SCREEN` appended an entry to the screens stack but did not switch `activeLayer`, causing pushed screens to be invisible when dispatched from the tabs layer.

- [#13](https://github.com/Lazialize/rehynav/pull/13) [`c069a09`](https://github.com/Lazialize/rehynav/commit/c069a091c10edf37ce23eb30908a00ff9d9d7222) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix `replace()` and `popToRoot()` to work correctly on the screens layer

  - Add `REPLACE_SCREEN` action and reducer case for replacing the top screen entry
  - Add `POP_SCREEN_TO_ROOT` action and reducer case for popping to screen root
  - Update `useNavigation` hooks to check `activeLayer` and dispatch layer-appropriate actions

- [#12](https://github.com/Lazialize/rehynav/pull/12) [`bf30614`](https://github.com/Lazialize/rehynav/commit/bf30614b53bd5af31b9a121c0825ca0d3e6afc5b) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix RESTORE_TO_ENTRY not setting activeLayer when restoring to a tab entry

  - Set `activeLayer: 'tabs'` and clear `screens` when restoring to a tab stack entry
  - Set `activeLayer: 'tabs'` and clear `screens` in the fallback branch (entry not found)

- [#19](https://github.com/Lazialize/rehynav/pull/19) [`afc3af6`](https://github.com/Lazialize/rehynav/commit/afc3af63f8169c40fb95a16d5b716932073f30f4) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix stale callback issue in `useFocusEffect` by including `callback` in the dependency array

  `useFocusEffect` now re-runs the effect when the callback reference changes while focused, preventing stale closures. `useScrollRestoration` wraps its callback in `useCallback` to satisfy the API contract.

- [#20](https://github.com/Lazialize/rehynav/pull/20) [`629a069`](https://github.com/Lazialize/rehynav/commit/629a0695f31db102c1c7589b2c7c759748014e84) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix `useRoute` returning wrong route info when screens layer is active

  The `useRoute` hook's selector now checks `state.activeLayer` and reads from the screens stack when `activeLayer === 'screens'`, instead of unconditionally reading from the tab stack.

- [#17](https://github.com/Lazialize/rehynav/pull/17) [`ad5cf44`](https://github.com/Lazialize/rehynav/commit/ad5cf449d2da790b6a42794ccd6db18969d6b184) Thanks [@Lazialize](https://github.com/Lazialize)! - Fix `validateSerializable` to recursively check nested values

  Previously, only top-level values were checked for non-serializable types (functions). Nested functions, Symbols, bigints, and other non-serializable values inside objects and arrays passed validation silently. Now recursively traverses all nested structures and detects functions, Symbols, and bigints with accurate path reporting (e.g., `params.data.onComplete`).
