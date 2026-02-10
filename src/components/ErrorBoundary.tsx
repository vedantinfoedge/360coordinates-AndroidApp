/**
 * Error boundary to capture JS exceptions and log full stack.
 * Used for debugging Buyer → Seller switch crash. Keep at app root.
 */
import React, {Component, ErrorInfo, ReactNode} from 'react';
import {View, Text, StyleSheet} from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({errorInfo});
    console.error('[ErrorBoundary] CRASH CAUGHT', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <View style={styles.container}>
          <Text style={styles.title}>App Error</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
          {this.state.error.stack && (
            <Text style={styles.stack} numberOfLines={20}>
              {this.state.error.stack}
            </Text>
          )}
          {this.state.errorInfo?.componentStack && (
            <Text style={styles.stack} numberOfLines={15}>
              {this.state.errorInfo.componentStack}
            </Text>
          )}
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: {fontSize: 18, fontWeight: '700', marginBottom: 8},
  message: {fontSize: 14, marginBottom: 12, color: '#c00'},
  stack: {fontSize: 11, fontFamily: 'monospace', marginTop: 8},
});
