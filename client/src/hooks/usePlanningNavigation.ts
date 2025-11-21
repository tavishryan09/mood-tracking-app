import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DAY_CELL_WIDTH = 180; // Must match PlanningScreen.tsx DAY_CELL_WIDTH

interface QuarterInfo {
  year: number;
  quarter: number;
}

interface UsePlanningNavigationReturn {
  currentQuarter: QuarterInfo;
  currentWeekStart: Date;
  visibleWeekIndex: number;
  quarterWeeks: Date[];
  visibleWeekStart: Date;
  weekNumber: number;
  weekTitle: string;
  scrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
  showQuarterPrompt: boolean;
  nextQuarterInfo: QuarterInfo | null;
  previousQuarterInfo: QuarterInfo | null;
  loadedQuarters: QuarterInfo[];
  setCurrentWeekStart: (date: Date) => void;
  setCurrentQuarter: (quarter: QuarterInfo) => void;
  setVisibleWeekIndex: (index: number) => void;
  loadNextWeek: () => void;
  loadPreviousWeek: () => void;
  confirmLoadNextQuarter: () => void;
  confirmLoadPreviousQuarter: () => void;
  cancelLoadNextQuarter: () => void;
  getWeekNumber: (date: Date) => number;
  getQuarterFromDate: (date: Date) => number;
  generateQuarterWeeks: () => Date[];
  updatePersistedQuarters: (planningTasks: any[], deadlineTasks: any[]) => void;
  isDateInNextUnloadedQuarter: (date: Date) => boolean;
  autoAppendNextQuarterIfNeeded: (date: Date) => void;
}

export const usePlanningNavigation = (): UsePlanningNavigationReturn => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize current quarter
  const [currentQuarter, setCurrentQuarter] = useState<QuarterInfo>(() => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      quarter: Math.floor(now.getMonth() / 3) + 1,
    };
  });

  // Track all loaded quarters (initially just the current quarter)
  const [loadedQuarters, setLoadedQuarters] = useState<QuarterInfo[]>(() => {
    const now = new Date();
    return [{
      year: now.getFullYear(),
      quarter: Math.floor(now.getMonth() / 3) + 1,
    }];
  });

  // Helper to check if a quarter has ended
  const isQuarterEnded = useCallback((quarter: QuarterInfo): boolean => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

    // Quarter has ended if it's in a previous year, or same year but earlier quarter
    return quarter.year < currentYear || (quarter.year === currentYear && quarter.quarter < currentQuarter);
  }, []);

  // Load persisted quarters on mount, filtering out ended quarters
  useEffect(() => {
    const loadPersistedQuarters = async () => {
      try {
        const stored = await AsyncStorage.getItem('planning_loaded_quarters');
        if (stored) {
          const parsedQuarters = JSON.parse(stored) as QuarterInfo[];
          // Filter out quarters that have ended, only keep current and future quarters
          const activeQuarters = parsedQuarters.filter(q => !isQuarterEnded(q));

          if (activeQuarters.length > 0) {
            setLoadedQuarters(activeQuarters);
          }
        }
      } catch (error) {
        console.error('[usePlanningNavigation] Error loading persisted quarters:', error);
      }
    };

    loadPersistedQuarters();
  }, [isQuarterEnded]);

  // Helper to check if a quarter has any planning tasks or deadline tasks
  const quarterHasTasks = useCallback((quarter: QuarterInfo, planningTasks: any[], deadlineTasks: any[]): boolean => {
    const { year, quarter: q } = quarter;
    const startMonth = (q - 1) * 3;
    const quarterStart = new Date(year, startMonth, 1);
    quarterStart.setHours(0, 0, 0, 0);
    const quarterEnd = new Date(year, startMonth + 3, 0);
    quarterEnd.setHours(23, 59, 59, 999);

    console.log(`[quarterHasTasks] Checking Q${q} ${year}:`, quarterStart.toISOString(), 'to', quarterEnd.toISOString());

    // Check if there are any planning tasks in this quarter
    const hasPlanningTasks = planningTasks.some(task => {
      const taskDate = new Date(task.date);
      const isInRange = taskDate >= quarterStart && taskDate <= quarterEnd;
      if (isInRange) {
        console.log(`[quarterHasTasks] Found planning task in Q${q} ${year}:`, task.date);
      }
      return isInRange;
    });

    // Check if there are any deadline tasks in this quarter
    const hasDeadlineTasks = deadlineTasks.some(task => {
      const taskDate = new Date(task.date);
      const isInRange = taskDate >= quarterStart && taskDate <= quarterEnd;
      if (isInRange) {
        console.log(`[quarterHasTasks] Found deadline task in Q${q} ${year}:`, task.date);
      }
      return isInRange;
    });

    console.log(`[quarterHasTasks] Q${q} ${year} has tasks:`, hasPlanningTasks || hasDeadlineTasks);
    return hasPlanningTasks || hasDeadlineTasks;
  }, []);

  // Function to update persisted quarters based on planning tasks and deadline tasks
  // This only updates AsyncStorage, NOT the loadedQuarters state (which is managed separately)
  const updatePersistedQuarters = useCallback(async (planningTasks: any[], deadlineTasks: any[]) => {
    try {
      // Get current loaded quarters - don't modify state, just read it
      setLoadedQuarters(currentLoadedQuarters => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
        const currentQuarterInfo = { year: currentYear, quarter: currentQuarter };

        // Start with current quarter (always include in persistence)
        const quartersToSave = [currentQuarterInfo];

        // Add future quarters that have tasks (only for persistence)
        currentLoadedQuarters.forEach(q => {
          // Skip if it's the current quarter (already added)
          if (q.year === currentQuarterInfo.year && q.quarter === currentQuarterInfo.quarter) {
            return;
          }

          // Skip ended quarters
          if (isQuarterEnded(q)) {
            return;
          }

          // For future quarters, only persist if they have tasks
          const isFutureQuarter = q.year > currentYear || (q.year === currentYear && q.quarter > currentQuarter);
          if (isFutureQuarter && quarterHasTasks(q, planningTasks, deadlineTasks)) {
            quartersToSave.push(q);
          }
        });

        // Update AsyncStorage only - don't change loadedQuarters state
        AsyncStorage.setItem('planning_loaded_quarters', JSON.stringify(quartersToSave)).catch(error => {
          console.error('[usePlanningNavigation] Error updating persisted quarters:', error);
        });

        // Return unchanged - we're just using this to read the current value
        return currentLoadedQuarters;
      });
    } catch (error) {
      console.error('[usePlanningNavigation] Error updating persisted quarters:', error);
    }
  }, [isQuarterEnded, quarterHasTasks]);

  // Initialize current week start (Monday)
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    // Monday-based week: Monday = 0, Sunday = 6
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - daysFromMonday);
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [visibleWeekIndex, setVisibleWeekIndex] = useState(0);
  const [showQuarterPrompt, setShowQuarterPrompt] = useState(false);
  const [nextQuarterInfo, setNextQuarterInfo] = useState<QuarterInfo | null>(null);
  const [previousQuarterInfo, setPreviousQuarterInfo] = useState<QuarterInfo | null>(null);

  // Get week number (ISO week number)
  const getWeekNumber = useCallback((date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }, []);

  // Get quarter from date
  const getQuarterFromDate = useCallback((date: Date): number => {
    return Math.floor(date.getMonth() / 3) + 1;
  }, []);

  // Generate weeks for all loaded quarters
  const generateQuarterWeeks = useCallback((): Date[] => {
    const allWeeks: Date[] = [];
    const seenWeekStarts = new Set<string>();

    // Generate weeks for each loaded quarter
    loadedQuarters.forEach(({ year, quarter }) => {
      const startMonth = (quarter - 1) * 3;

      // Find the first Monday of the quarter (or before if quarter doesn't start on Monday)
      const quarterStart = new Date(year, startMonth, 1);
      const firstMonday = new Date(quarterStart);
      const dayOfWeek = quarterStart.getDay();
      // Monday-based week: if Sunday (0), go back 6 days; otherwise go back (dayOfWeek - 1) days
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      firstMonday.setDate(quarterStart.getDate() - daysFromMonday);

      // Find the last day of the quarter
      const quarterEnd = new Date(year, startMonth + 3, 0);

      // Generate all weeks in this quarter
      const currentWeek = new Date(firstMonday);

      while (currentWeek <= quarterEnd) {
        // Create a unique key for this week start date
        const weekKey = `${currentWeek.getFullYear()}-${currentWeek.getMonth()}-${currentWeek.getDate()}`;

        // Only add if we haven't seen this week start before
        if (!seenWeekStarts.has(weekKey)) {
          allWeeks.push(new Date(currentWeek));
          seenWeekStarts.add(weekKey);
        }

        currentWeek.setDate(currentWeek.getDate() + 7);
      }
    });

    return allWeeks;
  }, [loadedQuarters]);

  const quarterWeeks = generateQuarterWeeks();

  // Scroll to next week
  const loadNextWeek = useCallback(() => {
    if (Platform.OS === 'web') {
      const scrollContainer = scrollContainerRef.current || (document.querySelector('[data-planning-scroll]') as HTMLDivElement);
      if (!scrollContainer) {
        return;
      }

      const nextWeekIndex = visibleWeekIndex + 1;

      // Check if we're trying to go past the last week of the quarter
      if (nextWeekIndex >= quarterWeeks.length) {
        // Calculate next quarter
        let nextQuarter = currentQuarter.quarter + 1;
        let nextYear = currentQuarter.year;
        if (nextQuarter > 4) {
          nextQuarter = 1;
          nextYear += 1;
        }

        setNextQuarterInfo({ year: nextYear, quarter: nextQuarter });
        setShowQuarterPrompt(true);
        return;
      }

      const scrollLeft = nextWeekIndex * 7 * DAY_CELL_WIDTH;

      scrollContainer.scrollLeft = scrollLeft;
      setVisibleWeekIndex(nextWeekIndex);
    }
  }, [visibleWeekIndex, quarterWeeks.length, currentQuarter]);

  // Scroll to previous week
  const loadPreviousWeek = useCallback(() => {
    if (Platform.OS === 'web') {
      const scrollContainer = scrollContainerRef.current || (document.querySelector('[data-planning-scroll]') as HTMLDivElement);
      if (!scrollContainer) {
        return;
      }

      const prevWeekIndex = visibleWeekIndex - 1;

      // Check if we're trying to go before the first week of the loaded quarters
      if (prevWeekIndex < 0) {
        // Calculate previous quarter
        const firstLoadedQuarter = loadedQuarters[0];
        let prevQuarter = firstLoadedQuarter.quarter - 1;
        let prevYear = firstLoadedQuarter.year;
        if (prevQuarter < 1) {
          prevQuarter = 4;
          prevYear -= 1;
        }

        setPreviousQuarterInfo({ year: prevYear, quarter: prevQuarter });
        setShowQuarterPrompt(true);
        return;
      }

      const scrollLeft = prevWeekIndex * 7 * DAY_CELL_WIDTH;

      scrollContainer.scrollLeft = scrollLeft;
      setVisibleWeekIndex(prevWeekIndex);
    }
  }, [visibleWeekIndex, loadedQuarters]);

  // Confirm loading next quarter
  const confirmLoadNextQuarter = useCallback(() => {
    if (nextQuarterInfo) {
      console.log('[usePlanningNavigation] Confirming load next quarter:', nextQuarterInfo);
      // Append the next quarter to loaded quarters
      setLoadedQuarters(prev => {
        const newQuarters = [...prev, nextQuarterInfo];
        console.log('[usePlanningNavigation] Previous quarters:', prev);
        console.log('[usePlanningNavigation] New quarters after append:', newQuarters);
        return newQuarters;
      });
      // Don't change currentQuarter - we want to keep all loaded quarters visible
      setShowQuarterPrompt(false);
      setNextQuarterInfo(null);

      // Don't reset scroll - the new quarter will be appended to the end
      // The scroll position will remain at the end of the previous quarter
    }
  }, [nextQuarterInfo]);

  // Confirm loading previous quarter
  const confirmLoadPreviousQuarter = useCallback(() => {
    if (previousQuarterInfo) {
      // Prepend the previous quarter to loaded quarters
      setLoadedQuarters(prev => [previousQuarterInfo, ...prev]);
      // Don't change currentQuarter - we want to keep all loaded quarters visible
      setShowQuarterPrompt(false);
      setPreviousQuarterInfo(null);

      // Scroll will automatically adjust since we prepended weeks
      // We need to adjust the visible week index to account for the new weeks added
      setVisibleWeekIndex(0);

      if (Platform.OS === 'web') {
        const scrollContainer = scrollContainerRef.current || (document.querySelector('[data-planning-scroll]') as HTMLDivElement);
        if (scrollContainer) {
          scrollContainer.scrollLeft = 0;
        }
      }
    }
  }, [previousQuarterInfo]);

  // Cancel loading quarter
  const cancelLoadNextQuarter = useCallback(() => {
    setShowQuarterPrompt(false);
    setNextQuarterInfo(null);
    setPreviousQuarterInfo(null);
  }, []);

  // Helper to determine which quarter a week belongs to
  // Using ISO week date standard: a week belongs to the year/quarter that contains its Thursday
  const getQuarterForWeek = useCallback((weekStart: Date): { quarter: number; year: number } => {
    // Thursday is the 4th day (index 3) from Monday
    const thursday = new Date(weekStart);
    thursday.setDate(weekStart.getDate() + 3);

    const quarter = Math.floor(thursday.getMonth() / 3) + 1;
    const year = thursday.getFullYear();

    return { quarter, year };
  }, []);

  // Calculate visible week based on scroll position or initial state
  const visibleWeekStart = quarterWeeks[visibleWeekIndex] || currentWeekStart;
  const weekNumber = getWeekNumber(visibleWeekStart);
  const { quarter, year } = getQuarterForWeek(visibleWeekStart);

  // Format week title
  const weekTitle = `Week ${weekNumber}, Q${quarter} ${year}`;

  // Check if a date is in the next unloaded quarter
  const isDateInNextUnloadedQuarter = useCallback((date: Date): boolean => {
    const dateQuarter = Math.floor(date.getMonth() / 3) + 1;
    const dateYear = date.getFullYear();

    // Check if this quarter is loaded
    const isLoaded = loadedQuarters.some(q => q.year === dateYear && q.quarter === dateQuarter);

    if (isLoaded) {
      return false;
    }

    // Get the last loaded quarter
    const sortedQuarters = [...loadedQuarters].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.quarter - b.quarter;
    });
    const lastQuarter = sortedQuarters[sortedQuarters.length - 1];

    // Calculate what the next quarter would be
    let nextQuarter = lastQuarter.quarter + 1;
    let nextYear = lastQuarter.year;
    if (nextQuarter > 4) {
      nextQuarter = 1;
      nextYear += 1;
    }

    // Check if this date is in the next quarter
    return dateYear === nextYear && dateQuarter === nextQuarter;
  }, [loadedQuarters]);

  // Auto-append next quarter if a date is in it
  const autoAppendNextQuarterIfNeeded = useCallback(async (date: Date) => {
    if (isDateInNextUnloadedQuarter(date)) {
      const dateQuarter = Math.floor(date.getMonth() / 3) + 1;
      const dateYear = date.getFullYear();

      console.log('[usePlanningNavigation] Auto-appending next quarter:', { year: dateYear, quarter: dateQuarter });

      setLoadedQuarters(prev => {
        const newQuarters = [...prev, { year: dateYear, quarter: dateQuarter }];
        console.log('[usePlanningNavigation] Updated quarters:', newQuarters);

        // Persist to AsyncStorage
        AsyncStorage.setItem('planning_loaded_quarters', JSON.stringify(newQuarters)).catch(error => {
          console.error('[usePlanningNavigation] Error persisting auto-appended quarter:', error);
        });

        return newQuarters;
      });
    }
  }, [isDateInNextUnloadedQuarter]);

  return {
    currentQuarter,
    currentWeekStart,
    visibleWeekIndex,
    quarterWeeks,
    visibleWeekStart,
    weekNumber,
    weekTitle,
    scrollContainerRef,
    showQuarterPrompt,
    nextQuarterInfo,
    previousQuarterInfo,
    loadedQuarters,
    setCurrentWeekStart,
    setCurrentQuarter,
    setVisibleWeekIndex,
    loadNextWeek,
    loadPreviousWeek,
    confirmLoadNextQuarter,
    confirmLoadPreviousQuarter,
    cancelLoadNextQuarter,
    getWeekNumber,
    getQuarterFromDate,
    generateQuarterWeeks,
    updatePersistedQuarters,
    isDateInNextUnloadedQuarter,
    autoAppendNextQuarterIfNeeded,
  };
};
