/**
 * Centralized logging utility
 *
 * Usage:
 * - Development: All logs output to console
 * - Production: Only errors are logged, can be sent to monitoring service
 *
 * Replace console.log with logger.log throughout the app
 */

const isDevelopment = __DEV__;

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: any;
  context?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 100; // Keep last 100 logs in memory

  /**
   * Debug-level logging (only in development)
   */
  debug(message: string, data?: any, context?: string) {
    if (isDevelopment) {
      console.log(`[DEBUG]${context ? ` [${context}]` : ''} ${message}`, data || '');
      this.addLog(LogLevel.DEBUG, message, data, context);
    }
  }

  /**
   * Info-level logging (only in development)
   */
  log(message: string, data?: any, context?: string) {
    if (isDevelopment) {
      console.log(`[INFO]${context ? ` [${context}]` : ''} ${message}`, data || '');
      this.addLog(LogLevel.INFO, message, data, context);
    }
  }

  /**
   * Info-level logging (alias for log)
   */
  info(message: string, data?: any, context?: string) {
    this.log(message, data, context);
  }

  /**
   * Warning-level logging (only in development)
   */
  warn(message: string, data?: any, context?: string) {
    if (isDevelopment) {
      console.warn(`[WARN]${context ? ` [${context}]` : ''} ${message}`, data || '');
    }
    this.addLog(LogLevel.WARN, message, data, context);

    // TODO: Send warnings to monitoring in production
    // if (!isDevelopment) {
    //   this.sendToMonitoring(LogLevel.WARN, message, data, context);
    // }
  }

  /**
   * Error-level logging (always logged, even in production)
   */
  error(message: string, error?: Error | any, context?: string) {
    console.error(`[ERROR]${context ? ` [${context}]` : ''} ${message}`, error || '');
    this.addLog(LogLevel.ERROR, message, error, context);

    // TODO: Send errors to monitoring service in production
    // if (!isDevelopment) {
    //   this.sendToMonitoring(LogLevel.ERROR, message, error, context);
    // }
  }

  /**
   * Add log entry to in-memory buffer
   */
  private addLog(level: LogLevel, message: string, data?: any, context?: string) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
      context,
    };

    this.logs.push(entry);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  /**
   * Get recent logs (useful for debugging)
   */
  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(log => log.level === level);
    }
    return [...this.logs];
  }

  /**
   * Clear all logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Get logs as formatted string
   */
  getLogsAsString(): string {
    return this.logs
      .map(log => `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}]${log.context ? ` [${log.context}]` : ''} ${log.message}`)
      .join('\n');
  }

  /**
   * Send to external monitoring service
   * TODO: Implement integration with Sentry, LogRocket, etc.
   */
  private sendToMonitoring(level: LogLevel, message: string, data?: any, context?: string) {
    // Example Sentry integration:
    // if (level === LogLevel.ERROR) {
    //   Sentry.captureException(data instanceof Error ? data : new Error(message), {
    //     level: 'error',
    //     tags: { context },
    //     extra: { data },
    //   });
    // } else {
    //   Sentry.captureMessage(message, {
    //     level: level as Sentry.SeverityLevel,
    //     tags: { context },
    //     extra: { data },
    //   });
    // }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export default for easier imports
export default logger;
