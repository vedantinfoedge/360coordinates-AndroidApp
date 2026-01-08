/**
 * MSG91 OTP Widget Configuration
 * 
 * Widget IDs and Auth Tokens for Email and SMS OTP verification
 * These are provided by MSG91 dashboard
 */
export const MSG91_CONFIG = {
  // Email Verification Widget ID
  EMAIL_WIDGET_ID: '356c6c657650333535343933',
  
  // Email Verification Auth Token
  EMAIL_AUTH_TOKEN: '481618TX6cdMp7Eg69414e7eP1',
  
  // SMS Widget ID (for Registration)
  SMS_WIDGET_ID: '356c7067734f373437333438',
  
  // SMS Auth Token (for Registration)
  SMS_AUTH_TOKEN: '481618TcNAx989nvQ69410832P1',
  
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
    
    // Initialize with SMS Widget (default, can be switched for email)
    OTPWidget.initializeWidget(
      MSG91_CONFIG.SMS_WIDGET_ID,
      {authToken: MSG91_CONFIG.SMS_AUTH_TOKEN}
    );
    
    currentWidgetId = MSG91_CONFIG.SMS_WIDGET_ID;
    currentAuthToken = MSG91_CONFIG.SMS_AUTH_TOKEN;
    
    console.log('MSG91 OTP Widget initialized successfully (SMS widget)');
    return true;
  } catch (error) {
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
      OTPWidget.initializeWidget(
        MSG91_CONFIG.EMAIL_WIDGET_ID,
        {authToken: MSG91_CONFIG.EMAIL_AUTH_TOKEN}
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
      OTPWidget.initializeWidget(
        MSG91_CONFIG.SMS_WIDGET_ID,
        {authToken: MSG91_CONFIG.SMS_AUTH_TOKEN}
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
      OTPWidget.initializeWidget(
        MSG91_CONFIG.FORGOT_PASSWORD_WIDGET_ID,
        {authToken: MSG91_CONFIG.FORGOT_PASSWORD_AUTH_TOKEN}
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

