# ReHynav - React Navigation Library for Hybrid/Mobile Web App

ReHynav (pronounced “ree-hai-nav”) is a React navigation library designed for **mobile web** and **hybrid apps** (e.g., **Capacitor** or **Tauri**).

> Status: **WIP / Experimental** — API is not finalized yet.

---

## Why ReHynav?

ReHynav is built for mobile-style navigation patterns—**tab-based apps with independent stacks**, **predictable back behavior**, and **modal flows**—while still running on the web and in hybrid containers like Capacitor or Tauri.

Many React routers are optimized for “web-first” navigation (URL-driven, single history stack). That’s great for classic websites, but mobile-style apps often need:

- **Bottom tabs that keep their own navigation history**
- **Back behavior that feels native** (modal → stack → tab, instead of “whatever the browser history says”)
- **Modal / sheet routes** that behave consistently across web + hybrid
- **State persistence** when switching tabs
- **Hybrid-friendly integration** (Android back button, app resume, etc.)

### Key Features

- **Tab = Independent Stack**  
  Each tab maintains its own stack history, so switching tabs doesn’t destroy navigation context.

- **Native-like Back Behavior**  
  Back prioritizes what users expect on mobile: close modal/sheet → pop stack → switch tab → exit.

- **Modal / Sheet Routes**  
  Present routes as overlays (modal, bottom sheet) without breaking stack flow.

- **State Persistence**  
  Screens and tab stacks can keep state across tab switches and app lifecycle events.

- **Hybrid-friendly**  
  Designed to integrate with Capacitor/Tauri: hardware back, lifecycle, and deep links.

---

## Quickstart

> Coming soon — examples below use a **proposed** API to communicate the intended design.

### Installation (planned)

```bash
npm install rehynav
# or
pnpm add rehynav
# or
yarn add rehynav
