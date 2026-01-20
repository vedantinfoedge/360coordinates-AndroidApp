/**
 * MSG91 OTP Widget Configuration
 * 
 * Widget IDs and Auth Tokens for Email and SMS OTP verification
 * These are provided by MSG91 dashboard
 * 
 * VERIFIED CREDENTIALS (Updated):
 * - SMS Widget ID: 356c7067734f373437333438 ✓
 * - SMS Auth Token (Token ID): 481618TcNAx989nvQ69410832P1 ✓
 * - SMS Auth Key (API Key): 481618A2cCSUpaZHTW6936c356P1 (for backend API)
 * - SMS Template ID: 356c6c6c4141303836323334 (for backend API)
 * 
 * NOTE: The widget uses tokenAuth parameter which should be the Auth Token (Token ID).
 * If widget still fails, try using SMS_AUTH_KEY instead of SMS_AUTH_TOKEN in MSG91WebWidget.tsx
 * 
 * FORMAT REQUIREMENTS:
 * - Widget ID: Should be a hex string (usually 24 characters)
 * - Auth Token: Should start with numbers and contain alphanumeric characters
 * - Phone number format: Should be 91XXXXXXXXXX (no + sign, 12 digits total)
 * 
 * IMPORTANT: MOBILE INTEGRATION MUST BE ENABLED
 * - Go to MSG91 Dashboard → OTP → Your Widget → Settings
 * - Enable "Mobile Integration" option
 * - Without this, you'll get error: "Mobile requests are not allowed for this widget"
 * 
 * IMPORTANT: IP WHITELISTING
 * - If you get "IPBlocked" error (code 408), your IP is blocked
 * - Go to MSG91 Dashboard → Settings → IP Whitelisting
 * - Either whitelist your IP address OR disable IP whitelisting
 * - For production apps, disable IP whitelisting to allow all users
 * 
 * TROUBLESHOOTING:
 * If widget fails, check:
 * 1. ✅ Mobile Integration is ENABLED in widget settings (REQUIRED for React Native)
 * 2. ✅ IP Whitelisting is DISABLED or your IP is whitelisted (to avoid IPBlocked errors)
 * 3. Widget ID and Auth Token are correct in MSG91 dashboard
 * 4. Widget is active/enabled in MSG91 dashboard
 * 5. Check browser console logs for detailed error messages
 * 6. Try using Auth Key instead of Auth Token (uncomment line 59 in MSG91WebWidget.tsx)
 */
export const MSG91_CONFIG = {
  // Email Verification Widget ID
  EMAIL_WIDGET_ID: '356c6c657650333535343933',
  
  // Email Verification Auth Token
  EMAIL_AUTH_TOKEN: '481618TX6cdMp7Eg69414e7eP1',
  
  // SMS Widget ID (for Registration)
  SMS_WIDGET_ID: '356c7067734f373437333438',
  
  // SMS Auth Token (Token ID) - Used for widget initialization
  SMS_AUTH_TOKEN: '481618TcNAx989nvQ69410832P1',
  
  // SMS Auth Key (API Key) - Used for backend API calls
  SMS_AUTH_KEY: '481618A2cCSUpaZHTW6936c356P1',
  
  // SMS Template ID - Used for backend API calls
  SMS_TEMPLATE_ID: '356c6c6c4141303836323334',
  
  // Forgot Password SMS Widget ID
  FORGOT_PASSWORD_WIDGET_ID: '356c686b6c57353338333631',
  
  // Forgot Password SMS Auth Token
  FORGOT_PASSWORD_AUTH_TOKEN: '481618TsNUr9hYEGR694e174cP1',
};

// Store current widget context for dynamic switching
let currentWidgetId: string | null = null;
let currentAuthToken: string | null = null;

/**
 * Initialize MSG91 OTP Widget
 * Call this in App.tsx on app startup
 * Initializes with SMS widget by default (can be switched dynamically)
 */
export const initializeMSG91 = async () => {
  try {
    const {OTPWidget} = require('@msg91comm/sendotp-react-native');
    
    // Enhanced logging for 401 error debugging
    console.log('[MSG91] Initializing widget:', {
      widgetId: MSG91_CONFIG.SMS_WIDGET_ID,
      authToken: MSG91_CONFIG.SMS_AUTH_TOKEN ? `${MSG91_CONFIG.SMS_AUTH_TOKEN.substring(0, 10)}...` : 'MISSING',
      widgetIdLength: MSG91_CONFIG.SMS_WIDGET_ID?.length,
      authTokenLength: MSG91_CONFIG.SMS_AUTH_TOKEN?.length,
    });
    
    // Initialize with SMS Widget (default, can be switched for email)
    // FIX: Pass tokenAuth as string, not object (per MSG91 SDK docs)
    OTPWidget.initializeWidget(
      MSG91_CONFIG.SMS_WIDGET_ID,
      MSG91_CONFIG.SMS_AUTH_TOKEN
    );
    
    currentWidgetId = MSG91_CONFIG.SMS_WIDGET_ID;
    currentAuthToken = MSG91_CONFIG.SMS_AUTH_TOKEN;
    
    console.log('[MSG91] Widget initialized successfully (SMS widget)');
    return true;
  } catch (error: any) {
    console.error('[MSG91] Initialization failed:', {
      error: error?.message || error,
      widgetId: MSG91_CONFIG.SMS_WIDGET_ID,
      authTokenLength: MSG91_CONFIG.SMS_AUTH_TOKEN?.length,
      errorDetails: JSON.stringify(error, null, 2),
    });
    console.warn('MSG91 OTP Widget not available (app will continue without MSG91):', error);
    return false;
  }
};

/**
 * Switch MSG91 Widget for Email OTP
 * Reinitializes widget with email widget ID
 */
export const switchToEmailWidget = async () => {
  try {
    const {OTPWidget} = require('@msg91comm/sendotp-react-native');
    
    if (currentWidgetId !== MSG91_CONFIG.EMAIL_WIDGET_ID) {
      // FIX: Pass tokenAuth as string, not object (per MSG91 SDK docs)
      OTPWidget.initializeWidget(
        MSG91_CONFIG.EMAIL_WIDGET_ID,
        MSG91_CONFIG.EMAIL_AUTH_TOKEN
      );
      
      currentWidgetId = MSG91_CONFIG.EMAIL_WIDGET_ID;
      currentAuthToken = MSG91_CONFIG.EMAIL_AUTH_TOKEN;
      
      console.log('MSG91 Widget switched to Email widget');
    }
    return true;
  } catch (error) {
    console.warn('Failed to switch to Email widget:', error);
    return false;
  }
};

/**
 * Switch MSG91 Widget for SMS OTP (Registration)
 * Reinitializes widget with SMS widget ID
 */
export const switchToSMSWidget = async () => {
  try {
    const {OTPWidget} = require('@msg91comm/sendotp-react-native');
    
    if (currentWidgetId !== MSG91_CONFIG.SMS_WIDGET_ID) {
      // FIX: Pass tokenAuth as string, not object (per MSG91 SDK docs)
      OTPWidget.initializeWidget(
        MSG91_CONFIG.SMS_WIDGET_ID,
        MSG91_CONFIG.SMS_AUTH_TOKEN
      );
      
      currentWidgetId = MSG91_CONFIG.SMS_WIDGET_ID;
      currentAuthToken = MSG91_CONFIG.SMS_AUTH_TOKEN;
      
      console.log('MSG91 Widget switched to SMS widget (Registration)');
    }
    return true;
  } catch (error) {
    console.warn('Failed to switch to SMS widget:', error);
    return false;
  }
};

/**
 * Switch MSG91 Widget for Forgot Password SMS OTP
 * Reinitializes widget with forgot password widget ID
 */
export const switchToForgotPasswordWidget = async () => {
  try {
    const {OTPWidget} = require('@msg91comm/sendotp-react-native');
    
    if (currentWidgetId !== MSG91_CONFIG.FORGOT_PASSWORD_WIDGET_ID) {
      // FIX: Pass tokenAuth as string, not object (per MSG91 SDK docs)
      OTPWidget.initializeWidget(
        MSG91_CONFIG.FORGOT_PASSWORD_WIDGET_ID,
        MSG91_CONFIG.FORGOT_PASSWORD_AUTH_TOKEN
      );
      
      currentWidgetId = MSG91_CONFIG.FORGOT_PASSWORD_WIDGET_ID;
      currentAuthToken = MSG91_CONFIG.FORGOT_PASSWORD_AUTH_TOKEN;
      
      console.log('MSG91 Widget switched to Forgot Password widget');
    }
    return true;
  } catch (error) {
    console.warn('Failed to switch to Forgot Password widget:', error);
    return false;
  }
};

