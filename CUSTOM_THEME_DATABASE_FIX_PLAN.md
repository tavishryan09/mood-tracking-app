# Custom Theme Database Storage Fix Plan

## CRITICAL PROBLEM IDENTIFIED

The custom color theme system is **incorrectly using AsyncStorage (browser local storage)** instead of the database. This means:
- ❌ Custom themes are NOT saved to database
- ❌ Custom themes are lost when browser cache is cleared
- ❌ Custom themes set as "default for all users" are NOT shared across users
- ❌ Custom themes are NOT backed up

## Files Using AsyncStorage (WRONG):

1. **CustomColorThemeContext.tsx** (lines 8-10, 107, 119, 122, 159, 182, 195)
   - `CUSTOM_COLOR_PALETTES_KEY = '@app_custom_color_palettes'`
   - `ELEMENT_COLOR_MAPPING_KEY = '@app_element_color_mapping'`
   - `ACTIVE_CUSTOM_THEME_KEY = '@app_active_custom_theme'`

2. **ColorPaletteEditorScreen.tsx** (lines 9, 11)
   - `CUSTOM_PALETTES_KEY = '@app_custom_palettes'`

3. **ManageCustomThemesScreen.tsx** (likely also using AsyncStorage)

4. **CustomColorManagerScreen.tsx** (likely also using AsyncStorage)

## CORRECT DATABASE STORAGE STRUCTURE

### User-Specific Settings (UserSettings table):
```typescript
{
  key: 'custom_color_palettes',
  value: {
    'mood_theme_id': {
      id: 'mood_theme_id',
      name: 'Mood',
      colors: [...],
      // ... all palette data
    }
  }
}

{
  key: 'element_color_mapping',
  value: {
    'mood_theme_id': {
      // ... element mappings
    }
  }
}

{
  key: 'active_custom_theme',
  value: 'mood_theme_id'
}
```

### App-Wide Settings (AppSettings table):
```typescript
{
  key: 'default_custom_theme_palettes',
  value: {
    'mood_theme_id': {
      id: 'mood_theme_id',
      name: 'Mood',
      colors: [...],
      // ... all palette data
    }
  }
}

{
  key: 'default_custom_theme_mappings',
  value: {
    'mood_theme_id': {
      // ... element mappings
    }
  }
}

{
  key: 'default_custom_theme_id',
  value: 'mood_theme_id'
}
```

## MIGRATION PLAN

### Step 1: Update CustomColorThemeContext.tsx
- Replace all `AsyncStorage` calls with `settingsAPI` calls
- Load from database: `settingsAPI.user.get('custom_color_palettes')`
- Save to database: `settingsAPI.user.set('custom_color_palettes', data)`
- Check app defaults: `settingsAPI.app.get('default_custom_theme_palettes')`

### Step 2: Update ColorPaletteEditorScreen.tsx
- Replace AsyncStorage with settingsAPI
- Save custom palettes to database

### Step 3: Update ManageCustomThemesScreen.tsx
- Replace AsyncStorage with settingsAPI
- Handle "set as default for all users" by saving to AppSettings

### Step 4: Update CustomColorManagerScreen.tsx
- Replace AsyncStorage with settingsAPI

### Step 5: Create Migration Script
- Read existing AsyncStorage data from browser
- Save to database via API
- Provide UI button for users to "Backup themes to database"

## IMMEDIATE FIX STEPS

1. Check Prisma Studio (http://localhost:5555) to see if ANY custom theme data was saved
2. Check browser localStorage to see if data still exists there
3. Update CustomColorThemeContext to use database
4. Update all screens to use database
5. Test save/load functionality

## DATA RECOVERY

If the "Mood" theme is in browser localStorage:
1. Extract from: `localStorage.getItem('@app_custom_color_palettes')`
2. Save to database via: `POST /api/settings/user` with key `custom_color_palettes`
3. Set as default via: `POST /api/settings/app` with key `default_custom_theme_palettes`

