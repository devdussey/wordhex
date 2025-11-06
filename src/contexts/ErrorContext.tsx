import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AppError, ErrorType, ErrorSeverity } from '../types/errors';
import { errorLogger } from '../utils/errorLogger';

interface ErrorContextType {
  currentError: AppError | null;
  showError: (error: AppError) => void;
  clearError: () => void;
  logError: (
    error: Error | unknown,
    type?: ErrorType,
    severity?: ErrorSeverity,
    userMessage?: string,
    context?: Record<string, unknown>
  ) => AppError;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

export function ErrorProvider({ children }: ErrorProviderProps) {
  const [currentError, setCurrentError] = useState<AppError | null>(null);

  const showError = useCallback((error: AppError) => {
    setCurrentError(error);
  }, []);

  const clearError = useCallback(() => {
    setCurrentError(null);
  }, []);

  const logError = useCallback(
    (
      error: Error | unknown,
      type: ErrorType = ErrorType.UNKNOWN,
      severity: ErrorSeverity = ErrorSeverity.MEDIUM,
      userMessage?: string,
      context?: Record<string, unknown>
    ) => {
      const appError = errorLogger.logError(error, type, severity, userMessage, context);

      if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
        showError(appError);
      }

      return appError;
    },
    [showError]
  );

  return (
    <ErrorContext.Provider
      value={{
        currentError,
        showError,
        clearError,
        logError
      }}
    >
      {children}
    </ErrorContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useError() {
  const context = useContext(ErrorContext);
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useErrorHandler() {
  const { logError, showError } = useError();

  const handleError = useCallback(
    (
      error: Error | unknown,
      options: {
        type?: ErrorType;
        severity?: ErrorSeverity;
        userMessage?: string;
        context?: Record<string, unknown>;
        silent?: boolean;
      } = {}
    ) => {
      const appError = logError(
        error,
        options.type,
        options.severity,
        options.userMessage,
        options.context
      );

      if (!options.silent && (options.severity === ErrorSeverity.HIGH || options.severity === ErrorSeverity.CRITICAL)) {
        showError(appError);
      }

      return appError;
    },
    [logError, showError]
  );

  return handleError;
}
