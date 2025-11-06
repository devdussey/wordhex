export enum ErrorType {
  NETWORK = 'NETWORK',
  API = 'API',
  VALIDATION = 'VALIDATION',
  AUTH = 'AUTH',
  DATABASE = 'DATABASE',
  DISCORD = 'DISCORD',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface AppError {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  originalError?: Error | unknown;
  timestamp: number;
  context?: Record<string, unknown>;
  retryable: boolean;
}

export class NetworkError extends Error {
  type = ErrorType.NETWORK;
  severity = ErrorSeverity.MEDIUM;
  retryable = true;

  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class APIError extends Error {
  type = ErrorType.API;
  severity = ErrorSeverity.MEDIUM;
  retryable: boolean;

  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'APIError';
    this.retryable = statusCode ? statusCode >= 500 : false;
  }
}

export class ValidationError extends Error {
  type = ErrorType.VALIDATION;
  severity = ErrorSeverity.LOW;
  retryable = false;

  constructor(message: string, public fields?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthError extends Error {
  type = ErrorType.AUTH;
  severity = ErrorSeverity.HIGH;
  retryable = false;

  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'AuthError';
  }
}

export class DatabaseError extends Error {
  type = ErrorType.DATABASE;
  severity = ErrorSeverity.HIGH;
  retryable = true;

  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}
