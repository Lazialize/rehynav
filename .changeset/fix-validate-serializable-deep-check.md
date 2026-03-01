---
"rehynav": patch
---

Fix `validateSerializable` to recursively check nested values

Previously, only top-level values were checked for non-serializable types (functions). Nested functions, Symbols, bigints, and other non-serializable values inside objects and arrays passed validation silently. Now recursively traverses all nested structures and detects functions, Symbols, and bigints with accurate path reporting (e.g., `params.data.onComplete`).
