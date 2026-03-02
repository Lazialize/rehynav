---
"rehynav": patch
---

Fix memory leak: clean up stale scroll positions and sessionStorage entries when navigation entries are removed

`useScrollRestoration` now removes scroll positions from its internal Map when components unmount. `HistorySyncManager` now detects removed entries on state changes and removes their sessionStorage params, preventing unbounded storage growth.
