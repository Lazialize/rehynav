---
"rehynav": patch
---

Fix `PUSH_SCREEN` to set `activeLayer` to `'screens'`

Previously, `PUSH_SCREEN` appended an entry to the screens stack but did not switch `activeLayer`, causing pushed screens to be invisible when dispatched from the tabs layer.
