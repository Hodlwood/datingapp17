// Log levels
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  SECURITY = 'SECURITY'
}

// Log entry interface
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
}

// Logger class
class Logger {
  private static instance: Logger;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000; // Keep last 1000 logs in memory

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    data?: any,
    request?: Request
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };

    if (request) {
      entry.path = new URL(request.url).pathname;
      entry.method = request.method;
      entry.userAgent = request.headers.get('user-agent') || undefined;
      entry.ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
    }

    return entry;
  }

  private log(level: LogLevel, message: string, data?: any, request?: Request) {
    const entry = this.createLogEntry(level, message, data, request);
    
    // Add to in-memory logs
    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${entry.timestamp}] ${level}: ${message}`, data || '');
    }

    // TODO: In production, send logs to a logging service
    // This could be Firebase Analytics, a third-party service, or your own logging infrastructure
  }

  // Public logging methods
  debug(message: string, data?: any, request?: Request) {
    this.log(LogLevel.DEBUG, message, data, request);
  }

  info(message: string, data?: any, request?: Request) {
    this.log(LogLevel.INFO, message, data, request);
  }

  warn(message: string, data?: any, request?: Request) {
    this.log(LogLevel.WARN, message, data, request);
  }

  error(message: string, data?: any, request?: Request) {
    this.log(LogLevel.ERROR, message, data, request);
  }

  security(message: string, data?: any, request?: Request) {
    this.log(LogLevel.SECURITY, message, data, request);
  }

  // Get recent logs
  getRecentLogs(level?: LogLevel, limit: number = 100): LogEntry[] {
    let filtered = this.logs;
    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }
    return filtered.slice(0, limit);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = Logger.getInstance(); 