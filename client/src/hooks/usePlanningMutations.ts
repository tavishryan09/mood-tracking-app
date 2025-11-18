import { useMutation, useQueryClient } from '@tanstack/react-query';
import { planningTasksAPI } from '../services/api';
import { transformPlanningTasks } from './usePlanningQueries';

interface QuarterInfo {
  year: number;
  quarter: number;
}

interface CreateTaskInput {
  userId: string;
  date: string;
  blockIndex: number;
  projectId: string;
  task?: string;
  span?: number;
}

interface UpdateTaskInput {
  id: string;
  projectId?: string;
  task?: string;
  span?: number;
}

/**
 * Mutation hook for creating a planning task with optimistic updates
 */
export const useCreatePlanningTask = (currentQuarter: QuarterInfo) => {
  const queryClient = useQueryClient();
  const { year, quarter } = currentQuarter;

  return useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      const response = await planningTasksAPI.create(input);
      return response.data;
    },

    // Optimistic update - immediately update UI before server responds
    onMutate: async (newTask) => {
      // Cancel outgoing refetches (so they don't overwrite optimistic update)
      await queryClient.cancelQueries({ queryKey: ['planningTasks', year, quarter] });

      // Snapshot previous value
      const previousTasks = queryClient.getQueryData(['planningTasks', year, quarter]);

      // Optimistically update cache
      queryClient.setQueryData(['planningTasks', year, quarter], (old: any[]) => {
        if (!old) return [newTask];
        return [...old, newTask];
      });

      // Return context with snapshot
      return { previousTasks };
    },

    // On error, rollback to previous value
    onError: (err, newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planningTasks', year, quarter], context.previousTasks);
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planningTasks', year, quarter] });
    },
  });
};

/**
 * Mutation hook for updating a planning task with optimistic updates
 */
export const useUpdatePlanningTask = (currentQuarter: QuarterInfo) => {
  const queryClient = useQueryClient();
  const { year, quarter } = currentQuarter;

  return useMutation({
    mutationFn: async (input: UpdateTaskInput) => {
      const response = await planningTasksAPI.update(input.id, input);
      return response.data;
    },

    onMutate: async (updatedTask) => {
      await queryClient.cancelQueries({ queryKey: ['planningTasks', year, quarter] });
      const previousTasks = queryClient.getQueryData(['planningTasks', year, quarter]);

      // Optimistically update
      queryClient.setQueryData(['planningTasks', year, quarter], (old: any[]) => {
        if (!old) return [];
        return old.map((task) => (task.id === updatedTask.id ? { ...task, ...updatedTask } : task));
      });

      return { previousTasks };
    },

    onError: (err, updatedTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planningTasks', year, quarter], context.previousTasks);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planningTasks', year, quarter] });
    },
  });
};

/**
 * Mutation hook for deleting a planning task with optimistic updates
 */
export const useDeletePlanningTask = (currentQuarter: QuarterInfo) => {
  const queryClient = useQueryClient();
  const { year, quarter } = currentQuarter;

  return useMutation({
    mutationFn: async (taskId: string) => {
      const response = await planningTasksAPI.delete(taskId);
      return response.data;
    },

    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['planningTasks', year, quarter] });
      const previousTasks = queryClient.getQueryData(['planningTasks', year, quarter]);

      // Optimistically remove from cache
      queryClient.setQueryData(['planningTasks', year, quarter], (old: any[]) => {
        if (!old) return [];
        return old.filter((task) => task.id !== taskId);
      });

      return { previousTasks };
    },

    onError: (err, taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planningTasks', year, quarter], context.previousTasks);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planningTasks', year, quarter] });
    },
  });
};

/**
 * Mutation hook for batch updating tasks (e.g., copy/paste, drag operations)
 */
export const useBatchUpdatePlanningTasks = (currentQuarter: QuarterInfo) => {
  const queryClient = useQueryClient();
  const { year, quarter } = currentQuarter;

  return useMutation({
    mutationFn: async (updates: UpdateTaskInput[]) => {
      // Execute all updates in parallel
      const responses = await Promise.all(
        updates.map((update) => planningTasksAPI.update(update.id, update))
      );
      return responses.map((r) => r.data);
    },

    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['planningTasks', year, quarter] });
      const previousTasks = queryClient.getQueryData(['planningTasks', year, quarter]);

      // Optimistically apply all updates
      queryClient.setQueryData(['planningTasks', year, quarter], (old: any[]) => {
        if (!old) return [];

        let updatedTasks = [...old];
        updates.forEach((update) => {
          updatedTasks = updatedTasks.map((task) =>
            task.id === update.id ? { ...task, ...update } : task
          );
        });

        return updatedTasks;
      });

      return { previousTasks };
    },

    onError: (err, updates, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['planningTasks', year, quarter], context.previousTasks);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['planningTasks', year, quarter] });
    },
  });
};
