/**
 * Webhook Service for Error Logging
 * Supports Discord, Slack, and generic webhook endpoints
 */

const WEBHOOK_TYPES = {
  DISCORD: 'discord',
  SLACK: 'slack',
  GENERIC: 'generic'
};

const ERROR_SEVERITY_COLORS = {
  LOW: 0x3498db,      // Blue
  MEDIUM: 0xf39c12,   // Orange
  HIGH: 0xe74c3c,     // Red
  CRITICAL: 0x8b0000  // Dark Red
};

const ERROR_SEVERITY_EMOJI = {
  LOW: '🔵',
  MEDIUM: '🟠',
  HIGH: '🔴',
  CRITICAL: '🚨'
};

class WebhookService {
  constructor() {
    this.webhooks = this.loadWebhookConfig();
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Load webhook configuration from environment variables
   */
  loadWebhookConfig() {
    const webhooks = [];

    // Discord webhook
    if (process.env.ERROR_WEBHOOK_DISCORD_URL) {
      webhooks.push({
        type: WEBHOOK_TYPES.DISCORD,
        url: process.env.ERROR_WEBHOOK_DISCORD_URL,
        minSeverity: process.env.ERROR_WEBHOOK_DISCORD_MIN_SEVERITY || 'LOW',
        enabled: process.env.ERROR_WEBHOOK_DISCORD_ENABLED !== 'false'
      });
    }

    // Slack webhook
    if (process.env.ERROR_WEBHOOK_SLACK_URL) {
      webhooks.push({
        type: WEBHOOK_TYPES.SLACK,
        url: process.env.ERROR_WEBHOOK_SLACK_URL,
        minSeverity: process.env.ERROR_WEBHOOK_SLACK_MIN_SEVERITY || 'LOW',
        enabled: process.env.ERROR_WEBHOOK_SLACK_ENABLED !== 'false'
      });
    }

    // Generic webhook
    if (process.env.ERROR_WEBHOOK_GENERIC_URL) {
      webhooks.push({
        type: WEBHOOK_TYPES.GENERIC,
        url: process.env.ERROR_WEBHOOK_GENERIC_URL,
        minSeverity: process.env.ERROR_WEBHOOK_GENERIC_MIN_SEVERITY || 'LOW',
        enabled: process.env.ERROR_WEBHOOK_GENERIC_ENABLED !== 'false'
      });
    }

    return webhooks;
  }

  /**
   * Check if severity meets minimum threshold
   */
  shouldSendForSeverity(errorSeverity, minSeverity) {
    const severityLevels = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const errorLevel = severityLevels.indexOf(errorSeverity);
    const minLevel = severityLevels.indexOf(minSeverity);
    return errorLevel >= minLevel;
  }

  /**
   * Format error for Discord webhook
   */
  formatDiscordPayload(error) {
    const severity = error.severity || 'MEDIUM';
    const color = ERROR_SEVERITY_COLORS[severity] || ERROR_SEVERITY_COLORS.MEDIUM;
    const emoji = ERROR_SEVERITY_EMOJI[severity] || '⚠️';

    const fields = [
      {
        name: 'Error Type',
        value: error.type || 'UNKNOWN',
        inline: true
      },
      {
        name: 'Severity',
        value: severity,
        inline: true
      }
    ];

    if (error.source) {
      fields.push({
        name: 'Source',
        value: error.source,
        inline: true
      });
    }

    if (error.context) {
      let contextValue = '';
      if (typeof error.context === 'string') {
        contextValue = error.context;
      } else {
        contextValue = JSON.stringify(error.context, null, 2);
      }

      // Discord has a 1024 character limit per field
      if (contextValue.length > 1020) {
        contextValue = contextValue.substring(0, 1020) + '...';
      }

      fields.push({
        name: 'Context',
        value: `\`\`\`json\n${contextValue}\n\`\`\``,
        inline: false
      });
    }

    if (error.stack) {
      let stackValue = error.stack;
      if (stackValue.length > 1020) {
        stackValue = stackValue.substring(0, 1020) + '...';
      }
      fields.push({
        name: 'Stack Trace',
        value: `\`\`\`\n${stackValue}\n\`\`\``,
        inline: false
      });
    }

    return {
      embeds: [{
        title: `${emoji} Error Log: ${error.message || 'Unknown Error'}`,
        description: error.userMessage || error.message || 'An error occurred',
        color: color,
        fields: fields,
        timestamp: error.timestamp || new Date().toISOString(),
        footer: {
          text: `Environment: ${process.env.NODE_ENV || 'production'}`
        }
      }]
    };
  }

  /**
   * Format error for Slack webhook
   */
  formatSlackPayload(error) {
    const severity = error.severity || 'MEDIUM';
    const emoji = ERROR_SEVERITY_EMOJI[severity] || '⚠️';

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${emoji} Error Log: ${error.message || 'Unknown Error'}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Type:*\n${error.type || 'UNKNOWN'}`
          },
          {
            type: 'mrkdwn',
            text: `*Severity:*\n${severity}`
          }
        ]
      }
    ];

    if (error.source) {
      blocks.push({
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Source:*\n${error.source}`
          }
        ]
      });
    }

    if (error.userMessage) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*User Message:*\n${error.userMessage}`
        }
      });
    }

    if (error.context) {
      const contextStr = typeof error.context === 'string'
        ? error.context
        : JSON.stringify(error.context, null, 2);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Context:*\n\`\`\`${contextStr}\`\`\``
        }
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `Environment: ${process.env.NODE_ENV || 'production'} | ${error.timestamp || new Date().toISOString()}`
        }
      ]
    });

    return { blocks };
  }

  /**
   * Format error for generic webhook
   */
  formatGenericPayload(error) {
    return {
      event: 'error',
      severity: error.severity || 'MEDIUM',
      error: {
        type: error.type || 'UNKNOWN',
        message: error.message || 'Unknown error',
        userMessage: error.userMessage,
        source: error.source,
        context: error.context,
        stack: error.stack,
        timestamp: error.timestamp || new Date().toISOString()
      },
      environment: process.env.NODE_ENV || 'production'
    };
  }

  /**
   * Send webhook with retry logic
   */
  async sendWebhook(url, payload, attempt = 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed with status ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error(`Webhook delivery failed (attempt ${attempt}/${this.retryAttempts}):`, error.message);

      if (attempt < this.retryAttempts) {
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        return this.sendWebhook(url, payload, attempt + 1);
      }

      return { success: false, error: error.message };
    }
  }

  /**
   * Log error to all configured webhooks
   */
  async logError(error) {
    if (!this.webhooks || this.webhooks.length === 0) {
      // No webhooks configured
      return { sent: 0, failed: 0 };
    }

    const results = {
      sent: 0,
      failed: 0,
      details: []
    };

    for (const webhook of this.webhooks) {
      if (!webhook.enabled) {
        continue;
      }

      // Check severity threshold
      if (!this.shouldSendForSeverity(error.severity || 'MEDIUM', webhook.minSeverity)) {
        continue;
      }

      let payload;
      switch (webhook.type) {
        case WEBHOOK_TYPES.DISCORD:
          payload = this.formatDiscordPayload(error);
          break;
        case WEBHOOK_TYPES.SLACK:
          payload = this.formatSlackPayload(error);
          break;
        case WEBHOOK_TYPES.GENERIC:
          payload = this.formatGenericPayload(error);
          break;
        default:
          payload = this.formatGenericPayload(error);
      }

      const result = await this.sendWebhook(webhook.url, payload);

      if (result.success) {
        results.sent++;
        results.details.push({ webhook: webhook.type, status: 'success' });
      } else {
        results.failed++;
        results.details.push({ webhook: webhook.type, status: 'failed', error: result.error });
      }
    }

    return results;
  }

  /**
   * Log multiple errors in batch
   */
  async logErrors(errors) {
    const results = [];

    for (const error of errors) {
      const result = await this.logError(error);
      results.push(result);
    }

    return {
      total: errors.length,
      sent: results.reduce((sum, r) => sum + r.sent, 0),
      failed: results.reduce((sum, r) => sum + r.failed, 0),
      details: results
    };
  }

  /**
   * Test webhook configuration
   */
  async testWebhooks() {
    const testError = {
      type: 'TEST',
      severity: 'LOW',
      message: 'Webhook Test',
      userMessage: 'This is a test error to verify webhook configuration',
      source: 'BACKEND',
      context: {
        test: true,
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    };

    return await this.logError(testError);
  }
}

// Singleton instance
const webhookService = new WebhookService();

export default webhookService;
