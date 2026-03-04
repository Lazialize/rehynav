# rehynav Playground

DevTools-based bug reproduction and regression check environment.

## Setup

```bash
# From repository root
pnpm install
pnpm build       # Build rehynav first
cd examples/playground
pnpm dev
```

## Regression Check Procedures

### #21 — initialTab Mismatch

1. Open the app — should load on `home` tab without errors
2. In `App.tsx`, change `initialTab` to a non-existent tab name (e.g., `'nonexistent'`)
3. Reload — `createRouter` should throw a clear error
4. Revert the change

### #22 — basePath Handling

1. In `App.tsx`, add `basePath: '/app'` to `createRouter` options
2. Open DevTools Network tab, reload the page
3. Verify URL starts with `/app/`
4. Navigate between tabs and push stack screens
5. Verify URL updates correctly (no double slashes, correct path segments)
6. Use browser back/forward — verify state restores correctly
7. Revert the change

### #23 — Link Prop Forwarding

1. Go to **Probes** tab
2. Find the "Link Prop Forwarding" probe card
3. Right-click the link → Inspect Element
4. Verify the anchor element has:
   - `class="btn btn-sm"`
   - `data-testid="probe-link"`
   - `aria-label="Navigate to link test detail"`
   - `style` attribute with `display: inline-block`
5. Click the link — should navigate to detail screen

### #24 — Duplicate Route Keys

1. In `App.tsx`, try adding a duplicate route name (e.g., two `tab('home', ...)`)
2. `createRouter` should throw an error about duplicate route names
3. Revert the change

### Back Behavior Priority

1. Go to **Probes** tab
2. Open a confirm overlay → `goBack()` should close overlay
3. Push a detail screen → `goBack()` should pop back to probes
4. At tab root → `goBack()` should be no-op (no crash)

### Screen Layer Switch

1. From any tab, click "navigateToScreen(auth)"
2. Verify tabs are hidden and auth screen is shown
3. Click "navigateToTabs()" — verify tabs are restored
4. Verify previous tab state is preserved

### Overlay Stacking

1. Go to **Probes** tab
2. Open confirm overlay
3. From confirm overlay, click "Stack another overlay"
4. Close — should dismiss top overlay first
5. Close again — should dismiss confirm overlay

## Structure

```
src/
  App.tsx              — Router configuration
  main.tsx             — Entry point
  App.css              — Styles
  screens/
    HomeScreen.tsx     — Stack/tab/overlay controls
    DetailScreen.tsx   — Stack detail with push/pop/replace
    NavigationProbesScreen.tsx — Bug reproduction probes
    SettingsScreen.tsx — Tab actions and URL sync info
    AuthScreen.tsx     — Screens layer test
  overlays/
    ConfirmOverlay.tsx — Basic overlay with stacking
    DetailOverlay.tsx  — Overlay with params
```
