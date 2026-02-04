/**
 * Simple logger abstraction.
 *
 * Currently logs to console. Replace the implementation to send logs
 * to external services like Datadog, Logtail, or any logging provider.
 *
 * @example
 * // To integrate with Datadog:
 * // import { createLogger } from 'datadog-winston';
 * // export const logger = createLogger({ ... });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  [key: string]: unknown;
}

interface Logger {
  debug: (message: string, payload?: LogPayload) => void;
  info: (message: string, payload?: LogPayload) => void;
  warn: (message: string, payload?: LogPayload) => void;
  error: (message: string, payload?: LogPayload) => void;
}

function formatMessage(level: LogLevel, message: string, payload?: LogPayload): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

  if (payload && Object.keys(payload).length > 0) {
    return `${prefix} ${message} ${JSON.stringify(payload)}`;
  }

  return `${prefix} ${message}`;
}

export const logger: Logger = {
  debug: (message, payload) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatMessage('debug', message, payload));
    }
  },

  info: (message, payload) => {
    console.log(formatMessage('info', message, payload));
  },

  warn: (message, payload) => {
    console.warn(formatMessage('warn', message, payload));
  },

  error: (message, payload) => {
    console.error(formatMessage('error', message, payload));
  },
};
