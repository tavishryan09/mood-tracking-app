/**
 * API Timeout Wrapper Utility
 *
 * Wraps API calls with a configurable timeout to prevent hanging requests.
 * Uses Promise.race to return whichever completes first: the API call or the timeout.
 *
 * @example
 * ```typescript
 * // Basic usage with default 2000ms timeout
 * const response = await apiWithTimeout(clientsAPI.getAll());
 *
 * // Custom timeout duration
 * const response = await apiWithTimeout(projectsAPI.create(data), 5000);
 *
 * // Custom timeout and error message
 * const response = await apiWithTimeout(
 *   authAPI.login(credentials),
 *   3000,
 *   'Login timeout - please try again'
 * );
 * ```
 */

/**
 * Wraps an API call with a timeout promise
 *
 * @param apiCall - The API promise to execute
 * @param timeoutMs - Timeout duration in milliseconds (default: 2000)
 * @param errorMessage - Custom error message for timeout (default: 'Request timeout')
 * @returns The API response if successful
 * @throws Error with the specified message if timeout occurs
 */
export const apiWithTimeout = async <T>(
  apiCall: Promise<T>,
  timeoutMs: number = 2000,
  errorMessage: string = 'Request timeout'
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  );

  return Promise.race([apiCall, timeout]);
};

/**
 * Common timeout durations for different operation types
 */
export const TIMEOUT_DURATIONS = {
  /** Quick operations like GET requests (800ms) */
  QUICK: 800,
  /** Standard operations like POST/PUT (2000ms) */
  STANDARD: 2000,
  /** Long operations like file uploads or complex queries (5000ms) */
  LONG: 5000,
  /** Very long operations like batch processing (10000ms) */
  VERY_LONG: 10000,
} as const;
