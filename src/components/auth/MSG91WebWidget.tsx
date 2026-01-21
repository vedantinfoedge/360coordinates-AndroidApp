import React, {useEffect, useRef, useState, useMemo} from 'react';
import {
  View,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {MSG91_CONFIG} from '../../config/msg91.config';
import CustomAlert from '../../utils/alertHelper';

// Conditionally import WebView to handle cases where it's not linked
let WebView: any = null;
let WebViewAvailable = false;
try {
  const webviewModule = require('react-native-webview');
  WebView = webviewModule.WebView;
  WebViewAvailable = true;
  console.log('[MSG91 Widget] WebView module loaded successfully');
} catch (error) {
  console.warn('[MSG91 Widget] WebView not available:', error);
  console.warn('[MSG91 Widget] To fix: npm install react-native-webview && npm run android (or npm run ios)');
  WebViewAvailable = false;
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
  const responseReceivedRef = useRef<boolean>(false);
  const nativeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Normalize identifier to MSG91-required phone/email format
  const normalizedIdentifier = useMemo(() => {
    const raw = identifier || '';
    const digitsOnly = raw.replace(/\D/g, '');
    // Phone flow expects 91XXXXXXXXXX (12 digits, no +)
    if (digitsOnly.startsWith('91') && digitsOnly.length === 12) {
      return digitsOnly;
    }
    if (digitsOnly.length === 10 && /^[6-9]\d{9}$/.test(digitsOnly)) {
      return `91${digitsOnly}`;
    }
    // Fallback to original string for non-phone identifiers (e.g., email)
    return raw.trim();
  }, [identifier]);

      // Log configuration only when widget becomes visible (not on every render)
  useEffect(() => {
    if (visible) {
      console.log('[MSG91 Widget] Configuration:', {
        widgetType,
        widgetId,
        authToken: authToken ? `${authToken.substring(0, 10)}...` : 'MISSING',
        identifier: normalizedIdentifier,
        widgetIdLength: widgetId?.length,
        authTokenLength: authToken?.length,
        identifierLength: normalizedIdentifier?.length,
      });
      console.log('[MSG91 Widget] Full Widget ID:', widgetId);
      console.log('[MSG91 Widget] Full Auth Token (first 15 chars):', authToken ? authToken.substring(0, 15) : 'MISSING');
      console.log('[MSG91 Widget] These credentials will be used in WebView HTML');
    }
  }, [visible, widgetType, widgetId, authToken, normalizedIdentifier]);

  // Reset loading when modal opens - MUST BE BEFORE CONDITIONAL RETURN
  useEffect(() => {
    if (visible) {
      setLoading(true);
      setErrorMessage(null); // Clear previous errors
      responseReceivedRef.current = false; // Reset response flag
      
      // Clear any existing timeout
      if (nativeTimeoutRef.current) {
        clearTimeout(nativeTimeoutRef.current);
        nativeTimeoutRef.current = null;
      }
      
      // If WebView is not available, show error immediately
      if (!WebViewAvailable || !WebView) {
        setTimeout(() => {
          const errorMsg = 'WebView module is not available. This widget requires react-native-webview to be installed and the app to be rebuilt.\n\nTo fix:\n1. Run: npm install react-native-webview\n2. For iOS: cd ios && pod install && cd ..\n3. Rebuild the app: npm run android (or npm run ios)';
          console.error('[MSG91 Widget]', errorMsg);
          onFailure(new Error(errorMsg));
          onClose();
        }, 100);
        return;
      }
      
      // Set React Native-side timeout as backup (7 seconds - slightly longer than JS timeout)
      // This ensures we catch the error even if JavaScript timeout doesn't fire
      console.log('[MSG91 Widget] Setting React Native-side timeout (7 seconds) as backup...');
      nativeTimeoutRef.current = setTimeout(() => {
        if (!responseReceivedRef.current) {
          console.error('[MSG91 Widget] React Native-side timeout FIRED - no response received from widget');
          console.error('[MSG91 Widget] This indicates the widget failed silently (likely Mobile Integration disabled)');
          setLoading(false);
          const timeoutError = {
            code: 'INIT_TIMEOUT',
            message: 'Widget initialization timeout. The widget did not respond within 7 seconds.\n\n' +
                     'Even if Mobile Integration is enabled, please verify:\n\n' +
                     '1. ✓ Mobile Integration is ENABLED and SAVED in MSG91 dashboard\n' +
                     '2. ⏱️  Wait 1-2 minutes after enabling (settings propagation delay)\n' +
                     '3. ✓ Widget ID matches exactly: ${widgetId}\n' +
                     '4. ✓ Token ID matches exactly (first 15 chars): ${authToken ? authToken.substring(0, 15) : "MISSING"}\n' +
                     '5. ✓ Widget status is ACTIVE (not disabled)\n' +
                     '6. ✓ IP Whitelisting is DISABLED or your IP is whitelisted\n' +
                     '7. ✓ Phone number format: ${normalizedIdentifier} (should be 91XXXXXXXXXX)\n\n' +
                     'If all above are correct, check MSG91 Dashboard → Reports for error details.',
            details: 'Widget did not call success/failure callbacks within 7 seconds. ' +
                     'Check console logs for detailed error information from MSG91 widget.'
          };
          onFailure(timeoutError);
        }
      }, 7000);
    } else {
      // Modal closed - clear timeout
      if (nativeTimeoutRef.current) {
        clearTimeout(nativeTimeoutRef.current);
        nativeTimeoutRef.current = null;
      }
      responseReceivedRef.current = false;
    }
    
    // Cleanup on unmount
    return () => {
      if (nativeTimeoutRef.current) {
        clearTimeout(nativeTimeoutRef.current);
        nativeTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Validate configuration - AFTER ALL HOOKS
  if (!widgetId || !authToken) {
    console.error('[MSG91 Widget] Missing configuration:', {
      widgetId: !!widgetId,
      authToken: !!authToken,
    });
    // Return silently to avoid setState during render
    return null;
  }
  
  // Validate credential format (log only; avoid setState during render)
  if (widgetId.trim().length < 20 || widgetId.trim().length > 30) {
    console.error('[MSG91 Widget] Invalid widget ID format:', widgetId.length, 'characters');
    return null;
  }
  
  if (authToken.trim().length < 20 || authToken.trim().length > 50) {
    console.error('[MSG91 Widget] Invalid auth token format:', authToken.length, 'characters');
    return null;
  }
  
  // Validate identifier format (log only)
  const isSMSWidget = widgetType === 'sms';

  if (isSMSWidget) {
    if (!normalizedIdentifier || !/^\d{12}$/.test(normalizedIdentifier)) {
      console.error('[MSG91 Widget] Invalid phone identifier (expected 91XXXXXXXXXX):', normalizedIdentifier);
      return null;
    }
  } else {
    if (!normalizedIdentifier || normalizedIdentifier.length < 5) {
      console.error('[MSG91 Widget] Invalid identifier for email widget:', normalizedIdentifier);
      return null;
    }
  }

  // HTML content with MSG91 script
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <meta http-equiv="Content-Security-Policy" content="default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval';">
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
    .error {
      text-align: center;
      padding: 20px;
      color: #d32f2f;
      background: #ffebee;
      border-radius: 8px;
      margin: 10px 0;
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

  <!-- MSG91 OTP Widget Script with error handling -->
  <script type="text/javascript" src="https://verify.msg91.com/otp-provider.js" 
    onerror="handleScriptError()" 
    onload="handleScriptLoad()">
  </script>
  <script>
    let scriptLoaded = false;
    let scriptError = false;
    
    function handleScriptLoad() {
      scriptLoaded = true;
      console.log('MSG91 Widget: Script loaded successfully');
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'script-status',
          status: 'loaded',
          timestamp: Date.now(),
          details: 'otp-provider.js loaded'
        }));
      }
    }
    
    function handleScriptError() {
      scriptError = true;
      console.error('MSG91 Widget: Script failed to load');
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: {
            message: 'MSG91 script failed to load. Please check your internet connection.',
            code: 'SCRIPT_LOAD_ERROR',
            details: 'Script URL: https://verify.msg91.com/otp-provider.js'
          }
        }));
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'script-status',
          status: 'error',
          timestamp: Date.now(),
          details: 'otp-provider.js failed to load'
        }));
      }
    }
    
    // Monitor script loading with timeout
    window.addEventListener('load', function() {
      console.log('MSG91 Widget: Page loaded, checking for script...');
      // Set timeout for script loading (10 seconds)
      setTimeout(function() {
        if (!scriptLoaded && !scriptError) {
          console.error('MSG91 Widget: Script loading timeout');
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: {
                message: 'MSG91 script loading timeout. Please check your internet connection and try again.',
                code: 'SCRIPT_LOAD_TIMEOUT',
                details: 'Script took longer than 10 seconds to load'
              }
            }));
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'script-status',
              status: 'timeout',
              timestamp: Date.now(),
              details: 'otp-provider.js did not finish loading within 10s'
            }));
          }
        }
      }, 10000);
      
      if (typeof window.initSendOTP === 'function') {
        console.log('MSG91 Widget: Script loaded successfully, initSendOTP available');
        scriptLoaded = true;
      } else {
        console.warn('MSG91 Widget: Script not loaded yet, initSendOTP not found');
      }
    });
  </script>
  
  <script>
    (function() {
      let retryCount = 0;
      const maxRetries = 15; // Increased retries
      const retryDelay = 300; // Reduced delay for faster retries
      const maxWaitTime = 15000; // 15 second total timeout
      const startTime = Date.now();
      
      function initWidget() {
        console.log('MSG91 Widget: Checking for initSendOTP function...');
        console.log('MSG91 Widget: widgetId = ${widgetId}');
        console.log('MSG91 Widget: authToken = ${authToken ? authToken.substring(0, 10) + "..." : "MISSING"}');
        console.log('MSG91 Widget: identifier = ${normalizedIdentifier}');
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
              identifier: '${normalizedIdentifier}',
            };
            
            console.log('MSG91 Widget: Config being used:', {
              widgetId: config.widgetId,
              identifier: config.identifier,
              tokenAuth: config.tokenAuth ? config.tokenAuth.substring(0, 15) + '...' : 'MISSING',
              tokenAuthLength: config.tokenAuth?.length,
            });

            // Notify React Native that we are about to call initSendOTP
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'init-attempt',
                ts: Date.now(),
                widgetId: '${widgetId}',
                identifier: '${normalizedIdentifier}',
                tokenAuthLength: '${authToken}'.length
              }));
            }
            
            // Declare timeout variable BEFORE callbacks (so callbacks can reference it)
            let initTimeout: any = null;
            
            config.success = function(data: any) {
                console.log('MSG91 Widget: Success callback triggered!', data);
                
                // Clear any pending timeout
                if (initTimeout) {
                  clearTimeout(initTimeout);
                  initTimeout = null;
                }
                
                // Comprehensive token extraction
                let token = data?.token || 
                           data?.verificationToken || 
                           data?.phoneVerificationToken ||
                           data?.data?.token ||
                           data?.data?.verificationToken ||
                           data?.data?.phoneVerificationToken ||
                           data?.message;
                
                // If message is JSON string, try parsing
                if (!token && data?.message && typeof data.message === 'string') {
                  try {
                    const parsed = JSON.parse(data.message);
                    token = parsed?.token || 
                            parsed?.verificationToken || 
                            parsed?.phoneVerificationToken ||
                            parsed?.message;
                  } catch (e) {
                    if (data.message.length > 20 && data.message.length < 200) {
                      token = data.message;
                    }
                  }
                }
                
                // Send success message to React Native with extracted token
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'success',
                  data: {
                    ...data,
                    extractedToken: token, // Add extracted token for convenience
                  }
                }));
              };
            
            config.failure = function(error: any) {
                // Clear any pending timeout
                if (initTimeout) {
                  clearTimeout(initTimeout);
                  initTimeout = null;
                }
                
                // Send failure message to React Native with detailed error info
                console.error('MSG91 Widget: Failure callback triggered', error);
                console.error('MSG91 Widget: Full error object:', JSON.stringify(error, null, 2));
                console.error('MSG91 Widget: Config used:', {
                  widgetId: '${widgetId}',
                  widgetIdLength: '${widgetId}'.length,
                  tokenAuth: '${authToken ? authToken.substring(0, 15) + "..." : "MISSING"}',
                  tokenAuthLength: '${authToken}'.length,
                  identifier: '${normalizedIdentifier}',
                  identifierLength: '${normalizedIdentifier}'.length,
                });
                
                console.error('MSG91 Widget: Troubleshooting checklist:');
                console.error('  1. Verify Widget ID matches MSG91 dashboard: ${widgetId}');
                console.error('  2. Verify Token ID matches MSG91 dashboard (first 15 chars): ${authToken ? authToken.substring(0, 15) : "MISSING"}');
                console.error('  3. Check Mobile Integration is ENABLED and SAVED in MSG91 dashboard');
                console.error('  4. Check Widget status is ACTIVE (not disabled)');
                console.error('  5. Check IP Whitelisting is DISABLED or your IP is whitelisted');
                console.error('  6. Wait 1-2 minutes after enabling Mobile Integration (propagation delay)');
                
                // Enhanced error extraction for 401 and other common errors
                let errorCode = error?.code || error?.status || null;
                let errorMsg = error?.message || error?.error || (typeof error === 'string' ? error : JSON.stringify(error)) || 'Unknown error';
                
                // Normalize 401 errors
                if (errorCode === '401' || errorCode === 401 || errorMsg?.includes('AuthenticationFailure') || errorMsg?.includes('401')) {
                  errorCode = '401';
                  errorMsg = 'Authentication failed. Please verify MSG91 widget credentials (Widget ID and Auth Token) in the dashboard.';
                }
                
                // Normalize IP blocked errors
                if (errorCode === '408' || errorCode === 408 || errorMsg?.includes('IPBlocked') || errorMsg?.includes('IP Blocked')) {
                  errorCode = '408';
                  errorMsg = 'IP address blocked. Please whitelist your IP in MSG91 dashboard or disable IP whitelisting.';
                }
                
                // Normalize mobile integration errors (check multiple variations)
                if (errorMsg?.includes('Mobile requests are not allowed') || 
                    errorMsg?.includes('Mobile Integration') ||
                    errorMsg?.includes('mobile integration') ||
                    errorMsg?.includes('mobile requests') ||
                    errorMsg?.includes('Mobile requests are not allowed') ||
                    errorCode === 'MOBILE_INTEGRATION_DISABLED' ||
                    errorMsg?.toLowerCase().includes('mobile')) {
                  errorCode = 'MOBILE_INTEGRATION_DISABLED';
                  errorMsg = 'Mobile Integration issue detected. Even if enabled, please check:\n' +
                             '1. Mobile Integration is ENABLED and SAVED in MSG91 dashboard\n' +
                             '2. Wait 1-2 minutes for settings to propagate\n' +
                             '3. Widget ID and Token ID match MSG91 dashboard exactly\n' +
                             '4. Widget status is ACTIVE\n' +
                             '5. IP Whitelisting is disabled or your IP is whitelisted';
                }
                
                const errorInfo = {
                  message: errorMsg,
                  code: errorCode,
                  type: error?.type || 'failure',
                  fullError: error,
                  config: {
                    widgetId: '${widgetId}',
                    tokenAuthLength: '${authToken}'.length,
                    identifier: '${normalizedIdentifier}'
                  }
                };
                console.error('MSG91 Widget: Error details:', errorInfo);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'failure',
                  error: errorInfo
                }));
              };
            console.log('MSG91 Widget: Calling initSendOTP with config:', {
              widgetId: config.widgetId,
              widgetIdLength: config.widgetId?.length,
              tokenAuth: config.tokenAuth ? config.tokenAuth.substring(0, 15) + '...' : 'MISSING',
              tokenAuthLength: config.tokenAuth?.length,
              tokenAuthFirst15: config.tokenAuth ? config.tokenAuth.substring(0, 15) : 'MISSING',
              identifier: config.identifier,
              identifierLength: config.identifier?.length,
              hasSuccessCallback: typeof config.success === 'function',
              hasFailureCallback: typeof config.failure === 'function',
            });
            console.log('MSG91 Widget: Verification checklist before calling initSendOTP:');
            console.log('  ✓ Widget ID: ${widgetId} (length: ${widgetId?.length})');
            console.log('  ✓ Token ID: ${authToken ? authToken.substring(0, 15) + "..." : "MISSING"} (length: ${authToken?.length})');
            console.log('  ✓ Identifier (phone): ${normalizedIdentifier} (length: ${normalizedIdentifier?.length})');
            console.log('  ⚠️  Verify in MSG91 Dashboard:');
            console.log('     1. Widget ID matches exactly (case-sensitive)');
            console.log('     2. Token ID matches exactly (case-sensitive)');
            console.log('     3. Mobile Integration is ENABLED and SAVED');
            console.log('     4. Widget status is ACTIVE');
            console.log('     5. IP Whitelisting is DISABLED or IP whitelisted');
            console.log('MSG91 Widget: FULL CONFIG being sent to initSendOTP:', JSON.stringify({
              widgetId: config.widgetId,
              identifier: config.identifier,
              tokenAuthLength: config.tokenAuth?.length,
              hasSuccessCallback: typeof config.success === 'function',
              hasFailureCallback: typeof config.failure === 'function'
            }));
            
            // Set timeout for widget initialization (6 seconds - reduced for faster feedback)
            // If widget doesn't respond within 6 seconds, assume it failed
            // This is shorter than the script loading timeout to catch initialization issues
            // Set timeout AFTER defining callbacks but BEFORE calling initSendOTP
            console.log('MSG91 Widget: Setting initialization timeout (6 seconds)...');
            const initStartTime = Date.now();
            initTimeout = setTimeout(function() {
              const elapsed = Date.now() - initStartTime;
              console.error('MSG91 Widget: Initialization timeout FIRED after', elapsed, 'ms');
              console.error('MSG91 Widget: Widget did not respond within 6 seconds');
              console.error('MSG91 Widget: This usually means Mobile Integration is not enabled or widget failed silently');
              console.error('MSG91 Widget: ReactNativeWebView available?', !!window.ReactNativeWebView);
              
              if (window.ReactNativeWebView) {
                const timeoutMessage = {
                  type: 'error',
                  error: {
                    message: 'Widget initialization timeout. The widget did not respond. This usually means:\n\n1. Mobile Integration is not enabled in MSG91 dashboard\n2. Widget credentials are incorrect\n3. Widget is disabled\n\nPlease check MSG91 dashboard settings.',
                    code: 'INIT_TIMEOUT',
                    details: 'Widget did not call success/failure callbacks within 6 seconds. Mobile Integration may not be enabled.'
                  }
                };
                console.error('MSG91 Widget: Sending timeout error message:', timeoutMessage);
                try {
                  window.ReactNativeWebView.postMessage(JSON.stringify(timeoutMessage));
                  console.log('MSG91 Widget: Timeout message sent successfully');
                } catch (postError) {
                  console.error('MSG91 Widget: Failed to send timeout message:', postError);
                }
              } else {
                console.error('MSG91 Widget: ReactNativeWebView not available, cannot send timeout message');
              }
            }, 6000);
            console.log('MSG91 Widget: Initialization timeout set, will fire in 6 seconds if no callback received');
            
            try {
              console.log('MSG91 Widget: About to call initSendOTP...');
              console.log('MSG91 Widget: Config object:', JSON.stringify({
                widgetId: config.widgetId,
                identifier: config.identifier,
                hasSuccessCallback: typeof config.success === 'function',
                hasFailureCallback: typeof config.failure === 'function',
                tokenAuthLength: config.tokenAuth?.length
              }));
              
              window.initSendOTP(config);
              console.log('MSG91 Widget: initSendOTP called successfully, waiting for response...');
              console.log('MSG91 Widget: Timeout will fire in 6 seconds if no callback is received');
              console.log('MSG91 Widget: If Mobile Integration is disabled, widget will fail silently and timeout will trigger');

              // Confirm to React Native that initSendOTP was invoked
              if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'init-called',
                  ts: Date.now(),
                  widgetId: '${widgetId}',
                  identifier: '${normalizedIdentifier}'
                }));
              }

              // Snapshot container contents after 3 seconds to surface silent widget errors
              setTimeout(function() {
                const container = document.getElementById('msg91-widget-container');
                if (container && window.ReactNativeWebView) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'container-snapshot',
                    ts: Date.now(),
                    innerText: container.innerText || '',
                    innerHTMLLength: container.innerHTML?.length || 0
                  }));
                }
              }, 3000);
            } catch (initError) {
              if (initTimeout) clearTimeout(initTimeout);
              console.error('MSG91 Widget: Exception calling initSendOTP:', initError);
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'error',
                error: {
                  message: initError?.message || initError?.toString() || 'Failed to initialize widget',
                  code: 'INIT_EXCEPTION',
                  fullError: initError,
                  config: {
                    widgetId: '${widgetId}',
                    tokenAuthLength: '${authToken}'.length
                  }
                }
              }));
            }
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
          // Check if we've exceeded max wait time
          const elapsedTime = Date.now() - startTime;
          if (elapsedTime > maxWaitTime) {
            console.error('MSG91 Widget: Exceeded maximum wait time of', maxWaitTime, 'ms');
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: {
                message: 'MSG91 widget script failed to load within ' + (maxWaitTime / 1000) + ' seconds. Please check your internet connection and try again.',
                code: 'SCRIPT_LOAD_TIMEOUT',
                details: 'Script URL: https://verify.msg91.com/otp-provider.js'
              }
            }));
            return;
          }
          
          // Retry if script not loaded yet
          retryCount++;
          console.log('MSG91 Widget: initSendOTP not found, retry', retryCount, 'of', maxRetries, '(elapsed:', elapsedTime, 'ms)');
          
          if (retryCount < maxRetries) {
            setTimeout(initWidget, retryDelay);
          } else {
            console.error('MSG91 Widget: Script failed to load after', maxRetries, 'retries');
            console.error('MSG91 Widget: Script URL: https://verify.msg91.com/otp-provider.js');
            console.error('MSG91 Widget: Check network tab for script loading errors');
            
            // Check if script tag exists
            const scriptTag = document.querySelector('script[src*="otp-provider.js"]');
            if (!scriptTag) {
              console.error('MSG91 Widget: Script tag not found in DOM');
            } else {
              console.log('MSG91 Widget: Script tag found, but initSendOTP not available');
            }
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'error',
              error: {
                message: 'MSG91 widget script failed to load after ' + maxRetries + ' retries. The script from https://verify.msg91.com/otp-provider.js may not be loading. Check network connectivity and try again.',
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
      console.log('[MSG91 Widget] Raw message data:', event.nativeEvent.data);
      
      // Mark that we received a response
      responseReceivedRef.current = true;
      
      // Clear the React Native-side timeout since we got a response
      if (nativeTimeoutRef.current) {
        clearTimeout(nativeTimeoutRef.current);
        nativeTimeoutRef.current = null;
      }
      
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
        
        // Provide user-friendly error messages based on error code
        let alertTitle = 'Widget Error';
        let alertMessage = `MSG91 Widget failed to load.\n\nError: ${errorMsg}`;
        let showBackendOption = true;
        
        if (message.error?.code === '401' || errorMsg?.includes('AuthenticationFailure') || errorMsg?.includes('401')) {
          alertTitle = 'Authentication Failed';
          alertMessage = 'MSG91 authentication failed (401).\n\nThis usually means:\n1. Widget ID or Auth Token is incorrect\n2. Credentials have expired\n3. Widget is disabled in MSG91 dashboard\n\nPlease verify credentials in MSG91 dashboard.';
        } else if (message.error?.code === 'SCRIPT_LOAD_FAILED' || message.error?.code === 'SCRIPT_LOAD_TIMEOUT' || message.error?.code === 'SCRIPT_LOAD_ERROR') {
          alertTitle = 'Script Loading Failed';
          alertMessage = 'MSG91 widget script failed to load.\n\nPossible causes:\n1. Internet connection issue\n2. MSG91 servers are down\n3. Network firewall blocking the script\n\nPlease check your internet connection and try again.';
        } else if (message.error?.code === '408' || errorMsg?.includes('IP Blocked')) {
          alertTitle = 'IP Address Blocked';
          alertMessage = 'Your IP address is blocked by MSG91.\n\nSolution:\n1. Go to MSG91 Dashboard → Settings → IP Whitelisting\n2. Either whitelist your IP address\n3. Or disable IP whitelisting for production use';
        } else if (message.error?.code === 'MOBILE_INTEGRATION_DISABLED' || errorMsg?.includes('Mobile Integration')) {
          alertTitle = 'Mobile Integration Disabled';
          alertMessage = 'Mobile Integration is not enabled for this widget.\n\nSolution:\n1. Go to MSG91 Dashboard → SendOTP → Widgets\n2. Select your widget\n3. Go to Settings\n4. Enable "Mobile Integration" option';
        } else if (message.error?.code === 'INIT_TIMEOUT' || message.error?.code === 'INIT_EXCEPTION') {
          alertTitle = 'Widget Initialization Failed';
          alertMessage = 'Widget failed to initialize within 6 seconds. This usually means:\n\n1. Mobile Integration is not enabled in MSG91 dashboard (MOST COMMON)\n2. Widget credentials are incorrect\n3. Widget is disabled in MSG91 dashboard\n\nSOLUTION:\n1. Go to MSG91 Dashboard → SendOTP → Widgets\n2. Select your widget (ID: ' + widgetId.substring(0, 12) + '...)\n3. Go to Settings\n4. Enable "Mobile Integration" option\n5. Save and try again';
        } else if (message.error?.code === 'INVALID_WIDGET_ID' || message.error?.code === 'INVALID_AUTH_TOKEN') {
          alertTitle = 'Configuration Error';
          alertMessage = 'Widget configuration is invalid.\n\nPlease check:\n1. Widget ID is correct in msg91.config.ts\n2. Auth Token is correct in msg91.config.ts\n3. Both are active in MSG91 dashboard';
          showBackendOption = false; // Configuration errors shouldn't use backend
        }
        
        CustomAlert.alert(
          alertTitle,
          alertMessage + (message.error?.code ? `\n\nError Code: ${message.error.code}` : ''),
          [
            {text: 'OK'},
            ...(showBackendOption ? [{
              text: 'Use Backend API',
              onPress: () => {
                onFailure(new Error(errorMsg));
                onClose();
              }
            }] : [])
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
  if (!WebViewAvailable || !WebView) {
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
                console.log('[MSG91 Widget] Injecting debug JavaScript with credentials:');
                console.log('[MSG91 Widget] - Widget ID:', widgetId);
                console.log('[MSG91 Widget] - Auth Token (first 15):', authToken ? authToken.substring(0, 15) : 'MISSING');
                console.log('[MSG91 Widget] - Identifier:', identifier);
                
                // Inject console.log to WebView for debugging
                webViewRef.current?.injectJavaScript(`
                  console.log('[WebView] JavaScript injected for debugging');
                  console.log('[WebView] Checking for initSendOTP:', typeof window.initSendOTP);
                  console.log('[WebView] Widget ID from React Native:', '${widgetId}');
                  console.log('[WebView] Auth Token length:', '${authToken}'.length);
                  console.log('[WebView] Auth Token (first 15 chars):', '${authToken}'.substring(0, 15));
                  console.log('[WebView] Identifier:', '${normalizedIdentifier}');
                  console.log('[WebView] All scripts on page:', Array.from(document.scripts).map(s => s.src));
                  console.log('[WebView] Window object keys (filtered):', Object.keys(window).filter(k => k.toLowerCase().includes('msg') || k.toLowerCase().includes('otp') || k.toLowerCase().includes('init')));
                  
                  // Check if initWidget function exists and has been called
                  setTimeout(function() {
                    console.log('[WebView] After 2 seconds - checking widget status...');
                    console.log('[WebView] initSendOTP type:', typeof window.initSendOTP);
                    const container = document.getElementById('msg91-widget-container');
                    console.log('[WebView] Container exists?', !!container);
                    if (container) {
                      console.log('[WebView] Container innerHTML length:', container.innerHTML.length);
                    }
                  }, 2000);
                  
                  true; // Required for injectedJavaScript
                `);
                // Keep loading state a bit longer to let widget initialize
                setTimeout(() => {
                  setLoading(false);
                }, 2000); // Reduced timeout - widget should load faster now
                
                // Auto-fallback after 12 seconds if widget doesn't load (matches maxWaitTime in script)
                setTimeout(() => {
                  if (loading) {
                    console.warn('[MSG91 Widget] Widget taking too long, showing fallback option');
                    setErrorMessage('Widget is taking longer than expected to load. You can use the backend API instead.');
                  }
                }, 12000);
              }}
              onLoadStart={() => {
                console.log('[MSG91 Widget] WebView started loading');
              }}
              onError={(syntheticEvent: any) => {
                const {nativeEvent} = syntheticEvent;
                console.error('[MSG91 Widget] WebView error:', nativeEvent);
                setLoading(false);
                
                // Handle different error types
                let errorMessage = 'WebView error occurred';
                if (nativeEvent.code === -2 || nativeEvent.description?.includes('net::ERR')) {
                  errorMessage = 'Network error: ' + (nativeEvent.description || 'Unable to connect to MSG91 servers');
                } else if (nativeEvent.description?.includes('ERR_CONNECTION')) {
                  errorMessage = 'Connection error: Unable to reach MSG91 servers. Please check your internet connection.';
                } else if (nativeEvent.description?.includes('ERR_NAME_NOT_RESOLVED')) {
                  errorMessage = 'DNS error: Unable to resolve MSG91 server address. Please check your internet connection.';
                } else if (nativeEvent.description) {
                  errorMessage = 'WebView error: ' + nativeEvent.description;
                }
                
                // Only call onFailure for critical errors that prevent widget from working
                if (nativeEvent.code === -2 || 
                    nativeEvent.description?.includes('net::ERR') || 
                    nativeEvent.description?.includes('ERR_CONNECTION') ||
                    nativeEvent.description?.includes('ERR_NAME_NOT_RESOLVED')) {
                  onFailure(new Error(errorMessage));
                } else {
                  // Non-critical errors - just show message but don't close
                  setErrorMessage(errorMessage);
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

