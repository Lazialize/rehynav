---
"rehynav": patch
---

Fix RESTORE_TO_ENTRY not setting activeLayer when restoring to a tab entry

- Set `activeLayer: 'tabs'` and clear `screens` when restoring to a tab stack entry
- Set `activeLayer: 'tabs'` and clear `screens` in the fallback branch (entry not found)
