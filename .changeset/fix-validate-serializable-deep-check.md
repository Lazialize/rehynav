---
"rehynav": patch
---

Fix `validateSerializable` to recursively check nested values

Previously, only top-level values were checked for non-serializable types (functions). Nested functions, Symbols, and other non-serializable values inside objects and arrays passed validation silently. Now recursively traverses all nested structures with accurate path reporting (e.g., `params.data.onComplete`).
