# Custom Color Palette System

## Overview

The new custom color palette system allows users to create fully customized color themes from scratch. Instead of being limited to predefined color palettes, users can now:

1. **Build custom colors** - Create a palette by adding custom colors with custom names and hex codes
2. **Set primary & secondary** - Designate one color as primary and another as secondary
3. **Map to elements** - Assign your custom colors to specific elements throughout the app

## User Flow

### Step 1: Create Your Color Palette

Navigate to: **Profile → Manage Custom Themes → Create New Palette**

1. Enter a name for your color palette (e.g., "Ocean Breeze Theme")
2. Add colors one by one:
   - Give each color a custom name (e.g., "Deep Ocean Blue")
   - Enter the hex code (e.g., #1E3A8A)
   - Optionally mark as Primary ✓
   - Optionally mark as Secondary ✓
3. Add as many colors as you want
4. Save the palette

### Step 2: Map Colors to App Elements

After saving your palette, you'll be directed to the Element Color Mapper where you can assign your colors to specific parts of the app:

#### Navigation Elements
- Tab Bar Background
- Tab Bar Active/Inactive Icons
- Tab Bar Active/Inactive Text
- Header Background/Text/Icons

#### Global Elements
- Primary/Secondary Buttons & Text
- Text (Primary, Secondary, Tertiary)
- Background & Card Background
- Border Colors
- Icons (Default, Inactive)
- Error/Success/Warning Colors

#### Screen-Specific Elements
Each screen has its own customizable elements:

**Dashboard**
- Background, Cards, Stats, Charts

**Projects**
- Background, Cards, Status Colors, Add Button

**Time Tracking**
- Timer Card, Start/Stop Buttons, Billable/Non-billable Colors

**Calendar/Planning**
- Headers, Weekday/Weekend Headers & Cells
- Current Day Highlight
- Team Member Column
- Event Colors

**Planning Tasks**
- Project Tasks
- Admin Tasks
- Marketing Tasks
- Out of Office
- Unavailable
- Time Off
- Deadlines & Milestones

**Clients, Events, Profile, Admin**
- Each with their own customizable elements

### Step 3: Activate Your Theme

Navigate to: **Profile → Manage Custom Themes**

1. View all your created color palettes
2. See a preview of each palette's colors
3. Click "Activate" on the palette you want to use
4. Your custom colors will be applied throughout the app!

## Features

### Custom Color Manager
**Location:** Profile → Manage Custom Themes → Create New Palette

**Features:**
- Add unlimited custom colors
- Name each color (e.g., "Sunset Orange", "Forest Green")
- Enter hex codes manually
- Mark one color as Primary ✓
- Mark one color as Secondary ✓
- Edit existing palettes
- Delete colors from your palette
- Validation ensures all colors have names and valid hex codes

### Element Color Mapper
**Location:** Automatically shown after creating/editing a palette

**Features:**
- Organized by sections (Navigation, Global, Dashboard, etc.)
- Expandable/collapsible sections
- Visual color preview for each element
- Dropdown to select from your custom colors
- Shows which colors are Primary/Secondary
- Smart defaults based on your Primary/Secondary selections

### Manage Custom Themes
**Location:** Profile → Manage Custom Themes

**Features:**
- View all your custom color palettes
- See color previews for each palette
- "Active" badge shows which theme is currently in use
- Activate/Deactivate themes instantly
- Edit colors in a palette
- Map elements for a palette
- Delete palettes you no longer want

## Technical Architecture

### New Files Created

#### Type Definitions
- `client/src/types/customColors.ts` - All TypeScript interfaces and types

#### Screens
- `client/src/screens/profile/CustomColorManagerScreen.tsx` - Create/edit color palettes
- `client/src/screens/profile/ElementColorMapperScreen.tsx` - Map colors to elements
- `client/src/screens/profile/ManageCustomThemesScreen.tsx` - Manage and activate themes

#### Contexts
- `client/src/contexts/CustomColorThemeContext.tsx` - Manages custom theme state

### Data Storage

All data is stored locally using AsyncStorage:

**@app_custom_color_palettes**
```json
{
  "palette_123": {
    "id": "palette_123",
    "name": "Ocean Breeze",
    "colors": [
      {
        "id": "color_1",
        "name": "Deep Ocean Blue",
        "hexCode": "#1E3A8A",
        "isPrimary": true,
        "isSecondary": false
      },
      ...
    ],
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
}
```

**@app_element_color_mapping**
```json
{
  "palette_123": {
    "navigation": {
      "tabBarBackground": "color_1",
      "tabBarActiveIcon": "color_2",
      ...
    },
    "global": { ... },
    "dashboard": { ... },
    ...
  }
}
```

**@app_active_custom_theme**
```
"palette_123"
```

### Integration

The CustomColorThemeProvider wraps the app in [App.tsx](client/App.tsx):

```tsx
<ThemeProvider>
  <AuthProvider>
    <CustomColorThemeProvider>
      <PlanningColorsProvider>
        <AppNavigator />
      </PlanningColorsProvider>
    </CustomColorThemeProvider>
  </AuthProvider>
</ThemeProvider>
```

### Navigation

New routes added to both AppNavigator and DesktopNavigator:
- `CustomColorManager` - Create/edit palettes
- `ElementColorMapper` - Map colors to elements
- `ManageCustomThemes` - Activate/manage themes

## Usage Example

### For Users

1. Go to Profile
2. Tap "Manage Custom Themes"
3. Tap "Create New Palette"
4. Add your favorite colors:
   - "Midnight Blue" - #191970 ✓ Primary
   - "Sunset Orange" - #FF4500 ✓ Secondary
   - "Cloud White" - #F8F8FF
   - "Charcoal" - #36454F
5. Save the palette
6. In the Element Mapper, assign colors to each element
7. Save the mapping
8. Back in Manage Custom Themes, tap "Activate"
9. Enjoy your personalized app!

### For Developers

To use custom colors in a component:

```tsx
import { useCustomColorTheme } from '../../contexts/CustomColorThemeContext';

const MyComponent = () => {
  const { getColorForElement, isUsingCustomTheme } = useCustomColorTheme();

  const backgroundColor = getColorForElement('global', 'background');
  const primaryButtonColor = getColorForElement('global', 'primaryButton');

  return (
    <View style={{ backgroundColor }}>
      <Button color={primaryButtonColor}>Click Me</Button>
    </View>
  );
};
```

The `getColorForElement` function will:
- Return the custom color if a custom theme is active
- Fall back to the default theme color if no custom theme is active
- Always return a valid color string

## Benefits

### Over Previous System

**Before:**
- Limited to predefined color palettes
- Only certain colors could be customized
- Global changes only (couldn't customize individual elements)

**Now:**
- Create unlimited custom color palettes
- Name your colors whatever you want
- Full control over every element in the app
- Activate/deactivate themes instantly
- Multiple themes for different moods or purposes

### User Flexibility

Users can create themes for:
- **Personal branding** - Match your company colors
- **Accessibility** - High contrast themes for better visibility
- **Mood-based** - Different themes for different times of day
- **Seasonal** - Spring colors, autumn colors, etc.
- **Team themes** - Each team member can have their own theme

## Future Enhancements

Potential improvements for the future:

1. **Color Picker Integration** - Visual color picker instead of just hex input
2. **Theme Sharing** - Export/import themes to share with team members
3. **Theme Presets** - Pre-built theme templates to get started quickly
4. **Dark Mode Support** - Automatic color adjustments for dark mode
5. **Color Harmony Tools** - Suggest complementary colors
6. **Preview Mode** - See how your theme looks before activating
7. **Backend Sync** - Save themes to the server for cross-device sync
8. **Team-Wide Themes** - Admins can set default themes for the organization

## Notes

- All custom themes are stored locally (AsyncStorage)
- Custom themes are user-specific (not synced across devices yet)
- The system gracefully falls back to default colors if custom theme data is missing
- Custom themes work alongside the existing theme system (not replacing it)
- Primary and Secondary colors are just labels - they don't have special behavior (yet)
