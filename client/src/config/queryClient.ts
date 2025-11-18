import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { featureFlags, FeatureFlag } from '../utils/featureFlags';

// Create a query client with optimized default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 1 time
      retry: 1,
      // Refetch on window focus for fresh data
      refetchOnWindowFocus: true,
      // Don't refetch on mount if data is fresh
      refetchOnMount: false,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});

/**
 * Initialize persistent cache with localStorage
 * Only runs when PERSISTENT_CACHE feature flag is enabled
 *
 * Benefits:
 * - Cache survives app restarts
 * - Instant app loading from cached data
 * - Reduced server load
 * - Better offline experience
 */
export const initializePersistence = () => {
  // Only enable on web platform (localStorage available)
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    console.log('[QueryClient] Persistent cache not available on this platform');
    return;
  }

  if (!featureFlags.isEnabled(FeatureFlag.PERSISTENT_CACHE)) {
    console.log('[QueryClient] Persistent cache disabled via feature flag');
    return;
  }

  try {
    const persister = createSyncStoragePersister({
      storage: window.localStorage,
      key: 'REACT_QUERY_OFFLINE_CACHE',
    });

    persistQueryClient({
      queryClient,
      persister,
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      hydrateOptions: {
        // Only restore queries that haven't expired
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24, // 24 hours
          },
        },
      },
      dehydrateOptions: {
        // Don't persist errors or loading states
        shouldDehydrateQuery: (query) => {
          return query.state.status === 'success';
        },
      },
    });

    console.log('[QueryClient] Persistent cache initialized successfully');
  } catch (error) {
    console.error('[QueryClient] Failed to initialize persistent cache:', error);

    // Handle quota exceeded errors gracefully
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.warn('[QueryClient] localStorage quota exceeded. Clearing old cache...');
      try {
        localStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
        console.log('[QueryClient] Old cache cleared. Please refresh to reinitialize.');
      } catch (clearError) {
        console.error('[QueryClient] Failed to clear cache:', clearError);
      }
    }
  }
};
