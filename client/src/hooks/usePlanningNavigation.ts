import { useState, useCallback, useRef, useEffect } from 'react';
import { Platform } from 'react-native';

const DAY_CELL_WIDTH = 120;

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
  setCurrentWeekStart: (date: Date) => void;
  setCurrentQuarter: (quarter: QuarterInfo) => void;
  setVisibleWeekIndex: (index: number) => void;
  loadNextWeek: () => void;
  loadPreviousWeek: () => void;
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

  // Generate weeks for the current quarter
  const generateQuarterWeeks = useCallback((): Date[] => {
    const { year, quarter } = currentQuarter;
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

    // Generate all weeks in the quarter
    const weeks: Date[] = [];
    const currentWeek = new Date(firstMonday);

    while (currentWeek <= quarterEnd) {
      weeks.push(new Date(currentWeek));
      currentWeek.setDate(currentWeek.getDate() + 7);
    }

    return weeks;
  }, [currentQuarter]);

  const quarterWeeks = generateQuarterWeeks();

  // Scroll to next week
  const loadNextWeek = useCallback(() => {
    if (Platform.OS === 'web') {
      const scrollContainer = scrollContainerRef.current || (document.querySelector('[data-planning-scroll]') as HTMLDivElement);
      if (!scrollContainer) {
        return;
      }

      const nextWeekIndex = visibleWeekIndex + 1;
      const scrollLeft = nextWeekIndex * 7 * DAY_CELL_WIDTH;

      scrollContainer.scrollLeft = scrollLeft;
      setVisibleWeekIndex(nextWeekIndex);
    }
  }, [visibleWeekIndex]);

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
    setCurrentWeekStart,
    setCurrentQuarter,
    setVisibleWeekIndex,
    loadNextWeek,
    loadPreviousWeek,
    getWeekNumber,
    getQuarterFromDate,
    generateQuarterWeeks,
  };
};
