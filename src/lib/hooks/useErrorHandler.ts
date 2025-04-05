import { useState, useCallback } from 'react';
import { AppError, ErrorType, ErrorSeverity, createError, logError, handleError as handleErrorUtil, getUserFriendlyMessage } from '@/lib/utils/errorUtils';

interface UseErrorHandlerOptions {
  showUserFriendlyMessage?: boolean;
  logToConsole?: boolean;
}

interface UseErrorHandlerResult {
  error: AppError | null;
  setError: (error: AppError | null) => void;
  handleError: (error: AppError) => void;
  clearError: () => void;
  withErrorHandling: <T>(fn: () => Promise<T>) => Promise<T | null>;
}

/**
 * Custom hook for handling errors in components
 */
export const useErrorHandler = (options: UseErrorHandlerOptions = {}): UseErrorHandlerResult => {
  const { showUserFriendlyMessage = true, logToConsole = true } = options;
  const [error, setError] = useState<AppError | null>(null);

  const handleError = useCallback((error: AppError) => {
    setError(error);
    if (logToConsole) {
      logError(error);
    }
    handleErrorUtil(error);
  }, [logToConsole]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const withErrorHandling = useCallback(async <T>(fn: () => Promise<T>): Promise<T | null> => {
    try {
      return await fn();
    } catch (err: any) {
      const appError = createError(
        ErrorType.UNKNOWN,
        err.message || 'An unexpected error occurred',
        ErrorSeverity.HIGH,
        err
      );
      handleError(appError);
      return null;
    }
  }, [handleError]);

  return {
    error,
    setError,
    handleError,
    clearError,
    withErrorHandling
  };
}; 