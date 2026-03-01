---
"rehynav": patch
---

Fix `CLOSE_OVERLAY` by route to remove the topmost matching overlay

Previously, `CLOSE_OVERLAY` with a route used `findIndex`, which removed the first (bottom-most) matching overlay. When the same overlay route was opened multiple times, the wrong instance was closed. Now uses reverse search to close the topmost (most recently opened) match.
