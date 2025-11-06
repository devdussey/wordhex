import { AppError, ErrorType, ErrorSeverity } from '../types/errors';
import { api } from '../services/api';

interface ErrorLog {
  error: AppError;
  synced: boolean;
}

class ErrorLogger {
  private errorQueue: ErrorLog[] = [];
  private maxQueueSize = 100;
  private syncInterval: number | null = null;
  private isOnline = navigator.onLine;

  constructor() {
    this.loadQueue();
    this.startSyncInterval();
    this.setupOnlineListener();
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncErrors();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem('error_queue');
      if (stored) {
        this.errorQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load error queue:', error);
    }
  }

  private saveQueue() {
    try {
      const unsyncedErrors = this.errorQueue.filter(log => !log.synced);
      if (unsyncedErrors.length > this.maxQueueSize) {
        this.errorQueue = unsyncedErrors.slice(-this.maxQueueSize);
      }
      localStorage.setItem('error_queue', JSON.stringify(this.errorQueue));
    } catch (error) {
      console.error('Failed to save error queue:', error);
    }
  }

  private startSyncInterval() {
    this.syncInterval = window.setInterval(() => {
      if (this.isOnline) {
        this.syncErrors();
      }
    }, 30000);
  }

  private async syncErrors() {
    if (!this.isOnline || this.errorQueue.length === 0) {
      return;
    }

    const unsyncedErrors = this.errorQueue.filter(log => !log.synced);
    if (unsyncedErrors.length === 0) {
      return;
    }

    try {
      const errorLogs = unsyncedErrors.map(log => ({
        error_type: log.error.type,
        severity: log.error.severity,
        message: log.error.message,
        user_message: log.error.userMessage,
        context: log.error.context || {},
        timestamp: new Date(log.error.timestamp).toISOString(),
        retryable: log.error.retryable,
      }));

      await api.logs.client({ errors: errorLogs });

      unsyncedErrors.forEach(log => {
        log.synced = true;
      });
      this.saveQueue();

      this.errorQueue = this.errorQueue.filter(log => {
        const age = Date.now() - log.error.timestamp;
        return age < 24 * 60 * 60 * 1000 || !log.synced;
      });
      this.saveQueue();
    } catch (error) {
      console.error('Failed to sync errors:', error);
    }
  }

  log(error: AppError) {
    console.error(`[${error.severity}] ${error.type}:`, error.message, error.originalError);

    this.errorQueue.push({
      error,
      synced: false
    });

    this.saveQueue();

    if (this.isOnline && error.severity === ErrorSeverity.CRITICAL) {
      this.syncErrors();
    }
  }

  logError(
    error: Error | unknown,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    userMessage?: string,
    context?: Record<string, unknown>
  ) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const appError: AppError = {
      type,
      severity,
      message: errorMessage,
      userMessage: userMessage || this.getDefaultUserMessage(type),
      originalError: error,
      timestamp: Date.now(),
      context,
      retryable: this.isRetryable(type, error)
    };

    this.log(appError);
    return appError;
  }

  private getDefaultUserMessage(type: ErrorType): string {
    switch (type) {
      case ErrorType.NETWORK:
        return 'Unable to connect to the server. Please check your internet connection.';
      case ErrorType.API:
        return 'Something went wrong while processing your request. Please try again.';
      case ErrorType.VALIDATION:
        return 'Please check your input and try again.';
      case ErrorType.AUTH:
        return 'Authentication failed. Please try logging in again.';
      case ErrorType.DATABASE:
        return 'Unable to access data. Please try again later.';
      case ErrorType.DISCORD:
        return 'Discord connection error. Please restart the activity.';
      case ErrorType.TIMEOUT:
        return 'The request took too long. Please try again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  private isRetryable(type: ErrorType, error: unknown): boolean {
    if (type === ErrorType.NETWORK || type === ErrorType.TIMEOUT) {
      return true;
    }
    if (type === ErrorType.API && error instanceof Error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      return statusCode !== undefined && (statusCode >= 500 || statusCode === 408 || statusCode === 429);
    }
    return false;
  }

  clearSyncedErrors() {
    this.errorQueue = this.errorQueue.filter(log => !log.synced);
    this.saveQueue();
  }

  destroy() {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
    }
  }
}

export const errorLogger = new ErrorLogger();
