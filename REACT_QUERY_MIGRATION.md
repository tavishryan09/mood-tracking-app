# React Query Migration Guide

## Overview

This guide explains how to migrate from the current `usePlanningData` hook to the new React Query-based hooks for better performance and caching.

## Benefits of React Query

### 1. **Automatic Caching**
- Users data: 5 minutes
- Projects data: 5 minutes
- Planning tasks: 2 minutes
- Preferences: 10 minutes

### 2. **Request Deduplication**
Multiple components can request the same data without triggering duplicate API calls.

### 3. **Automatic Refetching**
- Refetches on window focus for fresh data
- Configurable refetch intervals
- Smart background updates

### 4. **Optimistic Updates**
UI updates immediately while waiting for server confirmation, then rolls back on error.

### 5. **Performance Improvements**
- Estimated **60-70% reduction** in API calls
- Faster perceived performance with cached data
- Reduced server load

## Migration Steps

### Current Implementation (usePlanningData)

```typescript
import { usePlanningData } from '../hooks/usePlanningData';

const {
  users,
  projects,
  blockAssignments,
  deadlineTasks,
  visibleUserIds,
  loading,
  loadData,
} = usePlanningData();

// Manual data loading
useEffect(() => {
  loadData(currentQuarter);
}, [currentQuarter]);
```

### New Implementation (usePlanningDataQuery)

```typescript
import { usePlanningDataQuery } from '../hooks/usePlanningDataQuery';

const {
  users,
  projects,
  blockAssignments,
  deadlineTasks,
  visibleUserIds,
  isLoading,
  refetchAll, // Optional manual refetch
} = usePlanningDataQuery(currentQuarter);

// No manual loading needed - React Query handles it automatically!
```

## Using Mutations (Optimistic Updates)

### Create Task

```typescript
import { useCreatePlanningTask } from '../hooks/usePlanningMutations';

const createTaskMutation = useCreatePlanningTask(currentQuarter);

// Create task with optimistic update
const handleCreateTask = async (taskData) => {
  try {
    await createTaskMutation.mutateAsync({
      userId: 'user-id',
      date: '2025-11-18',
      blockIndex: 0,
      projectId: 'project-id',
      task: 'Task description',
      span: 1,
    });
    // UI already updated optimistically!
  } catch (error) {
    // UI automatically rolled back on error
    console.error('Failed to create task:', error);
  }
};
```

### Update Task

```typescript
import { useUpdatePlanningTask } from '../hooks/usePlanningMutations';

const updateTaskMutation = useUpdatePlanningTask(currentQuarter);

const handleUpdateTask = async (taskId, changes) => {
  await updateTaskMutation.mutateAsync({
    id: taskId,
    ...changes,
  });
};
```

### Delete Task

```typescript
import { useDeletePlanningTask } from '../hooks/usePlanningMutations';

const deleteTaskMutation = useDeletePlanningTask(currentQuarter);

const handleDeleteTask = async (taskId) => {
  await deleteTaskMutation.mutateAsync(taskId);
};
```

### Batch Updates (Copy/Paste, Drag)

```typescript
import { useBatchUpdatePlanningTasks } from '../hooks/usePlanningMutations';

const batchUpdateMutation = useBatchUpdatePlanningTasks(currentQuarter);

const handleBatchUpdate = async (updates) => {
  await batchUpdateMutation.mutateAsync([
    { id: 'task-1', span: 2 },
    { id: 'task-2', projectId: 'new-project' },
    { id: 'task-3', task: 'Updated description' },
  ]);
};
```

## Performance Comparison

### Before (usePlanningData)

```
Navigation to Planning Screen:
1. Fetch users (200ms)
2. Fetch projects (150ms)
3. Fetch planning tasks (300ms)
4. Fetch deadline tasks (250ms)
5. Fetch preferences (2 × 100ms)

Total: ~1100ms
```

### After (usePlanningDataQuery)

```
First Visit:
- Same as before (~1100ms)

Subsequent Visits (within cache time):
- Instant (0ms) - served from cache!

After Cache Expires:
- Background refetch while showing cached data
- Perceived as instant to user
```

## Advanced Features

### Manual Refetch

```typescript
const { refetchAll, planningTasksQuery } = usePlanningDataQuery(currentQuarter);

// Refetch all data
refetchAll();

// Refetch specific query
planningTasksQuery.refetch();
```

### Error Handling

```typescript
const { hasError, usersQuery, projectsQuery } = usePlanningDataQuery(currentQuarter);

if (hasError) {
  // Check specific query errors
  if (usersQuery.isError) {
    console.error('Failed to load users:', usersQuery.error);
  }
  if (projectsQuery.isError) {
    console.error('Failed to load projects:', projectsQuery.error);
  }
}
```

### Loading States

```typescript
const { isLoading, usersQuery, planningTasksQuery } = usePlanningDataQuery(currentQuarter);

// Global loading state
if (isLoading) {
  return <ActivityIndicator />;
}

// Granular loading states
if (planningTasksQuery.isLoading) {
  return <Text>Loading tasks...</Text>;
}
```

## Rollout Strategy

### Phase 1: Parallel Running (Recommended)
Keep both implementations running side-by-side:

```typescript
// Old implementation (fallback)
const oldData = usePlanningData();

// New implementation (test)
const newData = usePlanningDataQuery(currentQuarter);

// Use feature flag to switch between them
const data = useFeatureFlag('react-query-planning') ? newData : oldData;
```

### Phase 2: Full Migration
Once confident, remove old implementation and use only React Query hooks.

### Phase 3: Cleanup
Remove `usePlanningData.ts` and migrate all screens to React Query.

## Files Created

1. **`hooks/usePlanningQueries.ts`** - Individual query hooks
2. **`hooks/usePlanningDataQuery.ts`** - Combined data hook
3. **`hooks/usePlanningMutations.ts`** - Mutation hooks with optimistic updates

## Next Steps

1. Test the new hooks in development
2. Gradually migrate PlanningScreen to use `usePlanningDataQuery`
3. Integrate mutation hooks for create/update/delete operations
4. Monitor performance improvements
5. Migrate other screens (Projects, Dashboard, etc.)

## Monitoring

Track these metrics to verify improvements:

- API call count (should decrease by 60-70%)
- Time to interactive (should improve)
- User-perceived performance (instant on cached visits)
- Error rates (should remain same or improve)

## Support

For questions or issues with the migration, refer to:
- [React Query Docs](https://tanstack.com/query/latest/docs/react/overview)
- This migration guide
- Performance audit document
