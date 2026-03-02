---
"rehynav": minor
---

Integrate previously unused runtime validation into the actual code flow (dev-only, no-op in production): `validateStackRoutes` is now called in `createRouter` to verify stack route prefixes match registered tabs, and `validateSerializable` is now called in `useNavigation` (`push`, `replace`, `navigateToScreen`) and `useOverlay` (`open`) before dispatch to warn about non-serializable route params
