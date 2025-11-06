import { useEffect, useState } from 'react';
import { X, AlertCircle, AlertTriangle, Info, WifiOff, RefreshCw } from 'lucide-react';
import { AppError, ErrorSeverity } from '../types/errors';

interface ErrorNotificationProps {
  error: AppError | null;
  onDismiss: () => void;
  onRetry?: () => void;
  autoHideDuration?: number;
}

export function ErrorNotification({
  error,
  onDismiss,
  onRetry,
  autoHideDuration = 5000
}: ErrorNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);

      if (error.severity === ErrorSeverity.LOW || error.severity === ErrorSeverity.MEDIUM) {
        const timer = setTimeout(() => {
          setIsVisible(false);
          setTimeout(onDismiss, 300);
        }, autoHideDuration);

        return () => clearTimeout(timer);
      }
    } else {
      setIsVisible(false);
    }
  }, [error, autoHideDuration, onDismiss]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  if (!error) return null;

  const getIcon = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return <AlertCircle className="w-6 h-6" />;
      case ErrorSeverity.MEDIUM:
        return <AlertTriangle className="w-6 h-6" />;
      case ErrorSeverity.LOW:
        return <Info className="w-6 h-6" />;
      default:
        return <AlertCircle className="w-6 h-6" />;
    }
  };

  const getColorClasses = () => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-900/95 border-red-500 text-red-50';
      case ErrorSeverity.HIGH:
        return 'bg-orange-900/95 border-orange-500 text-orange-50';
      case ErrorSeverity.MEDIUM:
        return 'bg-yellow-900/95 border-yellow-500 text-yellow-50';
      case ErrorSeverity.LOW:
        return 'bg-blue-900/95 border-blue-500 text-blue-50';
      default:
        return 'bg-slate-900/95 border-slate-500 text-slate-50';
    }
  };

  const showOfflineIndicator = error.type === 'NETWORK';

  return (
    <div
      className={`fixed top-4 right-4 max-w-md w-full transition-all duration-300 z-50 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        className={`rounded-lg border-2 shadow-2xl p-4 ${getColorClasses()}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {showOfflineIndicator ? <WifiOff className="w-6 h-6" /> : getIcon()}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1">
              {showOfflineIndicator ? 'Connection Lost' : 'Error'}
            </h3>
            <p className="text-sm opacity-90 break-words">
              {error.userMessage}
            </p>

            {error.retryable && onRetry && (
              <button
                onClick={onRetry}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            )}
          </div>

          <button
            onClick={handleDismiss}
            className="flex-shrink-0 hover:bg-white/10 rounded p-1 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

interface OfflineBannerProps {
  show: boolean;
}

export function OfflineBanner({ show }: OfflineBannerProps) {
  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t-2 border-orange-500 px-4 py-3 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 text-white">
        <WifiOff className="w-5 h-5 text-orange-500" />
        <p className="text-sm font-medium">
          You are currently offline. Some features may not be available.
        </p>
      </div>
    </div>
  );
}
