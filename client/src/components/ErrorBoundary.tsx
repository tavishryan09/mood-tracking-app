import React, { Component, ReactNode } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform } from 'react-native';
import { Button } from 'react-native-paper';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to console in development
    console.error('Error Boundary caught:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send to error monitoring service (Sentry, LogRocket, etc.)
    // Example: Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });

    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error!, this.resetError);
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.emoji}>⚠️</Text>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>

            {__DEV__ && this.state.error && (
              <ScrollView style={styles.errorDetailsContainer}>
                <Text style={styles.errorDetailsTitle}>Error Details (Dev Mode):</Text>
                <Text style={styles.errorName}>{this.state.error.name}</Text>
                <Text style={styles.errorStack}>{this.state.error.stack}</Text>
                {this.state.errorInfo && (
                  <>
                    <Text style={styles.errorDetailsTitle}>Component Stack:</Text>
                    <Text style={styles.errorStack}>{this.state.errorInfo.componentStack}</Text>
                  </>
                )}
              </ScrollView>
            )}

            <Button
              mode="contained"
              onPress={this.resetError}
              style={styles.button}
              buttonColor="#dd3e7f"
            >
              Try Again
            </Button>

            {Platform.OS === 'web' && (
              <Button
                mode="outlined"
                onPress={() => window.location.reload()}
                style={styles.reloadButton}
              >
                Reload Page
              </Button>
            )}
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  content: {
    maxWidth: 600,
    width: '100%',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#dc3545',
    textAlign: 'center',
    fontFamily: 'Josefin Sans',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#6c757d',
    fontFamily: 'Josefin Sans',
  },
  errorDetailsContainer: {
    width: '100%',
    maxHeight: 300,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    color: '#495057',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },
  errorName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 5,
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
  },
  errorStack: {
    fontSize: 11,
    color: '#212529',
    fontFamily: Platform.OS === 'web' ? 'monospace' : 'Courier',
    marginBottom: 10,
  },
  button: {
    marginTop: 10,
    minWidth: 200,
  },
  reloadButton: {
    marginTop: 10,
    minWidth: 200,
  },
});

export default ErrorBoundary;
