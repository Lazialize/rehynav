---
"rehynav": patch
---

Fix: `Link` now forwards all native anchor props (`onTouchStart`, `aria-*`, `target`, `rel`, etc.) and only intercepts plain left-clicks, preserving browser defaults for modifier-key clicks, middle-clicks, and `target="_blank"` links.
