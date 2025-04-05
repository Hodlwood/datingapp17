/**
 * Error Utilities
 * 
 * This file provides consistent error handling and logging utilities
 * for the application. It centralizes error handling logic and provides
 * a standardized way to log errors.
 */

// Error types for different categories of errors
export enum ErrorType {
  AUTH = 'auth',
  UPLOAD = 'upload',
  DATABASE = 'database',
  VALIDATION = 'validation',
  NETWORK = 'network',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Interface for structured error objects
export interface AppError {
  type: ErrorType;
  message: string;
  severity: ErrorSeverity;
  originalError?: any;
  context?: Record<string, any>;
  timestamp: number;
}

/**
 * Creates a standardized error object
 */
export function createError(
  type: ErrorType,
  message: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  originalError?: any,
  context?: Record<string, any>
): AppError {
  return {
    type,
    message,
    severity,
    originalError,
    context,
    timestamp: Date.now()
  };
}

/**
 * Logs an error to the console with consistent formatting
 */
export function logError(error: AppError): void {
  const { type, message, severity, originalError, context, timestamp } = error;
  
  // Format the error message
  const formattedMessage = `[${type.toUpperCase()}] [${severity.toUpperCase()}] ${message}`;
  
  // Log based on severity
  switch (severity) {
    case ErrorSeverity.LOW:
      console.log(formattedMessage);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn(formattedMessage);
      break;
    case ErrorSeverity.HIGH:
    case ErrorSeverity.CRITICAL:
      console.error(formattedMessage);
      break;
  }
  
  // Log additional context if available
  if (context && Object.keys(context).length > 0) {
    console.log('Context:', context);
  }
  
  // Log original error if available
  if (originalError) {
    console.error('Original error:', originalError);
  }
  
  // Log timestamp
  console.log(`Timestamp: ${new Date(timestamp).toISOString()}`);
}

/**
 * Handles an error by logging it and optionally performing additional actions
 */
export function handleError(
  error: AppError,
  additionalActions?: (error: AppError) => void
): void {
  // Log the error
  logError(error);
  
  // Perform additional actions if provided
  if (additionalActions) {
    additionalActions(error);
  }
}

/**
 * Wraps an async function with error handling
 */
export function withErrorHandling<T>(
  fn: () => Promise<T>,
  errorType: ErrorType,
  errorMessage: string,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  additionalActions?: (error: AppError) => void
): Promise<T> {
  return fn().catch((originalError) => {
    const error = createError(
      errorType,
      errorMessage,
      severity,
      originalError
    );
    
    handleError(error, additionalActions);
    
    // Re-throw the error to allow the caller to handle it
    throw error;
  });
}

/**
 * Creates a user-friendly error message from an AppError
 */
export function getUserFriendlyMessage(error: AppError): string {
  // Map error types to user-friendly messages
  switch (error.type) {
    case ErrorType.AUTH:
      return 'Authentication error. Please try logging in again.';
    case ErrorType.UPLOAD:
      return 'Failed to upload file. Please try again.';
    case ErrorType.DATABASE:
      return 'Database error. Please try again later.';
    case ErrorType.VALIDATION:
      return error.message; // Validation errors are already user-friendly
    case ErrorType.NETWORK:
      return 'Network error. Please check your connection and try again.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
} 