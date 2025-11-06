import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home, Bug } from 'lucide-react';
import { errorLogger } from '../utils/errorLogger';
import { ErrorType, ErrorSeverity } from '../types/errors';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorCount: 0
  };

  private resetTimeout: number | null = null;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState(prev => ({
      errorInfo,
      errorCount: prev.errorCount + 1
    }));

    errorLogger.logError(
      error,
      ErrorType.UNKNOWN,
      ErrorSeverity.CRITICAL,
      'An unexpected error occurred in the application',
      {
        componentStack: errorInfo.componentStack,
        errorCount: this.state.errorCount + 1
      }
    );

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    if (this.state.errorCount < 3) {
      this.resetTimeout = window.setTimeout(() => {
        this.handleReset();
      }, 5000);
    }
  }

  public componentWillUnmount() {
    if (this.resetTimeout !== null) {
      clearTimeout(this.resetTimeout);
    }
  }

  private handleReset = () => {
    if (this.resetTimeout !== null) {
      clearTimeout(this.resetTimeout);
      this.resetTimeout = null;
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleReset);
      }

      const isCritical = this.state.errorCount >= 3;

      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border-2 border-slate-700">
            <div className="bg-gradient-to-r from-red-600 to-red-800 p-6">
              <div className="flex items-center gap-4">
                <div className="bg-white/10 p-3 rounded-full">
                  <AlertCircle className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    {isCritical ? 'Critical Error' : 'Something Went Wrong'}
                  </h1>
                  <p className="text-red-100 mt-1">
                    {isCritical
                      ? 'The application has encountered a critical error'
                      : 'We encountered an unexpected problem'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <p className="text-slate-300 text-sm font-medium mb-2">
                  Error Details:
                </p>
                <p className="text-red-400 font-mono text-sm break-words">
                  {this.state.error.message}
                </p>
              </div>

              {!isCritical && (
                <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
                  <p className="text-blue-300 text-sm">
                    The application will attempt to recover automatically in a few seconds,
                    or you can try the options below.
                  </p>
                </div>
              )}

              {isCritical && (
                <div className="bg-orange-900/20 border border-orange-700/50 rounded-lg p-4">
                  <p className="text-orange-300 text-sm">
                    Multiple errors have occurred. Please reload the page or contact support
                    if the problem persists.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {!isCritical && (
                  <button
                    onClick={this.handleReset}
                    className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </button>
                )}

                <button
                  onClick={this.handleReload}
                  className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all"
                >
                  <RefreshCw className="w-5 h-5" />
                  Reload Page
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex-1 min-w-[150px] flex items-center justify-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all"
                >
                  <Home className="w-5 h-5" />
                  Go Home
                </button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-slate-400 hover:text-slate-300 text-sm font-medium flex items-center gap-2">
                    <Bug className="w-4 h-4" />
                    Developer Information
                  </summary>
                  <div className="mt-3 bg-slate-900 rounded-lg p-4 border border-slate-700">
                    <pre className="text-xs text-slate-400 overflow-auto max-h-64">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}