import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ErrorFallbackProps } from '../types/props.js';
import { RouteErrorBoundary } from './RouteErrorBoundary.js';

function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) throw new Error('Test error');
  return <div>Normal content</div>;
}

describe('RouteErrorBoundary', () => {
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <RouteErrorBoundary route="home">
        <div>Hello</div>
      </RouteErrorBoundary>,
    );
    expect(screen.getByText('Hello')).toBeDefined();
  });

  it('renders default fallback on error', () => {
    render(
      <RouteErrorBoundary route="home">
        <ThrowingComponent />
      </RouteErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });

  it('renders custom fallback on error', () => {
    const CustomFallback = ({ error, route, retry }: ErrorFallbackProps) => (
      <div>
        <p>Custom error: {error.message}</p>
        <p>Route: {route}</p>
        <button type="button" onClick={retry}>
          Custom Retry
        </button>
      </div>
    );

    render(
      <RouteErrorBoundary route="home/detail" fallback={CustomFallback}>
        <ThrowingComponent />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Custom error: Test error')).toBeDefined();
    expect(screen.getByText('Route: home/detail')).toBeDefined();
  });

  it('retry resets error state', () => {
    let shouldThrow = true;

    function ConditionalThrow() {
      if (shouldThrow) throw new Error('Test error');
      return <div>Recovered</div>;
    }

    render(
      <RouteErrorBoundary route="home">
        <ConditionalThrow />
      </RouteErrorBoundary>,
    );

    expect(screen.getByText(/something went wrong/i)).toBeDefined();

    shouldThrow = false;
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Recovered')).toBeDefined();
  });
});
