import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsAPI } from '../services/api';

/**
 * EMERGENCY MIGRATION: Move all custom theme data from localStorage to database
 * This should be called ONCE when a user logs in to migrate their themes
 */
export const migrateLocalStorageToDatabase = async (): Promise<void> => {
  try {

    // Check all possible localStorage keys
    const keysToMigrate = [
      { local: '@app_custom_palettes', db: 'custom_palettes' },
      { local: '@app_custom_color_palettes', db: 'custom_color_palettes' },
      { local: '@app_element_color_mapping', db: 'element_color_mapping' },
      { local: '@app_active_custom_theme', db: 'active_custom_theme' },
    ];

    for (const { local, db } of keysToMigrate) {
      try {
        const data = await AsyncStorage.getItem(local);
        if (data) {
          const parsed = JSON.parse(data);

          // Save to database
          await settingsAPI.user.set(db, parsed);

        }
      } catch (error) {
        console.error(`[Migration] Error migrating ${local}:`, error);
      }
    }

  } catch (error) {
    console.error('[Migration] Fatal error during migration:', error);
    throw error;
  }
};

/**
 * Check if migration is needed
 */
export const needsMigration = async (): Promise<boolean> => {
  try {
    // Check if any localStorage data exists
    const hasLocalData = await AsyncStorage.getItem('@app_custom_palettes') ||
                        await AsyncStorage.getItem('@app_custom_color_palettes');

    return !!hasLocalData;
  } catch (error) {
    console.error('[Migration] Error checking migration status:', error);
    return false;
  }
};
