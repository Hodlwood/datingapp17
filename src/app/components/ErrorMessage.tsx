import React from 'react';
import { XCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { AppError, ErrorSeverity, ErrorType } from '@/lib/utils/errorUtils';

interface ErrorMessageProps {
  error: string | AppError;
  onDismiss?: () => void;
  className?: string;
}

/**
 * A reusable error message component that displays errors in a consistent format
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, onDismiss, className = '' }) => {
  if (!error) return null;

  // Convert string error to AppError
  const appError: AppError = typeof error === 'string' 
    ? {
        type: ErrorType.UNKNOWN,
        message: error,
        severity: ErrorSeverity.MEDIUM,
        timestamp: Date.now(),
        context: {}
      }
    : error;

  // Determine icon and styling based on severity
  const getIcon = () => {
    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      case ErrorSeverity.HIGH:
        return <ExclamationTriangleIcon className="h-5 w-5 text-orange-500" />;
      case ErrorSeverity.MEDIUM:
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case ErrorSeverity.LOW:
        return <InformationCircleIcon className="h-5 w-5 text-blue-500" />;
      default:
        return <InformationCircleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getBackgroundColor = () => {
    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
        return 'bg-red-50';
      case ErrorSeverity.HIGH:
        return 'bg-orange-50';
      case ErrorSeverity.MEDIUM:
        return 'bg-yellow-50';
      case ErrorSeverity.LOW:
        return 'bg-blue-50';
      default:
        return 'bg-gray-50';
    }
  };

  const getTextColor = () => {
    switch (appError.severity) {
      case ErrorSeverity.CRITICAL:
        return 'text-red-800';
      case ErrorSeverity.HIGH:
        return 'text-orange-800';
      case ErrorSeverity.MEDIUM:
        return 'text-yellow-800';
      case ErrorSeverity.LOW:
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <div className={`rounded-md p-4 ${getBackgroundColor()} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3">
          <p className={`text-sm font-medium ${getTextColor()}`}>
            {appError.message}
          </p>
        </div>
        {onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`inline-flex rounded-md p-1.5 ${getBackgroundColor()} ${getTextColor()} hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-${getBackgroundColor()} focus:ring-${getTextColor()}`}
                onClick={onDismiss}
              >
                <span className="sr-only">Dismiss</span>
                <XCircleIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage; 