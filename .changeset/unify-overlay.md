---
"rehynav": minor
---

Unify modal/sheet into single overlay concept

- Remove `OverlayType` type and `type` field from `OverlayEntry`
- Remove `overlayType` from `OPEN_OVERLAY` action
- Replace `modal()` and `sheet()` route helpers with `overlay()`
- Replace `useModal` and `useSheet` hooks with unified `useOverlay`
- Replace `modals`/`sheets` config keys with single `overlays` key
- Unify CSS class to `rehynav-overlay`, remove `data-overlay-type` attribute
- Update type inference (`TModals`/`TSheets` → `TOverlays`)
