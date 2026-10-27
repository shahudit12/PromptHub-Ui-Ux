// Production-grade structured logger suppressing debug logs in production
import { env } from '../config/env.ts';
import { redactSecrets } from './secretRedactor.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDev = env.IS_DEV;

  debug(message: string, ...meta: any[]): void {
    if (this.isDev) {
      console.debug(`[DEBUG] ${redactSecrets(message)}`, ...meta.map((m) => redactSecrets(m)));
    }
  }

  info(message: string, ...meta: any[]): void {
    console.info(`[INFO] ${redactSecrets(message)}`, ...meta.map((m) => redactSecrets(m)));
  }

  warn(message: string, ...meta: any[]): void {
    console.warn(`[WARN] ${redactSecrets(message)}`, ...meta.map((m) => redactSecrets(m)));
  }

  error(message: string, error?: any, ...meta: any[]): void {
    console.error(
      `[ERROR] ${redactSecrets(message)}`,
      error ? redactSecrets(error) : undefined,
      ...meta.map((m) => redactSecrets(m))
    );
  }
}

export const logger = new Logger();
