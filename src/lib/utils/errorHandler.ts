// Custom error types
export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_SERVER_ERROR'
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHENTICATED');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends APIError {
  constructor(message: string = 'Not authorized to perform this action') {
    super(message, 403, 'UNAUTHORIZED');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends APIError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// Error handler utility
export function handleError(error: unknown): { status: number; message: string; code: string } {
  // Log the error
  console.error('Error occurred:', error);

  // Handle known error types
  if (error instanceof APIError) {
    return {
      status: error.statusCode,
      message: error.message,
      code: error.code
    };
  }

  // Handle unknown errors
  if (error instanceof Error) {
    return {
      status: 500,
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR'
    };
  }

  // Handle non-Error objects
  return {
    status: 500,
    message: 'An unknown error occurred',
    code: 'INTERNAL_SERVER_ERROR'
  };
}

// Response helper
export function errorResponse(error: unknown) {
  const { status, message, code } = handleError(error);
  return new Response(
    JSON.stringify({ error: message, code }),
    { 
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
} 