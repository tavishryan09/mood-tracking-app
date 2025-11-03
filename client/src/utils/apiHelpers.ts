/**
 * Helper function to add timeout to API calls
 * This ensures the app doesn't hang indefinitely when the backend is unavailable
 *
 * Reduced timeout to 1 second for faster UI response when backend is unavailable
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 1000
): Promise<T> => {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );

  return Promise.race([promise, timeout]);
};

/**
 * Wrapper for API calls that handles errors gracefully
 * Returns null on error instead of throwing
 */
export const safeApiCall = async <T>(
  apiCall: () => Promise<T>,
  timeoutMs: number = 1000
): Promise<T | null> => {
  try {
    return await withTimeout(apiCall(), timeoutMs);
  } catch (error) {
    console.error('API call failed:', error);
    return null;
  }
};

/**
 * Fast timeout for screen loads - fails quickly when backend is unavailable
 */
export const FAST_TIMEOUT = 800; // 0.8 seconds

/**
 * Standard timeout for user-initiated actions
 */
export const STANDARD_TIMEOUT = 3000; // 3 seconds
