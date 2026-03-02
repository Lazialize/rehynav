---
"rehynav": patch
---

Fix: `createRouter()` now validates `initialTab` and `initialScreen` against defined tab/screen names, throwing a clear error with "Did you mean?" suggestions instead of silently creating invalid navigation state
