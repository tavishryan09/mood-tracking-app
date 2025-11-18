import { useState, useEffect } from 'react';
import { featureFlags, FeatureFlag } from '../utils/featureFlags';

/**
 * React hook for feature flags with reactive updates
 *
 * Usage:
 * const isReactQueryEnabled = useFeatureFlag(FeatureFlag.REACT_QUERY_PLANNING);
 *
 * if (isReactQueryEnabled) {
 *   // Use new React Query implementation
 * } else {
 *   // Use old implementation
 * }
 */
export const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const [isEnabled, setIsEnabled] = useState(() => featureFlags.isEnabled(flag));

  useEffect(() => {
    // Update state when flag changes
    const checkFlag = () => {
      setIsEnabled(featureFlags.isEnabled(flag));
    };

    // Set up polling to detect changes (in case flag is changed from dev console)
    const interval = setInterval(checkFlag, 1000);

    return () => clearInterval(interval);
  }, [flag]);

  return isEnabled;
};

/**
 * Hook to get multiple feature flags at once
 *
 * Usage:
 * const { REACT_QUERY_PLANNING, OPTIMISTIC_UPDATES } = useFeatureFlags([
 *   FeatureFlag.REACT_QUERY_PLANNING,
 *   FeatureFlag.OPTIMISTIC_UPDATES,
 * ]);
 */
export const useFeatureFlags = (flags: FeatureFlag[]): Record<string, boolean> => {
  const [flagStates, setFlagStates] = useState(() => {
    const states: Record<string, boolean> = {};
    flags.forEach((flag) => {
      states[flag] = featureFlags.isEnabled(flag);
    });
    return states;
  });

  useEffect(() => {
    const checkFlags = () => {
      const newStates: Record<string, boolean> = {};
      flags.forEach((flag) => {
        newStates[flag] = featureFlags.isEnabled(flag);
      });

      // Only update if something changed
      if (JSON.stringify(newStates) !== JSON.stringify(flagStates)) {
        setFlagStates(newStates);
      }
    };

    const interval = setInterval(checkFlags, 1000);
    return () => clearInterval(interval);
  }, [flags, flagStates]);

  return flagStates;
};

export default useFeatureFlag;
