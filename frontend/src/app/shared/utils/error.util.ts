import { HttpErrorResponse } from '@angular/common/http';

/** Extracts a friendly, user-safe message from any error thrown by an HttpClient call. */
export function friendlyError(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: { message?: string } } | null;
    if (body?.error?.message) return body.error.message;
    if (error.status === 0) return 'Unable to reach the server. Please check your connection and try again.';
    if (error.status === 401) return 'Please log in to continue.';
    if (error.status === 403) return 'You do not have permission to do that.';
    if (error.status === 404) return 'The requested item could not be found.';
    if (error.status >= 500) return 'The server ran into a problem. Please try again shortly.';
  }
  return fallback;
}
