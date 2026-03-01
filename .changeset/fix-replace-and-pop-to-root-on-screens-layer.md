---
"rehynav": patch
---

Fix `replace()` and `popToRoot()` to work correctly on the screens layer

- Add `REPLACE_SCREEN` action and reducer case for replacing the top screen entry
- Add `POP_SCREEN_TO_ROOT` action and reducer case for popping to screen root
- Update `useNavigation` hooks to check `activeLayer` and dispatch layer-appropriate actions
