/**
 * Extracts a user-friendly error message from an API error response
 * Handles RFC 7807 ProblemDetails format and other common error formats
 */
export function parseApiError(err: unknown): string {
  if (!err) {
    return 'An unexpected error occurred';
  }

  // Handle axios errors with response
  if (typeof err === 'object' && 'response' in err) {
    const axiosError = err as { response?: { data?: any; status?: number; statusText?: string } };
    
    if (axiosError.response?.data) {
      const data = axiosError.response.data;
      
      // Handle RFC 7807 ProblemDetails format
      if (data.detail) {
        return data.detail;
      }
      
      if (data.title && data.title !== 'One or more validation errors occurred.') {
        return data.title;
      }
      
      // Handle validation errors
      if (data.errors && typeof data.errors === 'object') {
        const errorMessages: string[] = [];
        for (const field in data.errors) {
          const fieldErrors = data.errors[field];
          if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
            errorMessages.push(...fieldErrors);
          }
        }
        if (errorMessages.length > 0) {
          // Return only the first error to avoid overwhelming users
          return errorMessages[0];
        }
      }
      
      // Handle other message formats
      if (data.message) {
        return data.message;
      }
      
      if (data.Error) {
        return data.Error;
      }
    }
    
    // Handle by status code
    const status = axiosError.response?.status;
    if (status === 400) {
      return 'Invalid request. Please check your input.';
    }
    if (status === 401) {
      return 'You are not authenticated. Please log in.';
    }
    if (status === 403) {
      return 'You do not have permission to perform this action.';
    }
    if (status === 404) {
      return 'The requested resource was not found.';
    }
    if (status === 409) {
      return 'This operation conflicts with existing data.';
    }
    if (status && status >= 500) {
      return 'A server error occurred. Please try again later.';
    }
    
    // Fallback to status text
    if (axiosError.response?.statusText) {
      return axiosError.response.statusText;
    }
  }

  // Handle network errors
  if (typeof err === 'object' && 'message' in err) {
    const message = (err as { message: string }).message;
    if (message.toLowerCase().includes('network')) {
      return 'Network error. Please check your connection.';
    }
    return message;
  }

  // Handle string errors
  if (typeof err === 'string') {
    return err;
  }

  return 'An unexpected error occurred';
}

/**
 * Checks if an error is a 401 Unauthorized response
 */
export function isUnauthorizedError(err: unknown): boolean {
  if (typeof err === 'object' && err && 'response' in err) {
    const axiosError = err as { response?: { status?: number } };
    return axiosError.response?.status === 401;
  }
  return false;
}

/**
 * Checks if an error is a 403 Forbidden response
 */
export function isForbiddenError(err: unknown): boolean {
  if (typeof err === 'object' && err && 'response' in err) {
    const axiosError = err as { response?: { status?: number } };
    return axiosError.response?.status === 403;
  }
  return false;
}
