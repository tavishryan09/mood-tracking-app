/**
 * Feature Flag System
 *
 * Allows safe rollout of new features in production with easy toggle
 * Supports localStorage persistence and environment-based defaults
 */

export enum FeatureFlag {
  // React Query Migration
  REACT_QUERY_PLANNING = 'react_query_planning',
  REACT_QUERY_PROJECTS = 'react_query_projects',
  REACT_QUERY_DASHBOARD = 'react_query_dashboard',

  // Performance Features
  PERFORMANCE_MONITORING = 'performance_monitoring',
  OPTIMISTIC_UPDATES = 'optimistic_updates',
  PERSISTENT_CACHE = 'persistent_cache',

  // UI Features
  DARK_MODE = 'dark_mode',
  EXPERIMENTAL_UI = 'experimental_ui',
}

interface FeatureFlagConfig {
  defaultValue: boolean;
  description: string;
  requiresReload?: boolean;
}

const FEATURE_FLAG_CONFIG: Record<FeatureFlag, FeatureFlagConfig> = {
  [FeatureFlag.REACT_QUERY_PLANNING]: {
    defaultValue: false, // Start disabled for safe rollout
    description: 'Use React Query for Planning screen data fetching',
    requiresReload: true,
  },
  [FeatureFlag.REACT_QUERY_PROJECTS]: {
    defaultValue: false,
    description: 'Use React Query for Projects screen data fetching',
    requiresReload: true,
  },
  [FeatureFlag.REACT_QUERY_DASHBOARD]: {
    defaultValue: false,
    description: 'Use React Query for Dashboard screen data fetching',
    requiresReload: true,
  },
  [FeatureFlag.PERFORMANCE_MONITORING]: {
    defaultValue: __DEV__, // Enable in dev by default
    description: 'Track and log performance metrics',
  },
  [FeatureFlag.OPTIMISTIC_UPDATES]: {
    defaultValue: false,
    description: 'Enable optimistic UI updates for mutations',
  },
  [FeatureFlag.PERSISTENT_CACHE]: {
    defaultValue: false,
    description: 'Enable persistent caching to localStorage (survives app restarts)',
  },
  [FeatureFlag.DARK_MODE]: {
    defaultValue: true,
    description: 'Enable dark mode support',
  },
  [FeatureFlag.EXPERIMENTAL_UI]: {
    defaultValue: false,
    description: 'Enable experimental UI features',
  },
};

class FeatureFlagManager {
  private flags: Map<FeatureFlag, boolean> = new Map();
  private storageKey = 'feature_flags';

  constructor() {
    this.loadFlags();
  }

  /**
   * Load flags from localStorage, falling back to defaults
   */
  private loadFlags() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        Object.entries(parsed).forEach(([key, value]) => {
          this.flags.set(key as FeatureFlag, value as boolean);
        });
      }
    } catch (error) {
      console.warn('[FeatureFlags] Failed to load from localStorage:', error);
    }

    // Set defaults for any missing flags
    Object.entries(FEATURE_FLAG_CONFIG).forEach(([flag, config]) => {
      if (!this.flags.has(flag as FeatureFlag)) {
        this.flags.set(flag as FeatureFlag, config.defaultValue);
      }
    });
  }

  /**
   * Save flags to localStorage
   */
  private saveFlags() {
    try {
      const flagsObject: Record<string, boolean> = {};
      this.flags.forEach((value, key) => {
        flagsObject[key] = value;
      });
      localStorage.setItem(this.storageKey, JSON.stringify(flagsObject));
    } catch (error) {
      console.warn('[FeatureFlags] Failed to save to localStorage:', error);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isEnabled(flag: FeatureFlag): boolean {
    const value = this.flags.get(flag);
    if (value !== undefined) {
      return value;
    }

    // Fallback to default
    const config = FEATURE_FLAG_CONFIG[flag];
    return config?.defaultValue ?? false;
  }

  /**
   * Enable a feature flag
   */
  enable(flag: FeatureFlag, save = true) {
    this.flags.set(flag, true);
    if (save) {
      this.saveFlags();
    }

    const config = FEATURE_FLAG_CONFIG[flag];
    if (config?.requiresReload) {
      console.log(`[FeatureFlags] "${flag}" enabled. Reload required for changes to take effect.`);
    }
  }

  /**
   * Disable a feature flag
   */
  disable(flag: FeatureFlag, save = true) {
    this.flags.set(flag, false);
    if (save) {
      this.saveFlags();
    }

    const config = FEATURE_FLAG_CONFIG[flag];
    if (config?.requiresReload) {
      console.log(`[FeatureFlags] "${flag}" disabled. Reload required for changes to take effect.`);
    }
  }

  /**
   * Toggle a feature flag
   */
  toggle(flag: FeatureFlag, save = true): boolean {
    const newValue = !this.isEnabled(flag);
    this.flags.set(flag, newValue);
    if (save) {
      this.saveFlags();
    }

    const config = FEATURE_FLAG_CONFIG[flag];
    if (config?.requiresReload) {
      console.log(
        `[FeatureFlags] "${flag}" ${newValue ? 'enabled' : 'disabled'}. Reload required for changes to take effect.`
      );
    }

    return newValue;
  }

  /**
   * Get all flags and their current state
   */
  getAllFlags(): Record<FeatureFlag, boolean> {
    const result: Partial<Record<FeatureFlag, boolean>> = {};
    Object.values(FeatureFlag).forEach((flag) => {
      result[flag] = this.isEnabled(flag);
    });
    return result as Record<FeatureFlag, boolean>;
  }

  /**
   * Get flag configuration
   */
  getConfig(flag: FeatureFlag): FeatureFlagConfig | undefined {
    return FEATURE_FLAG_CONFIG[flag];
  }

  /**
   * Reset all flags to defaults
   */
  resetToDefaults() {
    Object.entries(FEATURE_FLAG_CONFIG).forEach(([flag, config]) => {
      this.flags.set(flag as FeatureFlag, config.defaultValue);
    });
    this.saveFlags();
    console.log('[FeatureFlags] Reset all flags to defaults');
  }

  /**
   * Clear all flags from storage
   */
  clear() {
    try {
      localStorage.removeItem(this.storageKey);
      this.flags.clear();
      this.loadFlags();
      console.log('[FeatureFlags] Cleared all flags from storage');
    } catch (error) {
      console.warn('[FeatureFlags] Failed to clear storage:', error);
    }
  }

  /**
   * Log current flag states
   */
  logFlags() {
    console.group('[FeatureFlags] Current State');
    Object.values(FeatureFlag).forEach((flag) => {
      const enabled = this.isEnabled(flag);
      const config = this.getConfig(flag);
      console.log(`${flag}: ${enabled ? '✅ enabled' : '❌ disabled'}`, config?.description || '');
    });
    console.groupEnd();
  }
}

// Export singleton instance
export const featureFlags = new FeatureFlagManager();

// Convenience hook for React components
export const useFeatureFlag = (flag: FeatureFlag): boolean => {
  return featureFlags.isEnabled(flag);
};

// Export for debugging in dev console
if (__DEV__ && typeof window !== 'undefined') {
  (window as any).featureFlags = featureFlags;
  console.log('[FeatureFlags] Available globally as window.featureFlags');
  console.log('[FeatureFlags] Try: featureFlags.logFlags()');
}

export default featureFlags;
