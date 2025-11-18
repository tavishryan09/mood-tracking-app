/**
 * Performance Monitoring Utility
 *
 * Tracks key performance metrics for the application
 * Usage: Import and call track functions at key points
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private timers: Map<string, number> = new Map();
  private maxMetrics = 100; // Keep last 100 metrics

  /**
   * Start a performance timer
   */
  startTimer(name: string, metadata?: Record<string, any>) {
    this.timers.set(name, performance.now());
    if (metadata) {
      this.timers.set(`${name}_metadata`, metadata as any);
    }
  }

  /**
   * End a performance timer and record the metric
   */
  endTimer(name: string): number | null {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`[PerformanceMonitor] Timer "${name}" not found`);
      return null;
    }

    const duration = performance.now() - startTime;
    const metadata = this.timers.get(`${name}_metadata`) as Record<string, any>;

    this.recordMetric(name, duration, metadata);
    this.timers.delete(name);
    this.timers.delete(`${name}_metadata`);

    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log in development
    if (__DEV__) {
      const metadataStr = metadata ? ` ${JSON.stringify(metadata)}` : '';
      console.log(`[Performance] ${name}: ${value.toFixed(2)}ms${metadataStr}`);
    }
  }

  /**
   * Get metrics by name
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((m) => m.name === name);
    }
    return [...this.metrics];
  }

  /**
   * Get average value for a metric
   */
  getAverage(name: string): number | null {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return null;

    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Get statistics for a metric
   */
  getStats(name: string) {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map((m) => m.value);
    const sorted = [...values].sort((a, b) => a - b);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.timers.clear();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }

  /**
   * Log performance summary to console
   */
  logSummary() {
    const metricNames = new Set(this.metrics.map((m) => m.name));

    console.group('Performance Summary');
    metricNames.forEach((name) => {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`${name}:`, {
          avg: `${stats.avg.toFixed(2)}ms`,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          median: `${stats.median.toFixed(2)}ms`,
          p95: `${stats.p95.toFixed(2)}ms`,
          count: stats.count,
        });
      }
    });
    console.groupEnd();
  }

  /**
   * Track API request performance
   */
  trackAPICall(name: string, duration: number, metadata?: Record<string, any>) {
    this.recordMetric(`api:${name}`, duration, {
      type: 'api',
      ...metadata,
    });
  }

  /**
   * Track component render performance
   */
  trackRender(componentName: string, duration: number) {
    this.recordMetric(`render:${componentName}`, duration, {
      type: 'render',
    });
  }

  /**
   * Track screen navigation performance
   */
  trackNavigation(screenName: string, duration: number) {
    this.recordMetric(`navigation:${screenName}`, duration, {
      type: 'navigation',
    });
  }

  /**
   * Measure component render time using React Profiler
   */
  onRenderCallback = (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    this.recordMetric(`profiler:${id}`, actualDuration, {
      type: 'profiler',
      phase,
      baseDuration,
      startTime,
      commitTime,
    });
  };
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export for React Profiler
export const onRenderCallback = performanceMonitor.onRenderCallback;

// Convenience functions
export const startTimer = (name: string, metadata?: Record<string, any>) =>
  performanceMonitor.startTimer(name, metadata);

export const endTimer = (name: string) => performanceMonitor.endTimer(name);

export const trackAPICall = (name: string, duration: number, metadata?: Record<string, any>) =>
  performanceMonitor.trackAPICall(name, duration, metadata);

export const trackRender = (componentName: string, duration: number) =>
  performanceMonitor.trackRender(componentName, duration);

export const trackNavigation = (screenName: string, duration: number) =>
  performanceMonitor.trackNavigation(screenName, duration);

export const getPerformanceStats = (metricName: string) =>
  performanceMonitor.getStats(metricName);

export const logPerformanceSummary = () => performanceMonitor.logSummary();

// Make available globally in dev mode
if (__DEV__ && typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
}

export default performanceMonitor;
