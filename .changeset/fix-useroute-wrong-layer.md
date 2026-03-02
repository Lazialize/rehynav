---
"rehynav": patch
---

Fix `useRoute` returning wrong route info when screens layer is active

The `useRoute` hook's selector now checks `state.activeLayer` and reads from the screens stack when `activeLayer === 'screens'`, instead of unconditionally reading from the tab stack.
