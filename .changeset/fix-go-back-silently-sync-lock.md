---
"rehynav": patch
---

Fix `goBackSilently` permanently locking history sync when `popstate` never fires

Added AbortController-based listener management and a timeout fallback to `goBackSilently()`. `stop()` now resets `isSyncing` and cancels any pending listener/timeout, preventing broken state after stop/start cycles.
