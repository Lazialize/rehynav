---
"rehynav": minor
---

`createRouter()` now rejects duplicate route names across tabs, screens, stacks, and overlays, throwing a clear error with the conflicting route name and categories instead of silently overwriting in the screen registry
