---
"rehynav": patch
---

Fix stale callback issue in `useFocusEffect` by including `callback` in the dependency array

`useFocusEffect` now re-runs the effect when the callback reference changes while focused, preventing stale closures. `useScrollRestoration` wraps its callback in `useCallback` to satisfy the API contract.
