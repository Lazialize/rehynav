import React from 'react';
import type { ErrorFallbackProps } from '../types/props.js';

interface Props {
  children: React.ReactNode;
  route: string;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface State {
  error: Error | null;
}

function DefaultErrorFallback({ error, route, retry }: ErrorFallbackProps): React.ReactElement {
  return (
    <div style={{ padding: 16, textAlign: 'center' }}>
      <p>
        Something went wrong in <code>{route}</code>
      </p>
      {process.env.NODE_ENV !== 'production' && (
        <pre style={{ fontSize: 12, color: '#c00', whiteSpace: 'pre-wrap' }}>{error.message}</pre>
      )}
      <button type="button" onClick={retry} style={{ marginTop: 8, padding: '4px 12px' }}>
        Retry
      </button>
    </div>
  );
}

export class RouteErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  retry = (): void => {
    this.setState({ error: null });
  };

  render(): React.ReactNode {
    if (this.state.error) {
      const Fallback = this.props.fallback ?? DefaultErrorFallback;
      return <Fallback error={this.state.error} route={this.props.route} retry={this.retry} />;
    }
    return this.props.children;
  }
}
