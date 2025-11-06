/**
 * Discord Logger Service
 * Sends error logs to a Discord webhook for monitoring and debugging
 */

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  timestamp: string;
}

class DiscordLogger {
  private webhookUrl: string | null = null;
  private isProduction = import.meta.env.PROD;
  private batchQueue: LogEntry[] = [];
  private batchTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_DELAY = 2000; // 2 seconds

  constructor() {
    // Get webhook URL from environment variables
    this.webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL || null;

    if (!this.webhookUrl && this.isProduction) {
      console.warn('[DiscordLogger] No Discord webhook URL configured. Set VITE_DISCORD_WEBHOOK_URL.');
    }
  }

  /**
   * Log an error to Discord (only in production)
   */
  async error(message: string, error?: Error, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'error',
      message,
      error,
      context,
      timestamp: new Date().toISOString(),
    };

    if (this.isProduction) {
      this.queueLog(entry);
    } else {
      console.error(`[${entry.timestamp}] ${message}`, error, context);
    }
  }

  /**
   * Log a warning to Discord (only critical in production)
   */
  async warn(message: string, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level: 'warn',
      message,
      context,
      timestamp: new Date().toISOString(),
    };

    console.warn(`[${entry.timestamp}] ${message}`, context);
  }

  /**
   * Log info (development only)
   */
  info(message: string, context?: Record<string, unknown>) {
    if (!this.isProduction) {
      console.info(`[${new Date().toISOString()}] ${message}`, context);
    }
  }

  /**
   * Queue logs for batch sending
   */
  private queueLog(entry: LogEntry) {
    this.batchQueue.push(entry);

    if (this.batchQueue.length >= this.BATCH_SIZE) {
      this.flushLogs();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushLogs(), this.BATCH_DELAY);
    }
  }

  /**
   * Send batched logs to Discord
   */
  private async flushLogs() {
    if (this.batchQueue.length === 0 || !this.webhookUrl) {
      return;
    }

    const logsToSend = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    try {
      await this.sendToDiscord(logsToSend);
    } catch (err) {
      console.error('[DiscordLogger] Failed to send logs to Discord:', err);
      // Don't rethrow - don't want logging to break the app
    }
  }

  /**
   * Send logs to Discord webhook
   */
  private async sendToDiscord(logs: LogEntry[]) {
    if (!this.webhookUrl) {
      return;
    }

    const embed = {
      title: '🚨 WordHex Error Report',
      color: 15158332, // Red
      timestamp: new Date().toISOString(),
      fields: logs.map((log) => ({
        name: `[${log.level.toUpperCase()}] ${log.message}`,
        value: this.formatLogDetails(log),
        inline: false,
      })),
      footer: {
        text: 'WordHex Logger',
      },
    };

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook returned status ${response.status}`);
      }
    } catch (error) {
      console.error('[DiscordLogger] Failed to send to Discord:', error);
    }
  }

  /**
   * Format log details for Discord embed
   */
  private formatLogDetails(log: LogEntry): string {
    const lines: string[] = [];

    lines.push(`**Time**: ${log.timestamp}`);

    if (log.error) {
      lines.push(`**Error**: ${log.error.message}`);
      if (log.error.stack) {
        const stackLines = log.error.stack.split('\n').slice(0, 3);
        lines.push(`**Stack**:\n\`\`\`${stackLines.join('\n')}\`\`\``);
      }
    }

    if (log.context && Object.keys(log.context).length > 0) {
      try {
        const contextStr = JSON.stringify(log.context, null, 2).substring(0, 500);
        lines.push(`**Context**: \`\`\`${contextStr}\`\`\``);
      } catch {
        lines.push(`**Context**: [Unable to serialize]`);
      }
    }

    return lines.join('\n') || 'No additional details';
  }

  /**
   * Force flush all pending logs before app shutdown
   */
  async shutdown() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    await this.flushLogs();
  }

  /**
   * Test the Discord webhook connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.webhookUrl) {
      console.warn('[DiscordLogger] No webhook URL configured');
      return false;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [
            {
              title: '✅ WordHex Logger Connected',
              description: 'Discord webhook is working correctly',
              color: 5763719, // Green
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('[DiscordLogger] Connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const discordLogger = new DiscordLogger();
