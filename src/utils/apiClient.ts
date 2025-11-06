import { NetworkError, APIError, ErrorType, ErrorSeverity } from '../types/errors';
import { errorLogger } from './errorLogger';

interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
}

interface RequestConfig extends RequestInit {
  timeout?: number;
  retry?: Partial<RetryConfig>;
  skipErrorLogging?: boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504]
};

export class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private retryConfig: RetryConfig;

  constructor(
    baseUrl: string,
    defaultHeaders: Record<string, string> = {},
    retryConfig: Partial<RetryConfig> = {}
  ) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  setHeader(key: string, value: string) {
    this.defaultHeaders[key] = value;
  }

  removeHeader(key: string) {
    delete this.defaultHeaders[key];
  }

  async request<T = unknown>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const retryConfig = { ...this.retryConfig, ...config.retry };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(url, config);
        return response;
      } catch (error) {
        lastError = error as Error;

        if (!this.shouldRetry(error, attempt, retryConfig)) {
          throw error;
        }

        const delay = this.calculateDelay(attempt, retryConfig);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private async executeRequest<T>(
    url: string,
    config: RequestConfig
  ): Promise<T> {
    const headers = {
      ...this.defaultHeaders,
      ...(config.headers as Record<string, string>)
    };

    const timeout = config.timeout || 30000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      if (!navigator.onLine) {
        throw new NetworkError('No internet connection');
      }

      const response = await fetch(url, {
        ...config,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await this.parseErrorResponse(response);
        const errorMessage = typeof errorData.message === 'string'
          ? errorData.message
          : response.statusText;
        const apiError = new APIError(
          errorMessage,
          response.status,
          errorData
        );

        if (!config.skipErrorLogging) {
          errorLogger.logError(
            apiError,
            ErrorType.API,
            this.getErrorSeverity(response.status),
            this.getUserFriendlyMessage(response.status),
            { url, status: response.status, errorData }
          );
        }

        throw apiError;
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }

      return (await response.text()) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof APIError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new NetworkError('Request timeout', error);
        if (!config.skipErrorLogging) {
          errorLogger.logError(
            timeoutError,
            ErrorType.TIMEOUT,
            ErrorSeverity.MEDIUM,
            'The request took too long. Please try again.',
            { url, timeout }
          );
        }
        throw timeoutError;
      }

      const networkError = new NetworkError(
        'Network request failed',
        error
      );
      if (!config.skipErrorLogging) {
        errorLogger.logError(
          networkError,
          ErrorType.NETWORK,
          ErrorSeverity.MEDIUM,
          'Unable to connect to the server. Please check your connection.',
          { url }
        );
      }
      throw networkError;
    }
  }

  private async parseErrorResponse(response: Response): Promise<Record<string, unknown>> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }
      return { message: await response.text() };
    } catch {
      return { message: response.statusText };
    }
  }

  private shouldRetry(
    error: unknown,
    attempt: number,
    config: RetryConfig
  ): boolean {
    if (attempt >= config.maxRetries) {
      return false;
    }

    if (error instanceof NetworkError) {
      return true;
    }

    if (error instanceof APIError && error.statusCode) {
      return config.retryableStatuses.includes(error.statusCode);
    }

    return false;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
    const jitter = Math.random() * 0.3 * delay;
    return Math.min(delay + jitter, config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getErrorSeverity(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode === 429 || statusCode === 408) return ErrorSeverity.MEDIUM;
    if (statusCode >= 400) return ErrorSeverity.LOW;
    return ErrorSeverity.MEDIUM;
  }

  private getUserFriendlyMessage(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'You need to be logged in to do that.';
      case 403:
        return "You don't have permission to do that.";
      case 404:
        return 'The requested resource was not found.';
      case 408:
        return 'Request timeout. Please try again.';
      case 429:
        return 'Too many requests. Please wait a moment.';
      case 500:
      case 502:
      case 503:
      case 504:
        return 'Server error. Please try again later.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  async get<T = unknown>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T = unknown>(
    endpoint: string,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: RequestConfig
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }
}
