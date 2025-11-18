import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import { FeatureFlag } from '../../utils/featureFlags';

/**
 * Performance Dashboard Component
 *
 * Displays real-time performance metrics during development
 * Only visible when PERFORMANCE_MONITORING feature flag is enabled
 *
 * Usage:
 * import { PerformanceDashboard } from './components/debug/PerformanceDashboard';
 *
 * // Add to your app root (only renders in dev mode)
 * <PerformanceDashboard />
 */
export const PerformanceDashboard: React.FC = () => {
  const isEnabled = useFeatureFlag(FeatureFlag.PERFORMANCE_MONITORING);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isEnabled) return;

    const interval = setInterval(() => {
      const allMetrics = performanceMonitor.getMetrics();
      setMetrics(allMetrics);
    }, 1000);

    return () => clearInterval(interval);
  }, [isEnabled]);

  if (!isEnabled || !__DEV__) {
    return null;
  }

  // Group metrics by type
  const metricsByType = metrics.reduce((acc, metric) => {
    const type = metric.metadata?.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(metric);
    return {};
  }, {} as Record<string, any[]>);

  // Get unique metric names
  const metricNames = Array.from(new Set(metrics.map((m) => m.name)));

  // Get stats for selected metric
  const selectedStats = selectedMetric ? performanceMonitor.getStats(selectedMetric) : null;

  if (isMinimized) {
    return (
      <TouchableOpacity
        style={styles.minimizedButton}
        onPress={() => setIsMinimized(false)}
      >
        <Text style={styles.minimizedText}>📊 Performance ({metrics.length})</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>Performance Dashboard</Text>
          <View style={styles.headerButtons}>
            <Button onPress={() => performanceMonitor.clearMetrics()} mode="text" compact>
              Clear
            </Button>
            <Button onPress={() => performanceMonitor.logSummary()} mode="text" compact>
              Log
            </Button>
            <Button onPress={() => setIsMinimized(true)} mode="text" compact>
              Minimize
            </Button>
          </View>
        </View>

        <ScrollView style={styles.content} nestedScrollEnabled>
          {/* Summary Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text style={styles.stat}>Total Metrics: {metrics.length}</Text>
            <Text style={styles.stat}>Unique Metrics: {metricNames.length}</Text>
          </View>

          {/* Metric List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Metrics</Text>
            {metricNames.map((name) => {
              const stats = performanceMonitor.getStats(name);
              if (!stats) return null;

              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.metricRow,
                    selectedMetric === name && styles.metricRowSelected,
                  ]}
                  onPress={() => setSelectedMetric(name === selectedMetric ? null : name)}
                >
                  <Text style={styles.metricName}>{name}</Text>
                  <Text style={styles.metricValue}>
                    avg: {stats.avg.toFixed(1)}ms | p95: {stats.p95.toFixed(1)}ms
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Detailed Stats */}
          {selectedStats && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Detailed Stats: {selectedMetric}</Text>
              <Text style={styles.stat}>Count: {selectedStats.count}</Text>
              <Text style={styles.stat}>Min: {selectedStats.min.toFixed(2)}ms</Text>
              <Text style={styles.stat}>Max: {selectedStats.max.toFixed(2)}ms</Text>
              <Text style={styles.stat}>Avg: {selectedStats.avg.toFixed(2)}ms</Text>
              <Text style={styles.stat}>Median: {selectedStats.median.toFixed(2)}ms</Text>
              <Text style={styles.stat}>P95: {selectedStats.p95.toFixed(2)}ms</Text>
              <Text style={styles.stat}>P99: {selectedStats.p99.toFixed(2)}ms</Text>
            </View>
          )}

          {/* Export */}
          <View style={styles.section}>
            <Button
              mode="contained"
              onPress={() => {
                const json = performanceMonitor.exportMetrics();
                console.log('[PerformanceDashboard] Exported metrics:', json);
                // Could also copy to clipboard or download as file
              }}
            >
              Export as JSON
            </Button>
          </View>
        </ScrollView>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 350,
    maxHeight: 500,
    zIndex: 9999,
    elevation: 10,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerButtons: {
    flexDirection: 'row',
  },
  content: {
    maxHeight: 400,
    padding: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  stat: {
    fontSize: 12,
    marginBottom: 4,
    color: '#666',
  },
  metricRow: {
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginBottom: 4,
  },
  metricRowSelected: {
    backgroundColor: '#e3f2fd',
  },
  metricName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 11,
    color: '#666',
  },
  minimizedButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 9999,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  minimizedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PerformanceDashboard;
