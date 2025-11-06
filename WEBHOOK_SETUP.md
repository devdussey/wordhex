# Error Logging Webhooks Setup Guide

This guide will help you configure webhooks to receive error notifications from your WordHex application.

## Overview

The webhook system captures errors from three sources:
- **Frontend errors**: JavaScript errors, network failures, API errors
- **Backend errors**: Server crashes, database errors, API failures
- **Console errors**: Uncaught exceptions and unhandled promise rejections

## Supported Webhook Types

### 1. Discord Webhooks

Discord webhooks send rich embedded messages with color-coded severity levels.

**Setup:**
1. Go to your Discord server settings
2. Navigate to Integrations → Webhooks
3. Click "New Webhook"
4. Name it (e.g., "WordHex Error Logs")
5. Select the channel where errors should be posted
6. Copy the Webhook URL
7. Add to your `.env` file:

```env
ERROR_WEBHOOK_DISCORD_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
ERROR_WEBHOOK_DISCORD_ENABLED=true
ERROR_WEBHOOK_DISCORD_MIN_SEVERITY=MEDIUM
```

### 2. Slack Webhooks

Slack webhooks send structured block messages with error details.

**Setup:**
1. Go to https://api.slack.com/apps
2. Create a new app or select an existing one
3. Navigate to "Incoming Webhooks"
4. Activate Incoming Webhooks
5. Click "Add New Webhook to Workspace"
6. Select the channel for error notifications
7. Copy the Webhook URL
8. Add to your `.env` file:

```env
ERROR_WEBHOOK_SLACK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ERROR_WEBHOOK_SLACK_ENABLED=true
ERROR_WEBHOOK_SLACK_MIN_SEVERITY=MEDIUM
```

### 3. Generic HTTP Webhooks

Send error logs to any custom HTTP endpoint.

**Setup:**
```env
ERROR_WEBHOOK_GENERIC_URL=https://your-api.com/webhooks/errors
ERROR_WEBHOOK_GENERIC_ENABLED=true
ERROR_WEBHOOK_GENERIC_MIN_SEVERITY=HIGH
```

**Payload Format:**
```json
{
  "event": "error",
  "severity": "HIGH",
  "error": {
    "type": "API",
    "message": "Failed to fetch user data",
    "userMessage": "Unable to load your profile. Please try again.",
    "source": "FRONTEND",
    "context": {
      "endpoint": "/api/users/me",
      "statusCode": 500
    },
    "stack": "Error: Failed to fetch...",
    "timestamp": "2025-11-06T12:34:56.789Z"
  },
  "environment": "production"
}
```

## Configuration Options

### Severity Levels

Control which errors are sent to each webhook:

- **LOW**: Informational errors, minor issues
- **MEDIUM**: Warning-level errors, recoverable issues
- **HIGH**: Serious errors affecting functionality
- **CRITICAL**: System-breaking errors, crashes

**Example**: Set `MIN_SEVERITY=HIGH` to only receive HIGH and CRITICAL errors.

### Enable/Disable Webhooks

```env
# Enable a webhook
ERROR_WEBHOOK_DISCORD_ENABLED=true

# Disable a webhook
ERROR_WEBHOOK_DISCORD_ENABLED=false
```

### Multiple Webhooks

You can enable multiple webhook types simultaneously. Each will receive errors independently based on their severity threshold.

```env
# Send all medium+ errors to Discord
ERROR_WEBHOOK_DISCORD_ENABLED=true
ERROR_WEBHOOK_DISCORD_MIN_SEVERITY=MEDIUM

# Send only critical errors to Slack
ERROR_WEBHOOK_SLACK_ENABLED=true
ERROR_WEBHOOK_SLACK_MIN_SEVERITY=CRITICAL
```

## Testing Webhooks

To test your webhook configuration, you can use the test endpoint:

```bash
curl -X POST http://localhost:3001/api/webhooks/test \
  -H "Content-Type: application/json"
```

This will send a test error to all configured webhooks.

## Error Sources

### Frontend Errors

Captured automatically:
- Component render errors (via ErrorBoundary)
- Network request failures
- API errors
- Validation errors
- Authentication failures
- Uncaught JavaScript exceptions
- Unhandled promise rejections

### Backend Errors

Captured from:
- Express route handlers
- Database operations
- WebSocket connections
- OAuth authentication flows
- API request processing

### Console Errors

Captured from:
- `console.error()` calls
- Uncaught exceptions
- Unhandled promise rejections
- Process crashes

## Error Context

Each webhook includes:
- **Error Type**: NETWORK, API, VALIDATION, AUTH, DATABASE, etc.
- **Severity**: LOW, MEDIUM, HIGH, CRITICAL
- **Message**: Technical error description
- **User Message**: User-friendly error message
- **Source**: FRONTEND or BACKEND
- **Context**: Additional metadata (endpoints, status codes, user info)
- **Stack Trace**: For debugging (when available)
- **Timestamp**: When the error occurred
- **Environment**: development, staging, production

## Security Considerations

1. **Keep webhook URLs secret**: Treat them like passwords
2. **Use HTTPS**: Always use secure webhook URLs
3. **Rotate webhooks**: If a webhook URL is compromised, regenerate it
4. **Limit permissions**: Use channels with restricted access for sensitive errors
5. **Filter sensitive data**: Avoid logging passwords, tokens, or PII in error context

## Troubleshooting

### Webhooks not sending

1. Check webhook URL is correct in `.env`
2. Verify `ENABLED=true` for the webhook
3. Check severity threshold - errors may be below minimum
4. Check server logs for webhook delivery failures
5. Test the webhook URL manually with curl

### Discord webhook fails

- Verify the webhook hasn't been deleted
- Check the webhook URL format is correct
- Ensure the bot has permission to post in the channel

### Slack webhook fails

- Verify the Slack app is still installed
- Check the webhook URL hasn't expired
- Ensure the channel still exists

## Advanced Configuration

### Retry Logic

Webhooks automatically retry failed deliveries:
- 3 retry attempts
- Exponential backoff (1s, 2s, 4s)
- Logged to console on failure

### Batching

Frontend errors are batched before sending:
- Synced every 30 seconds
- Immediate delivery for CRITICAL errors
- Deduplication of repeated errors

## Example Webhook Messages

### Discord (HIGH severity)
```
🔴 Error Log: Database connection failed

Error Type: DATABASE
Severity: HIGH
Source: BACKEND

Context:
{
  "operation": "user_query",
  "database": "postgresql"
}

Environment: production
2025-11-06T12:34:56.789Z
```

### Slack (CRITICAL severity)
```
🚨 Error Log: Server crashed

Type: UNKNOWN
Severity: CRITICAL
Source: BACKEND
User Message: The server has encountered a critical error and needs to restart.

Environment: production | 2025-11-06T12:34:56.789Z
```

## Support

For issues or questions about webhook configuration:
1. Check this guide
2. Review `.env.example` for configuration format
3. Test webhooks using the `/api/webhooks/test` endpoint
4. Check server logs for detailed error messages
