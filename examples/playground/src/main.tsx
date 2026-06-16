import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { type RouteContextMap, RouterProvider } from 'rehynav';
import './App.css';

const context = import.meta.glob('./app/**/*.tsx', { eager: true }) as RouteContextMap;

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');
createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider context={context} />
  </StrictMode>,
);
