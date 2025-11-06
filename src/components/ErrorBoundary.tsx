import React, { ReactNode } from 'react';
import { discordLogger } from '../lib/discordLogger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    discordLogger.error(`React Error Boundary: ${this.props.context || 'Unknown component'}`, error, {
      componentStack: errorInfo.componentStack,
      context: this.props.context,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-950 to-fuchsia-950 p-4">
            <div className="rounded-lg border border-purple-500/20 bg-purple-950/40 p-8 backdrop-blur-sm">
              <h1 className="mb-2 text-2xl font-bold text-red-400">Something went wrong</h1>
              <p className="text-purple-200">{this.state.error?.message || 'An unexpected error occurred'}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
              >
                Reload Page
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
