import React, {useEffect, useRef, useState, useMemo} from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import {MSG91_CONFIG} from '../../config/msg91.config';

// Conditionally import WebView to handle cases where it's not linked
let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch (error) {
  console.warn('[MSG91 Widget] WebView not available. Please install and rebuild: npm install react-native-webview && npm run android');
}

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface MSG91WebWidgetProps {
  visible: boolean;
  onClose: () => void;
  identifier: string; // Email or phone number
  widgetType: 'email' | 'sms';
  onSuccess: (data: any) => void;
  onFailure: (error: any) => void;
}

const MSG91WebWidget: React.FC<MSG91WebWidgetProps> = ({
  visible,
  onClose,
  identifier,
  widgetType,
  onSuccess,
  onFailure,
}) => {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Memoize widget config to prevent recalculation on every render
  const widgetConfig = useMemo(() => {
    const widgetId =
      widgetType === 'email'
        ? MSG91_CONFIG.EMAIL_WIDGET_ID
        : MSG91_CONFIG.SMS_WIDGET_ID;
    
    const authToken =
      widgetType === 'email'
        ? MSG91_CONFIG.EMAIL_AUTH_TOKEN
        : MSG91_CONFIG.SMS_AUTH_TOKEN;
    
    return { widgetId, authToken };
  }, [widgetType]);

  const { widgetId, authToken } = widgetConfig;

  // Log configuration only when widget becomes visible (not on every render)
  useEffect(() => {
    if (visible) {
      console.log('[MSG91 Widget] Configuration:', {
        widgetType,
        widgetId,
        authToken: authToken ? `${authToken.substring(0, 10)}...` : 'MISSING',
        identifier,
        widgetIdLength: widgetId?.length,
        authTokenLength: authToken?.length,
      });
    }
  }, [visible, widgetType, widgetId, authToken, identifier]);

  // Reset loading when modal opens - MUST BE BEFORE CONDITIONAL RETURN
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setErrorMessage(null); // Clear previous errors
      // If WebView is not available, show error immediately
      if (!WebView) {
        setTimeout(() => {
          onFailure(new Error('WebView not available. Please rebuild the app after installing react-native-webview.'));
          onClose();
        }, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Validate configuration - AFTER ALL HOOKS
  if (!widgetId || !authToken) {
    console.error('[MSG91 Widget] Missing configuration:', {
      widgetId: !!widgetId,
      authToken: !!authToken,
    });
    onFailure(new Error('MSG91 widget configuration is missing. Please check msg91.config.ts'));
    return null;
  }

  // HTML content with MSG91 script
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .container {
      width: 100%;
      max-width: 400px;
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .loading {
      text-align: center;
      padding: 20px;
      color: #666;
    }
    #msg91-widget-container {
      width: 100%;
    }
  </style>
</head>
<body>
  <div class="container">
    <div id="msg91-widget-container">
      <div class="loading">Loading verification widget...</div>
    </div>
  </div>

  <!-- MSG91 OTP Widget Script -->
  <script type="text/javascript" src="https://verify.msg91.com/otp-provider.js"></script>
  <script>
    // Monitor script loading
    window.addEventListener('load', function() {
      console.log('MSG91 Widget: Page loaded, checking for script...');
      if (typeof window.initSendOTP === 'function') {
        console.log('MSG91 Widget: Script loaded successfully, initSendOTP available');
      } else {
        console.error('MSG91 Widget: Script not loaded, initSendOTP not found');
      }
    });
  </script>
  
  <script>
    (function() {
      let retryCount = 0;
      const maxRetries = 10;
      
      function initWidget() {
        console.log('MSG91 Widget: Checking for initSendOTP function...');
        console.log('MSG91 Widget: widgetId = ${widgetId}');
        console.log('MSG91 Widget: authToken = ${authToken ? authToken.substring(0, 10) + "..." : "MISSING"}');
        console.log('MSG91 Widget: identifier = ${identifier}');
        console.log('MSG91 Widget: widgetId length = ${widgetId?.length}');
        console.log('MSG91 Widget: authToken length = ${authToken?.length}');
        console.log('MSG91 Widget: window.initSendOTP type =', typeof window.initSendOTP);
        console.log('MSG91 Widget: document readyState =', document.readyState);
        
        // Validate widget ID and token before initialization
        if (!'${widgetId}' || '${widgetId}'.trim() === '') {
          console.error('MSG91 Widget: widgetId is empty or invalid');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            error: {
              message: 'Widget ID is missing or invalid. Please check msg91.config.ts',
              code: 'INVALID_WIDGET_ID'
            }
          }));
          return;
        }
        
        if (!'${authToken}' || '${authToken}'.trim() === '') {
          console.error('MSG91 Widget: authToken is empty or invalid');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            error: {
              message: 'Auth Token is missing or invalid. Please check msg91.config.ts',
              code: 'INVALID_AUTH_TOKEN'
            }
          }));
          return;
        }
        
        if (typeof window.initSendOTP === 'function') {
          console.log('MSG91 Widget: initSendOTP found, initializing...');
          try {
            // Verify container exists before initializing
            const container = document.getElementById('msg91-widget-container');
            if (!container) {
              console.error('MSG91 Widget: Container not found!');
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                error: {
                  message: 'Widget container not found in DOM',
                  code: 'CONTAINER_NOT_FOUND'
                }
              }));
              return;
            }
            console.log('MSG91 Widget: Container found, ready to initialize');
            
            // MSG91 widget configuration
            // Use tokenAuth parameter with the Auth Token (Token ID)
            const config: any = {
              widgetId: '${widgetId}',
              tokenAuth: '${authToken}',
              identifier: '${identifier}',
            };
            
            console.log('MSG91 Widget: Config being used:', {
              widgetId: config.widgetId,
              identifier: config.identifier,
              tokenAuth: config.tokenAuth ? config.tokenAuth.substring(0, 15) + '...' : 'MISSING',
              tokenAuthLength: config.tokenAuth?.length,
            });
            
            config.success = function(data: any) {
                console.log('MSG91 Widget: Success!', data);
                // Send success message to React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'success',
                  data: data
                }));
              };
            
            config.failure = function(error: any) {
                // Send failure message to React Native with detailed error info
                console.error('MSG91 Widget: Failure callback triggered', error);
                console.error('MSG91 Widget: Config used:', {
                  widgetId: '${widgetId}',
                  tokenAuth: '${authToken ? authToken.substring(0, 10) + "..." : "MISSING"}',
                  identifier: '${identifier}'
                });
                const errorInfo = {
                  message: error?.message || error?.error || (typeof error === 'string' ? error : JSON.stringify(error)) || 'Unknown error',
                  code: error?.code || error?.status || null,
                  type: error?.type || 'failure',
                  fullError: error,
                  config: {
                    widgetId: '${widgetId}',
                    tokenAuthLength: '${authToken}'.length,
                    identifier: '${identifier}'
                  }
                };
                console.error('MSG91 Widget: Error details:', errorInfo);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'failure',
                  error: errorInfo
                }));
              }
            };
            console.log('MSG91 Widget: Calling initSendOTP with config:', {
              widgetId: config.widgetId,
              tokenAuth: config.tokenAuth ? config.tokenAuth.substring(0, 10) + '...' : 'MISSING',
              identifier: config.identifier
            });
            window.initSendOTP(config);
            console.log('MSG91 Widget: initSendOTP called successfully');
          } catch (error) {
            console.error('MSG91 Widget: Exception during initialization:', error);
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: {
                message: error?.message || error?.toString() || 'Initialization failed',
                fullError: error,
                config: {
                  widgetId: '${widgetId}',
                  tokenAuthLength: '${authToken}'.length
                }
              }
            }));
          }
        } else {
          // Retry if script not loaded yet
          retryCount++;
          console.log('MSG91 Widget: initSendOTP not found, retry', retryCount, 'of', maxRetries);
          console.log('MSG91 Widget: window object keys:', Object.keys(window).filter(k => k.toLowerCase().includes('msg') || k.toLowerCase().includes('otp') || k.toLowerCase().includes('init')));
          console.log('MSG91 Widget: typeof window.initSendOTP:', typeof window.initSendOTP);
          console.log('MSG91 Widget: Scripts on page:', Array.from(document.scripts).map(s => s.src));
          if (retryCount < maxRetries) {
            setTimeout(initWidget, 500); // Increased delay
          } else {
            console.error('MSG91 Widget: Script failed to load after', maxRetries, 'retries');
            console.error('MSG91 Widget: Script URL: https://verify.msg91.com/otp-provider.js');
            console.error('MSG91 Widget: Check network tab for script loading errors');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: {
                message: 'MSG91 widget script failed to load after ' + maxRetries + ' retries. The script from https://verify.msg91.com/otp-provider.js may not be loading. Check network connectivity.',
                code: 'SCRIPT_LOAD_FAILED',
                details: 'Script URL: https://verify.msg91.com/otp-provider.js'
              }
            }));
          }
        }
      }
      
      // Start initialization when page loads
      // Add a small delay to ensure WebView is fully ready
      function startInit() {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', function() {
            setTimeout(initWidget, 300);
          });
        } else {
          setTimeout(initWidget, 300);
        }
      }
      
      startInit();
    })();
  </script>
</body>
</html>
  `;

  // Handle messages from WebView
  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[MSG91 Widget] Received message:', message);
      
      if (message.type === 'success') {
        setLoading(false);
        console.log('[MSG91 Widget] Success - closing modal');
        onSuccess(message.data);
        onClose();
      } else if (message.type === 'failure' || message.type === 'error') {
        setLoading(false);
        console.log('[MSG91 Widget] Failure/Error received:', message);
        console.error('[MSG91 Widget] Full error object:', JSON.stringify(message, null, 2));
        
        // Extract error message
        const errorMsg = message.error?.message || 
                        message.error?.error || 
                        message.error || 
                        JSON.stringify(message.error) ||
                        'Unknown error occurred';
        
        setErrorMessage(errorMsg);
        console.warn('[MSG91 Widget] Widget error:', errorMsg);
        console.warn('[MSG91 Widget] Error code:', message.error?.code);
        console.warn('[MSG91 Widget] Error type:', message.error?.type);
        
        // Show detailed error to user
        Alert.alert(
          'Widget Error',
          `MSG91 Widget failed to load.\n\nError: ${errorMsg}\n\nCode: ${message.error?.code || 'N/A'}\n\nPlease check:\n1. Widget ID and Auth Token in MSG91 dashboard\n2. Widget is active/enabled\n3. Internet connection`,
          [
            {text: 'OK'},
            {
              text: 'Use Backend API',
              onPress: () => {
                onFailure(new Error(errorMsg));
                onClose();
              }
            }
          ]
        );
        
        // Don't close modal immediately - let user see the error
        // The widget UI will also display the error, but we show it here too
      }
    } catch (error) {
      console.error('[MSG91 Widget] Error parsing message:', error, 'Raw data:', event.nativeEvent.data);
      // Don't close on parse errors - might be other messages
    }
  };

  // If WebView is not available, show error message
  if (!WebView) {
    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {widgetType === 'email' ? 'Email Verification' : 'Phone Verification'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>WebView Not Available</Text>
              <Text style={styles.errorText}>
                Please rebuild the app after installing react-native-webview:
              </Text>
              <Text style={styles.errorCode}>
                npm install react-native-webview{'\n'}
                npm run android
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  onClose();
                  // Fallback to backend API
                  onFailure(new Error('WebView not available - using backend API'));
                }}>
                <Text style={styles.retryButtonText}>Use Backend API Instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {widgetType === 'email' ? 'Email Verification' : 'Phone Verification'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Error Message Display */}
          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorBannerText}>⚠️ {errorMessage}</Text>
              <TouchableOpacity
                style={styles.useBackendButton}
                onPress={() => {
                  onFailure(new Error(errorMessage));
                  onClose();
                }}>
                <Text style={styles.useBackendButtonText}>Use Backend API</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* WebView */}
          <View style={styles.webViewContainer}>
            {loading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading verification widget...</Text>
              </View>
            )}
            <WebView
              ref={webViewRef}
              source={{html: htmlContent}}
              onMessage={(event: any) => {
                // Handle both widget messages and console logs
                try {
                  const data = event.nativeEvent.data;
                  // Check if it's a console log message
                  if (data && typeof data === 'string' && (data.startsWith('console:') || data.startsWith('console:ERROR:') || data.startsWith('console:WARN:'))) {
                    const logData = data.replace(/^console:(ERROR:|WARN:)?/, '');
                    try {
                      const parsed = JSON.parse(logData);
                      if (data.startsWith('console:ERROR:')) {
                        console.error('[WebView]', ...parsed);
                      } else if (data.startsWith('console:WARN:')) {
                        console.warn('[WebView]', ...parsed);
                      } else {
                        console.log('[WebView]', ...parsed);
                      }
                    } catch (e) {
                      console.log('[WebView]', logData);
                    }
                    return;
                  }
                  // Otherwise handle as widget message
                  handleMessage(event);
                } catch (error) {
                  handleMessage(event);
                }
              }}
              onLoadEnd={() => {
                console.log('[MSG91 Widget] WebView loaded - widget should initialize soon');
                // Inject console.log to WebView for debugging
                webViewRef.current?.injectJavaScript(`
                  console.log('WebView JavaScript injected');
                  console.log('Checking for initSendOTP:', typeof window.initSendOTP);
                  console.log('Widget ID:', '${widgetId}');
                  console.log('Auth Token length:', '${authToken}'.length);
                  console.log('All scripts on page:', Array.from(document.scripts).map(s => s.src));
                `);
                // Keep loading state a bit longer to let widget initialize
                setTimeout(() => {
                  setLoading(false);
                }, 3000); // Increased timeout to allow widget to load
                
                // Auto-fallback after 5 seconds if widget doesn't load
                setTimeout(() => {
                  if (loading) {
                    console.warn('[MSG91 Widget] Widget taking too long, showing fallback option');
                    setErrorMessage('Widget is taking longer than expected to load. You can use the backend API instead.');
                  }
                }, 5000);
              }}
              onLoadStart={() => {
                console.log('[MSG91 Widget] WebView started loading');
              }}
              onError={(syntheticEvent: any) => {
                const {nativeEvent} = syntheticEvent;
                console.error('[MSG91 Widget] WebView error:', nativeEvent);
                // Don't close modal on WebView errors - let user see what happened
                setLoading(false);
                // Only call onFailure for critical errors
                if (nativeEvent.code === -2 || nativeEvent.description?.includes('net::ERR')) {
                  // Network error - critical
                  onFailure(new Error('Network error: ' + nativeEvent.description));
                }
              }}
              onHttpError={(syntheticEvent: any) => {
                const {nativeEvent} = syntheticEvent;
                console.warn('[MSG91 Widget] WebView HTTP error:', nativeEvent);
                setLoading(false);
                // HTTP errors are usually non-critical - widget might still work
              }}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              scalesPageToFit={true}
              style={styles.webView}
              // Add these to help debug
              onShouldStartLoadWithRequest={() => true}
              mixedContentMode="always"
              originWhitelist={['*']}
              // Inject console override to capture WebView console logs for debugging
              injectedJavaScript={`
                (function() {
                  const originalLog = console.log;
                  const originalError = console.error;
                  const originalWarn = console.warn;
                  
                  console.log = function(...args) {
                    originalLog.apply(console, args);
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage('console:' + JSON.stringify(args));
                    }
                  };
                  
                  console.error = function(...args) {
                    originalError.apply(console, args);
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage('console:ERROR:' + JSON.stringify(args));
                    }
                  };
                  
                  console.warn = function(...args) {
                    originalWarn.apply(console, args);
                    if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage('console:WARN:' + JSON.stringify(args));
                    }
                  };
                  
                  console.log('Console logging enabled for MSG91 Widget');
                })();
                true; // Required for injectedJavaScript
              `}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 500,
    height: SCREEN_HEIGHT * 0.7,
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#666',
    fontWeight: 'bold',
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#333',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBanner: {
    backgroundColor: '#fff3cd',
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: '#856404',
    marginRight: 8,
  },
  useBackendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  useBackendButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default MSG91WebWidget;

