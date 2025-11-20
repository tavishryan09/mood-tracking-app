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
  loadedQuarters: QuarterInfo[];
  setCurrentWeekStart: (date: Date) => void;
  setCurrentQuarter: (quarter: QuarterInfo) => void;
  setVisibleWeekIndex: (index: number) => void;
  loadNextWeek: () => void;
  loadPreviousWeek: () => void;
  confirmLoadNextQuarter: () => void;
  cancelLoadNextQuarter: () => void;
  getWeekNumber: (date: Date) => number;
  getQuarterFromDate: (date: Date) => number;
  generateQuarterWeeks: () => Date[];
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

  // Load persisted quarters on mount
  useEffect(() => {
    const loadPersistedQuarters = async () => {
      try {
        const stored = await AsyncStorage.getItem('planning_loaded_quarters');
        if (stored) {
          const parsedQuarters = JSON.parse(stored) as QuarterInfo[];
          // Only use persisted quarters if they're valid
          if (Array.isArray(parsedQuarters) && parsedQuarters.length > 0) {
            setLoadedQuarters(parsedQuarters);
          }
        }
      } catch (error) {
        console.error('[usePlanningNavigation] Error loading persisted quarters:', error);
      }
    };

    loadPersistedQuarters();
  }, []);

  // Persist loaded quarters whenever they change
  useEffect(() => {
    const persistQuarters = async () => {
      try {
        await AsyncStorage.setItem('planning_loaded_quarters', JSON.stringify(loadedQuarters));
      } catch (error) {
        console.error('[usePlanningNavigation] Error persisting quarters:', error);
      }
    };

    if (loadedQuarters.length > 0) {
      persistQuarters();
    }
  }, [loadedQuarters]);

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
        allWeeks.push(new Date(currentWeek));
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

      const prevWeekIndex = Math.max(0, visibleWeekIndex - 1);
      const scrollLeft = prevWeekIndex * 7 * DAY_CELL_WIDTH;

      scrollContainer.scrollLeft = scrollLeft;
      setVisibleWeekIndex(prevWeekIndex);
    }
  }, [visibleWeekIndex]);

  // Confirm loading next quarter
  const confirmLoadNextQuarter = useCallback(() => {
    if (nextQuarterInfo) {
      // Append the next quarter to loaded quarters
      setLoadedQuarters(prev => [...prev, nextQuarterInfo]);
      setCurrentQuarter(nextQuarterInfo);
      setShowQuarterPrompt(false);
      setNextQuarterInfo(null);

      // Don't reset scroll - the new quarter will be appended to the end
      // The scroll position will remain at the end of the previous quarter
    }
  }, [nextQuarterInfo]);

  // Cancel loading next quarter
  const cancelLoadNextQuarter = useCallback(() => {
    setShowQuarterPrompt(false);
    setNextQuarterInfo(null);
  }, []);

  // Calculate visible week based on scroll position or initial state
  const visibleWeekStart = quarterWeeks[visibleWeekIndex] || currentWeekStart;
  const weekNumber = getWeekNumber(visibleWeekStart);
  const quarter = getQuarterFromDate(visibleWeekStart);
  const year = visibleWeekStart.getFullYear();

  // Format week title
  const weekTitle = `Week ${weekNumber}, Q${quarter} ${year}`;

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
    loadedQuarters,
    setCurrentWeekStart,
    setCurrentQuarter,
    setVisibleWeekIndex,
    loadNextWeek,
    loadPreviousWeek,
    confirmLoadNextQuarter,
    cancelLoadNextQuarter,
    getWeekNumber,
    getQuarterFromDate,
    generateQuarterWeeks,
  };
};
