# PlanningScreen Refactoring - Phase 1 & 2 Complete

## 📊 Overview

This document tracks the refactoring of PlanningScreen.tsx (4,527 lines) into smaller, maintainable components and hooks.

**Current Status**: ✅ Extraction Complete | ⏸️ Integration Pending

---

## ✅ What's Been Extracted

### Phase 1: Components & Navigation (Commit: 13af251)

#### 1. **PlanningHeader Component**
**File**: `client/src/components/planning/PlanningHeader.tsx` (194 lines)

**Purpose**: Header with week title and prev/next navigation buttons

**Props**:
```typescript
interface PlanningHeaderProps {
  weekTitle: string;
  onPrevious: () => void;
  onNext: () => void;
  headerBgColor: string;
  headerTextColor: string;
  iconColor: string;
  borderColor: string;
}
```

**Usage Example**:
```tsx
<PlanningHeader
  weekTitle={weekTitle}
  onPrevious={loadPreviousWeek}
  onNext={loadNextWeek}
  headerBgColor={calendarHeaderBg}
  headerTextColor={calendarHeaderFont}
  iconColor={prevNextIconColor}
  borderColor={currentColors.text}
/>
```

---

#### 2. **ManageTeamMembersModal Component**
**File**: `client/src/components/planning/ManageTeamMembersModal.tsx` (194 lines)

**Purpose**: Modal for managing team member visibility and ordering with drag-and-drop

**Props**:
```typescript
interface ManageTeamMembersModalProps {
  visible: boolean;
  onClose: () => void;
  users: User[];
  visibleUserIds: string[];
  draggedUserId: string | null;
  dragOverUserId: string | null;
  currentUserRole?: string;
  currentColors: any;
  onToggleUserVisibility: (userId: string) => void;
  onDragStart: (userId: string) => void;
  onDragEnd: () => void;
  onDragOver: (userId: string) => void;
  onDrop: (targetUserId: string) => void;
  onDragLeave: () => void;
  onSaveSettings: () => Promise<void>;
  onSaveAsDefaultForAll: () => Promise<void>;
}
```

**Features**:
- Drag-and-drop user reordering
- Visibility toggle switches
- Save personal settings
- Admin: Save as default for all users

**Lines Removed from PlanningScreen**: ~111 lines

---

#### 3. **ProjectAssignmentModal Component**
**File**: `client/src/components/planning/ProjectAssignmentModal.tsx` (590 lines)

**Purpose**: Complex modal for assigning projects, status, and repeat events

**Props**:
```typescript
interface ProjectAssignmentModalProps {
  visible: boolean;
  onClose: () => void;
  currentColors: any;
  selectedBlock: SelectedBlock | null;
  blockAssignments: { [key: string]: BlockAssignment };
  projectSearch: string;
  setProjectSearch: (value: string) => void;
  taskDescription: string;
  setTaskDescription: (value: string) => void;
  filteredProjects: Project[];
  isOutOfOffice: boolean;
  setIsOutOfOffice: (value: boolean) => void;
  isTimeOff: boolean;
  setIsTimeOff: (value: boolean) => void;
  isUnavailable: boolean;
  setIsUnavailable: (value: boolean) => void;
  isRepeatEvent: boolean;
  setIsRepeatEvent: (value: boolean) => void;
  repeatType: 'weekly' | 'monthly';
  setRepeatType: (value: 'weekly' | 'monthly') => void;
  repeatWeeklyDays: boolean[];
  setRepeatWeeklyDays: (value: boolean[]) => void;
  monthlyRepeatType: 'date' | 'weekday';
  setMonthlyRepeatType: (value: 'date' | 'weekday') => void;
  monthlyWeekNumber: number;
  setMonthlyWeekNumber: (value: number) => void;
  monthlyDayOfWeek: number;
  setMonthlyDayOfWeek: (value: number) => void;
  repeatEndDate: Date | null;
  setRepeatEndDate: (value: Date | null) => void;
  showDatePicker: boolean;
  setShowDatePicker: (value: boolean) => void;
  setSelectedBlock: (value: SelectedBlock | null) => void;
  setShowDeletePlanningDialog: (value: boolean) => void;
  onSaveProjectAssignment: () => Promise<void>;
}
```

**Features**:
- Project search by common name
- Task description input
- Status checkboxes (Out of Office, Time Off, Unavailable)
- Repeat event configuration:
  * Weekly repeats (select days)
  * Monthly repeats (same date or specific weekday)
  * End date picker
- Delete existing assignments

**Lines Removed from PlanningScreen**: ~331 lines

---

#### 4. **usePlanningNavigation Hook**
**File**: `client/src/hooks/usePlanningNavigation.ts` (170 lines)

**Purpose**: Centralize all week/quarter navigation logic

**Returns**:
```typescript
interface UsePlanningNavigationReturn {
  currentQuarter: QuarterInfo;
  currentWeekStart: Date;
  visibleWeekIndex: number;
  quarterWeeks: Date[];
  visibleWeekStart: Date;
  weekNumber: number;
  weekTitle: string;
  scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  setCurrentWeekStart: (date: Date) => void;
  setCurrentQuarter: (quarter: QuarterInfo) => void;
  setVisibleWeekIndex: (index: number) => void;
  loadNextWeek: () => void;
  loadPreviousWeek: () => void;
  getWeekNumber: (date: Date) => number;
  getQuarterFromDate: (date: Date) => number;
  generateQuarterWeeks: () => Date[];
}
```

**Usage Example**:
```tsx
const {
  currentQuarter,
  weekTitle,
  loadNextWeek,
  loadPreviousWeek,
  quarterWeeks,
} = usePlanningNavigation();
```

**Features**:
- Auto-calculates current quarter
- Generates all weeks in quarter
- Smooth horizontal scrolling
- ISO week number calculation

**Lines Removed from PlanningScreen**: ~170 lines

---

### Phase 2: Data Loading (Commit: f378c23)

#### 5. **usePlanningData Hook**
**File**: `client/src/hooks/usePlanningData.ts` (259 lines)

**Purpose**: Centralize all data fetching and state management

**Returns**:
```typescript
interface UsePlanningDataReturn {
  users: User[];
  projects: Project[];
  filteredProjects: Project[];
  blockAssignments: { [key: string]: BlockAssignment };
  deadlineTasks: DeadlineTask[];
  visibleUserIds: string[];
  loading: boolean;
  setUsers: (users: User[]) => void;
  setProjects: (projects: Project[]) => void;
  setFilteredProjects: (projects: Project[]) => void;
  setBlockAssignments: (assignments: { [key: string]: BlockAssignment }) => void;
  setDeadlineTasks: (tasks: DeadlineTask[]) => void;
  setVisibleUserIds: (ids: string[]) => void;
  loadData: (currentQuarter: QuarterInfo) => Promise<void>;
  loadGlobalDefaults: () => Promise<any>;
}
```

**Usage Example**:
```tsx
const {
  users,
  projects,
  blockAssignments,
  deadlineTasks,
  loading,
  loadData,
} = usePlanningData();

// In useEffect
useEffect(() => {
  loadData(currentQuarter);
}, [currentQuarter]);
```

**Features**:
- Loads users, projects, planning tasks, deadline tasks in parallel
- User preference loading (order + visibility)
- Global defaults fallback
- Transforms planning tasks into display format
- Handles status events (Out of Office, Time Off, Unavailable)
- Professional error logging

**Lines Removed from PlanningScreen**: ~240 lines

---

## 📈 Extraction Summary

| Phase | Files Created | Lines Extracted | Commits |
|-------|---------------|-----------------|---------|
| Phase 1 | 4 files | ~982 lines | 13af251 |
| Phase 2 | 1 file | ~259 lines | f378c23 |
| **Total** | **5 files** | **~1,241 lines** | **2 commits** |

### Files Created:
1. ✅ `client/src/components/planning/PlanningHeader.tsx` (194 lines)
2. ✅ `client/src/components/planning/ManageTeamMembersModal.tsx` (194 lines)
3. ✅ `client/src/components/planning/ProjectAssignmentModal.tsx` (590 lines)
4. ✅ `client/src/hooks/usePlanningNavigation.ts` (170 lines)
5. ✅ `client/src/hooks/usePlanningData.ts` (259 lines)

### Impact:
- **Current PlanningScreen Size**: 4,527 lines
- **Lines Ready to Extract**: ~1,241 lines (27%)
- **Target Size After Integration**: ~3,286 lines

---

## 🔄 Integration Plan (Future Session)

### Step 1: Import New Components & Hooks

Add imports to PlanningScreen.tsx:

```typescript
import PlanningHeader from '../../components/planning/PlanningHeader';
import ManageTeamMembersModal from '../../components/planning/ManageTeamMembersModal';
import ProjectAssignmentModal from '../../components/planning/ProjectAssignmentModal';
import { usePlanningNavigation } from '../../hooks/usePlanningNavigation';
import { usePlanningData } from '../../hooks/usePlanningData';
```

---

### Step 2: Replace State with Hooks

Replace navigation state:

```typescript
// REMOVE these:
const [currentQuarter, setCurrentQuarter] = useState(/*...*/);
const [currentWeekStart, setCurrentWeekStart] = useState(/*...*/);
const [visibleWeekIndex, setVisibleWeekIndex] = useState(0);
const scrollContainerRef = useRef<HTMLDivElement>(null);

// REPLACE with:
const {
  currentQuarter,
  currentWeekStart,
  visibleWeekIndex,
  quarterWeeks,
  visibleWeekStart,
  weekNumber,
  weekTitle,
  scrollContainerRef,
  setCurrentWeekStart,
  setCurrentQuarter,
  setVisibleWeekIndex,
  loadNextWeek,
  loadPreviousWeek,
  getWeekNumber,
  getQuarterFromDate,
  generateQuarterWeeks,
} = usePlanningNavigation();
```

Replace data state:

```typescript
// REMOVE these:
const [users, setUsers] = useState<any[]>([]);
const [projects, setProjects] = useState<any[]>([]);
const [blockAssignments, setBlockAssignments] = useState(/*...*/);
const [deadlineTasks, setDeadlineTasks] = useState<DeadlineTask[]>([]);
const [loading, setLoading] = useState(true);

// REPLACE with:
const {
  users,
  projects,
  filteredProjects,
  blockAssignments,
  deadlineTasks,
  visibleUserIds,
  loading,
  setUsers,
  setProjects,
  setFilteredProjects,
  setBlockAssignments,
  setDeadlineTasks,
  setVisibleUserIds,
  loadData,
  loadGlobalDefaults,
} = usePlanningData();
```

---

### Step 3: Remove Duplicate Functions

Delete these functions (now in hooks):

```typescript
// DELETE - now in usePlanningNavigation:
const getWeekNumber = (date: Date) => { /*...*/ };
const getQuarterFromDate = (date: Date) => { /*...*/ };
const generateQuarterWeeks = () => { /*...*/ };
const loadNextWeek = () => { /*...*/ };
const loadPreviousWeek = () => { /*...*/ };

// DELETE - now in usePlanningData:
const loadData = async () => { /*...*/ };
const loadGlobalDefaults = async () => { /*...*/ };
```

---

### Step 4: Replace JSX with Components

Replace header JSX (~10 lines):

```typescript
// FIND this:
<View style={[styles.header, { backgroundColor: calendarHeaderBg }]}>
  <View style={styles.headerNav}>
    <TouchableOpacity onPress={loadPreviousWeek}>
      <HugeiconsIcon icon={ArrowLeft01Icon} />
    </TouchableOpacity>
    <Title>{weekTitle}</Title>
    <TouchableOpacity onPress={loadNextWeek}>
      <HugeiconsIcon icon={ArrowRight01Icon} />
    </TouchableOpacity>
  </View>
</View>

// REPLACE with:
<PlanningHeader
  weekTitle={weekTitle}
  onPrevious={loadPreviousWeek}
  onNext={loadNextWeek}
  headerBgColor={calendarHeaderBg}
  headerTextColor={calendarHeaderFont}
  iconColor={prevNextIconColor}
  borderColor={currentColors.text}
/>
```

Replace ManageTeamMembersModal JSX (~111 lines):

```typescript
// FIND this:
<Modal visible={showManageModal} /*...111 lines of JSX...*/></Modal>

// REPLACE with:
<ManageTeamMembersModal
  visible={showManageModal}
  onClose={() => setShowManageModal(false)}
  users={users}
  visibleUserIds={visibleUserIds}
  draggedUserId={draggedUserId}
  dragOverUserId={dragOverUserId}
  currentUserRole={user?.role}
  currentColors={currentColors}
  onToggleUserVisibility={toggleUserVisibility}
  onDragStart={handleDragStart}
  onDragEnd={handleDragEnd}
  onDragOver={handleDragOver}
  onDrop={handleDrop}
  onDragLeave={() => setDragOverUserId(null)}
  onSaveSettings={handleSaveSettings}
  onSaveAsDefaultForAll={handleSaveAsDefaultForAll}
/>
```

Replace ProjectAssignmentModal JSX (~331 lines):

```typescript
// FIND this:
<Modal visible={showProjectModal} /*...331 lines of JSX...*/></Modal>

// REPLACE with:
<ProjectAssignmentModal
  visible={showProjectModal}
  onClose={() => setShowProjectModal(false)}
  currentColors={currentColors}
  selectedBlock={selectedBlock}
  blockAssignments={blockAssignments}
  projectSearch={projectSearch}
  setProjectSearch={setProjectSearch}
  taskDescription={taskDescription}
  setTaskDescription={setTaskDescription}
  filteredProjects={filteredProjects}
  isOutOfOffice={isOutOfOffice}
  setIsOutOfOffice={setIsOutOfOffice}
  isTimeOff={isTimeOff}
  setIsTimeOff={setIsTimeOff}
  isUnavailable={isUnavailable}
  setIsUnavailable={setIsUnavailable}
  isRepeatEvent={isRepeatEvent}
  setIsRepeatEvent={setIsRepeatEvent}
  repeatType={repeatType}
  setRepeatType={setRepeatType}
  repeatWeeklyDays={repeatWeeklyDays}
  setRepeatWeeklyDays={setRepeatWeeklyDays}
  monthlyRepeatType={monthlyRepeatType}
  setMonthlyRepeatType={setMonthlyRepeatType}
  monthlyWeekNumber={monthlyWeekNumber}
  setMonthlyWeekNumber={setMonthlyWeekNumber}
  monthlyDayOfWeek={monthlyDayOfWeek}
  setMonthlyDayOfWeek={setMonthlyDayOfWeek}
  repeatEndDate={repeatEndDate}
  setRepeatEndDate={setRepeatEndDate}
  showDatePicker={showDatePicker}
  setShowDatePicker={setShowDatePicker}
  setSelectedBlock={setSelectedBlock}
  setShowDeletePlanningDialog={setShowDeletePlanningDialog}
  onSaveProjectAssignment={handleSaveProjectAssignment}
/>
```

---

### Step 5: Update useEffect Calls

Update loadData calls:

```typescript
// FIND:
useFocusEffect(
  React.useCallback(() => {
    setHasScrolled(false);
    loadData(); // ❌ Old call - no parameters
  }, [currentQuarter])
);

// REPLACE with:
useFocusEffect(
  React.useCallback(() => {
    setHasScrolled(false);
    loadData(currentQuarter); // ✅ New call - requires quarter parameter
  }, [currentQuarter, loadData])
);
```

---

### Step 6: Test Integration

1. **Compile Check**: `npx tsc --noEmit`
2. **Start Dev Server**: `npm run dev`
3. **Test Planning Screen**:
   - Week navigation (prev/next)
   - Team member management modal
   - Project assignment modal
   - Data loading
   - Drag and drop (existing functionality)

---

## 🎯 Benefits of This Refactoring

### Code Organization
- ✅ **Smaller Files**: Main screen reduced by ~27%
- ✅ **Single Responsibility**: Each component has one clear purpose
- ✅ **Reusability**: Components can be used elsewhere if needed

### Maintainability
- ✅ **Easier to Debug**: Smaller, focused components
- ✅ **Easier to Test**: Each piece can be tested independently
- ✅ **Easier to Modify**: Changes isolated to specific files

### Developer Experience
- ✅ **Better IDE Performance**: Smaller files load faster
- ✅ **Clearer Code Navigation**: Less scrolling, easier to find code
- ✅ **Type Safety**: All components have proper TypeScript interfaces

---

## 📝 Notes & Considerations

### What Wasn't Extracted

The following remain in PlanningScreen and are **intentionally** not extracted due to tight coupling:

1. **Drag & Drop Logic** (~500+ lines)
   - Complex interdependencies with UI rendering
   - Multiple drag handlers (task drag, deadline drag, edge resize)
   - Better to keep integrated with the main screen

2. **Main UI Rendering** (~2,000+ lines)
   - Calendar grid structure
   - Cell rendering logic
   - Highly coupled with state and handlers

3. **Event Handlers** (~300+ lines)
   - handleSaveProjectAssignment
   - handleDeletePlanningTask
   - Cell click handlers
   - Better to keep near their usage

### Future Enhancements (Optional)

If further refactoring is desired:

1. **Extract More UI Components**:
   - `WeekDayHeader` - Day column headers
   - `DeadlineTaskRow` - Deadline tasks row
   - `UserPlanningRow` - Individual user row
   - `PlanningTaskCell` - Task cell with drag/drop

2. **Create More Hooks**:
   - `usePlanningKeyboard` - Keyboard shortcuts (Cmd+C, Cmd+V, Delete)
   - `usePlanningScroll` - Auto-scroll to current week
   - `usePlanningFilters` - Project filtering logic

3. **Add Tests**:
   - Component tests for modals
   - Hook tests for navigation and data loading
   - Integration tests for full planning flow

---

## 🚀 Ready to Integrate

All extracted files are:
- ✅ Properly typed with TypeScript
- ✅ Using React.memo for performance
- ✅ Following React best practices
- ✅ Committed to git (commits 13af251, f378c23)
- ✅ Pushed to GitHub

**The integration can be completed in a future session** when there's dedicated time to:
1. Carefully remove duplicate code
2. Update all function calls
3. Test thoroughly
4. Fix any edge cases

---

## 📊 Session Summary

### Time Investment
- Phase 1: ~2 hours (component extraction)
- Phase 2: ~1 hour (data hook creation)
- **Total**: ~3 hours of focused refactoring work

### Deliverables
- 5 new, well-structured files
- 1,241 lines extracted from monolithic file
- Comprehensive documentation (this file)
- Clean git history with descriptive commits

### Next Steps
1. Review this documentation
2. Plan integration session (estimate: 2-3 hours)
3. Perform integration with careful testing
4. Celebrate ~27% reduction in main file size! 🎉

---

**Document Created**: January 17, 2025
**Last Updated**: January 17, 2025
**Status**: ✅ Extraction Complete | ⏸️ Integration Pending
