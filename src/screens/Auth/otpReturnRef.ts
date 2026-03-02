/**
 * Shared ref for passing OTP verification result from OTPVerificationScreen
 * back to RegisterScreen without using navigation params. This avoids
 * route param updates and setParams() which can cause blinking on Android.
 */
export interface OtpReturnPayload {
  phoneVerified: true;
  phoneToken?: string | null;
  phoneMethod?: 'msg91-sdk' | 'msg91-rest' | 'msg91-widget' | 'msg91' | 'backend' | null;
  verifiedOtp?: string | null;
  phoneMsg91Token?: string | null;
  /** Form data to restore (optional; Register may already have it if screen wasn't unmounted) */
  name?: string;
  email?: string;
  phone?: string;
  selectedRole?: 'buyer' | 'seller' | 'agent' | null;
}

export const otpReturnRef: { current: OtpReturnPayload | null } = { current: null };
