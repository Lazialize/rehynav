import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { type RouteContextMap, RouterProvider } from 'rehynav';
import './App.css';
import { AuthProvider } from './auth';

// File-based routing: every module under `app/` becomes a route.
const context = import.meta.glob('./app/**/*.tsx', { eager: true }) as RouteContextMap;

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider context={context} />
    </AuthProvider>
  </StrictMode>,
);
