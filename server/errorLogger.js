/**
 * Backend Error Logger
 * Utility for logging backend errors and sending them to webhooks
 */

import webhookService from './webhookService.js';
import db from './db.js';

/**
 * Log a backend error with webhook notification
 * @param {Error|string} error - Error object or error message
 * @param {Object} options - Additional error options
 * @param {string} options.type - Error type (API, DATABASE, NETWORK, etc.)
 * @param {string} options.severity - Error severity (LOW, MEDIUM, HIGH, CRITICAL)
 * @param {string} options.userMessage - User-friendly error message
 * @param {Object} options.context - Additional context information
 * @param {boolean} options.sendWebhook - Whether to send to webhooks (default: true)
 */
export function logBackendError(error, options = {}) {
  const {
    type = 'UNKNOWN',
    severity = 'HIGH',
    userMessage = 'An error occurred on the server',
    context = {},
    sendWebhook = true
  } = options;

  // Extract error details
  let message = '';
  let stack = '';

  if (error instanceof Error) {
    message = error.message;
    stack = error.stack;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    message = String(error);
  }

  // Log to console
  console.error(`[BackendError][${type}][${severity}]`, message);
  if (stack) {
    console.error('Stack trace:', stack);
  }
  if (Object.keys(context).length > 0) {
    console.error('Context:', context);
  }

  // Prepare error payload
  const errorPayload = {
    type,
    severity,
    message,
    userMessage,
    source: 'BACKEND',
    context,
    stack,
    timestamp: new Date().toISOString(),
    userId: options.userId || null
  };

  // Save to database
  saveErrorToDatabase(errorPayload).catch(dbError => {
    console.error('Failed to save error to database:', dbError);
  });

  // Send to webhooks if enabled
  if (sendWebhook) {
    webhookService.logError(errorPayload).catch(webhookError => {
      console.error('Failed to send error to webhooks:', webhookError);
    });
  }
}

/**
 * Save error to database
 * @param {Object} errorPayload - Error data to save
 */
async function saveErrorToDatabase(errorPayload) {
  try {
    await db.errorLog.create({
      data: {
        type: errorPayload.type,
        severity: errorPayload.severity,
        message: errorPayload.message,
        userMessage: errorPayload.userMessage,
        source: errorPayload.source,
        context: errorPayload.context || {},
        stack: errorPayload.stack,
        userId: errorPayload.userId,
        timestamp: new Date(errorPayload.timestamp),
        webhookSent: false
      }
    });
  } catch (error) {
    // Don't throw, just log to avoid infinite error loops
    console.error('Database error while saving error log:', error);
  }
}

/**
 * Wrap an async route handler with error logging
 * @param {Function} handler - Express route handler
 * @param {Object} options - Error logging options
 * @returns {Function} Wrapped handler
 */
export function withErrorLogging(handler, options = {}) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      const context = {
        method: req.method,
        path: req.path,
        query: req.query,
        ...options.context
      };

      logBackendError(error, {
        type: options.type || 'API',
        severity: options.severity || 'HIGH',
        userMessage: options.userMessage || 'An error occurred processing your request',
        context,
        sendWebhook: options.sendWebhook !== false
      });

      // Send error response
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        error: options.userMessage || 'An error occurred processing your request'
      });
    }
  };
}

/**
 * Log database errors
 * @param {Error} error - Database error
 * @param {Object} context - Additional context
 */
export function logDatabaseError(error, context = {}) {
  logBackendError(error, {
    type: 'DATABASE',
    severity: 'CRITICAL',
    userMessage: 'A database error occurred',
    context
  });
}

/**
 * Log authentication errors
 * @param {Error|string} error - Auth error
 * @param {Object} context - Additional context
 */
export function logAuthError(error, context = {}) {
  logBackendError(error, {
    type: 'AUTH',
    severity: 'MEDIUM',
    userMessage: 'Authentication failed',
    context
  });
}

/**
 * Log network errors
 * @param {Error|string} error - Network error
 * @param {Object} context - Additional context
 */
export function logNetworkError(error, context = {}) {
  logBackendError(error, {
    type: 'NETWORK',
    severity: 'MEDIUM',
    userMessage: 'Network error occurred',
    context
  });
}

/**
 * Log Discord-related errors
 * @param {Error|string} error - Discord error
 * @param {Object} context - Additional context
 */
export function logDiscordError(error, context = {}) {
  logBackendError(error, {
    type: 'DISCORD',
    severity: 'MEDIUM',
    userMessage: 'Discord integration error',
    context
  });
}

export default {
  logBackendError,
  withErrorLogging,
  logDatabaseError,
  logAuthError,
  logNetworkError,
  logDiscordError
};
