import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import CustomAlert from '../../utils/alertHelper';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {colors, typography, spacing, borderRadius} from '../../theme';
import Button from '../../components/common/Button';
import OTPInput from '../../components/auth/OTPInput';
import {authService} from '../../services/auth.service';
import {otpService} from '../../services/otp.service';
import {useAuth} from '../../context/AuthContext';

type OTPVerificationScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'OTPVerification'
>;

type RouteParams = {
  userId?: number;
  user_id?: number;
  phone?: string;
  email?: string;
  type?: 'register' | 'forgotPassword';
  reqId?: string;
  method?: 'msg91-rest' | 'backend';
};

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;
  const {verifyOTP, resendOTP} = useAuth();

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Log OTP verification screen details when component mounts
  useEffect(() => {
    console.log('[OTP Verification] Screen loaded:', {
      type: params.type,
      phone: params.phone,
      email: params.email,
      reqId: params.reqId,
      method: params.method,
      userId: params.userId,
    });
    
    if (params.phone) {
      console.log('[OTP Verification] SMS OTP verification:', {
        phone: params.phone,
        method: params.method || 'unknown',
        reqId: params.reqId || 'not provided',
        context: params.type === 'forgotPassword' ? 'forgotPassword' : 'register',
      });
    } else if (params.email) {
      console.log('[OTP Verification] Email OTP verification:', {
        email: params.email,
        method: params.method || 'unknown',
        reqId: params.reqId || 'not provided',
      });
    }
  }, []);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleOTPComplete = (value: string) => {
    setOtp(value);
    // Auto-verify when OTP digits entered (4 digits for MSG91, with small delay for better UX)
    setTimeout(() => {
      handleVerify();
    }, 300);
  };

  const handleVerify = async () => {
    // MSG91 sends 4-digit OTPs, but accept 4-6 digits for flexibility
    if (otp.length < 4 || otp.length > 6) {
      CustomAlert.alert('Error', 'Please enter the complete OTP');
      return;
    }

    const userId = params.userId || params.user_id;
    const isRegistrationFlow = params.type === 'register' || !params.type;
    
    // For registration flow, userId is optional (will be created during registration)
    // For login/forgot password flows, userId is required
    if (!userId && !isRegistrationFlow) {
      CustomAlert.alert('Error', 'User ID not found. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      // If email is provided, try MSG91 email OTP verification first
      if (params.email) {
        try {
          const emailVerifyResponse = await otpService.verifyEmail(params.email, otp);
          if (emailVerifyResponse.success) {
            // Email OTP verified via MSG91, now verify with backend
            await verifyOTP(userId, otp, params.phone);
            
            // Success - navigation handled by AppNavigator
            if (params.type === 'forgotPassword') {
              navigation.navigate('ResetPassword', {otp} as never);
            } else {
              CustomAlert.alert(
                'Success',
                'Email OTP verified successfully! You are now logged in.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigation handled automatically by AppNavigator
                    },
                  },
                ],
              );
            }
            return;
          }
        } catch (emailError: any) {
          // MSG91 verification failed, fall back to backend verification
          console.warn('[OTP] MSG91 email verification failed, using backend:', emailError);
        }
      }
      
      // If phone is provided, try MSG91 SMS OTP verification FIRST
      if (params.phone) {
        try {
          // Format phone number consistently (12 digits: 91XXXXXXXXXX)
          // Accept both 91XXXXXXXXXX and 10-digit formats
          let phoneNumber = params.phone.replace(/^\+/, ''); // Remove + if present
          if (phoneNumber.length === 10) {
            phoneNumber = `91${phoneNumber}`; // Convert 10 digits to 91XXXXXXXXXX
          } else if (!phoneNumber.startsWith('91')) {
            phoneNumber = `91${phoneNumber.slice(-10)}`; // Take last 10 digits and add 91
          }
          
          // Determine context: 'forgotPassword' or 'register' (default)
          const context = params.type === 'forgotPassword' ? 'forgotPassword' : 'register';
          
          // Use reqId and method from params if available
          // Priority: msg91-sdk (requires reqId) > backend fallback
          const reqId = params.reqId;
          let method = params.method as 'msg91-sdk' | 'msg91-rest' | 'backend' | undefined;
          
          // If method is not provided but reqId exists, assume msg91-sdk (SDK approach)
          if (!method && reqId) {
            method = 'msg91-sdk';
            console.log('[OTP Verification] Method not provided, inferring msg91-sdk from reqId');
          }
          
          console.log('[OTP Verification] Verifying SMS OTP via MSG91:', {
            phone: phoneNumber,
            originalPhone: params.phone,
            context,
            reqId: reqId ? `${reqId.substring(0, 15)}...` : 'not provided',
            method: method || 'auto-detect (will try MSG91 SDK, then backend)',
            otpLength: otp.length,
            otpValue: otp, // Log OTP for debugging (remove in production if needed)
          });
          
          const smsVerifyResponse = await otpService.verifySMS(phoneNumber, otp, reqId, context, method);
          
          console.log('[OTP Verification] MSG91 SMS verification response:', {
            success: smsVerifyResponse.success,
            method: smsVerifyResponse.method,
            message: smsVerifyResponse.message,
          });
          
          if (smsVerifyResponse.success) {
            // SMS OTP verified via MSG91
            console.log('[OTP Verification] MSG91 verification successful');
            
            // Extract token from verification response (if available)
            // The verifySMS function now returns token directly if SDK verification succeeds
            const verificationToken = smsVerifyResponse.token ||
                                   smsVerifyResponse.data?.token || 
                                   smsVerifyResponse.data?.verificationToken ||
                                   smsVerifyResponse.reqId; // Use reqId as token fallback
            
            // For registration flow, mark phone as verified and go back to registration
            if (isRegistrationFlow) {
              console.log('[OTP Verification] Registration flow - phone verified, returning to registration');
              console.log('[OTP Verification] Verification token:', verificationToken ? `${verificationToken.substring(0, 20)}...` : 'not provided');
              
              // Pass verification result back via navigation params
              // RegisterScreen will use useFocusEffect to detect this
              navigation.navigate('Register', {
                phoneVerified: true,
                phoneToken: verificationToken || params.reqId, // Use reqId as token if no token in response
                phoneMethod: smsVerifyResponse.method || params.method,
              } as any);
              
              CustomAlert.alert(
                'Success',
                'Phone number verified successfully! You can now complete registration.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigation already handled above
                    },
                  },
                ],
              );
              return;
            }
            
            // For login/forgot password flows, verify with backend
            if (userId) {
              console.log('[OTP Verification] Verifying with backend for authentication...');
              await verifyOTP(userId, otp, params.phone);
              
              // Success - navigation handled by AppNavigator
              if (params.type === 'forgotPassword') {
                navigation.navigate('ResetPassword', {otp} as never);
              } else {
                CustomAlert.alert(
                  'Success',
                  'SMS OTP verified successfully! You are now logged in.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigation handled automatically by AppNavigator
                      },
                    },
                  ],
                );
              }
              return;
            } else {
              throw new Error('User ID required for login/forgot password flow');
            }
          } else {
            console.error('[OTP Verification] MSG91 verification returned failure:', smsVerifyResponse.message);
            throw new Error(smsVerifyResponse.message || 'MSG91 verification failed');
          }
        } catch (smsError: any) {
          // MSG91 verification failed, fall back to backend verification
          console.error('[OTP Verification] MSG91 SMS verification failed:', {
            error: smsError.message || smsError,
            phone: params.phone,
            method: params.method,
            willTryBackend: true,
          });
          // Continue to backend fallback below
        }
      }
      
      // Default: Use verifyOTP from AuthContext (fallback to backend)
      // Only if userId is available (not registration flow)
      if (userId && !isRegistrationFlow) {
        await verifyOTP(userId, otp, params.phone);
        
        // If we reach here, verification was successful and user is logged in
        // For forgot password flow, navigate to reset password
        if (params.type === 'forgotPassword') {
          navigation.navigate('ResetPassword', {otp} as never);
        } else {
          // For login flow, show success and navigation will be handled by AppNavigator
          CustomAlert.alert(
            'Success',
            'OTP verified successfully! You are now logged in.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigation will be handled automatically by AppNavigator
                  // when user state changes
                },
              },
            ],
          );
        }
      } else if (isRegistrationFlow) {
        // For registration flow without userId, just mark as verified and go back
        console.log('[OTP Verification] Registration flow - phone verified via backend fallback');
        CustomAlert.alert(
          'Success',
          'Phone number verified successfully! You can now complete registration.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
              },
            },
          ],
        );
      } else {
        throw new Error('User ID required for verification');
      }
    } catch (error: any) {
      console.error('[OTP Verification] Verification error:', {
        error: error.message || error,
        errorStack: error.stack,
        originalError: error.originalError,
        backendError: error.backendError,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      // Show user-friendly error message
      let errorMessage = 'Invalid OTP. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.originalError?.message) {
        errorMessage = error.originalError.message;
      }
      
      CustomAlert.alert('Error', errorMessage);
      setOtp(''); // Clear OTP on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const userId = params.userId || params.user_id;
    const isRegistrationFlow = params.type === 'register' || !params.type;
    
    // For registration flow, userId is optional (resend doesn't need userId)
    // For login/forgot password flows, userId is required
    if (!userId && !isRegistrationFlow) {
      CustomAlert.alert('Error', 'User ID not found. Please try again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // If email is provided, try MSG91 email OTP resend first
      if (params.email) {
        try {
          const emailResendResponse = await otpService.resendEmail(params.email);
          if (emailResendResponse.success) {
            setTimer(60);
            setCanResend(false);
            setOtp('');
            CustomAlert.alert('Success', 'New email OTP sent successfully!');
            return;
          }
        } catch (emailError: any) {
          // MSG91 resend failed, fall back to backend
          console.warn('[OTP] MSG91 email resend failed, using backend:', emailError);
        }
      }
      
      // If phone is provided, try MSG91 SMS OTP resend
      if (params.phone) {
        try {
          // Format phone number consistently (12 digits: 91XXXXXXXXXX)
          let phoneNumber = params.phone.replace(/^\+/, ''); // Remove + if present
          if (phoneNumber.length === 10) {
            phoneNumber = `91${phoneNumber}`; // Convert 10 digits to 91XXXXXXXXXX
          } else if (!phoneNumber.startsWith('91')) {
            phoneNumber = `91${phoneNumber.slice(-10)}`; // Take last 10 digits and add 91
          }
          
          // Determine context: 'forgotPassword' or 'register' (default)
          const context = params.type === 'forgotPassword' ? 'forgotPassword' : 'register';
          
          console.log(`[OTP Verification] Resending SMS OTP:`, {
            phone: phoneNumber,
            context: context,
            originalPhone: params.phone,
            method: params.method || 'unknown',
          });
          
          const smsResendResponse = await otpService.resendSMS(phoneNumber, context);
          
          console.log(`[OTP Verification] Resend SMS response:`, {
            success: smsResendResponse.success,
            method: smsResendResponse.method,
            reqId: smsResendResponse.reqId,
            message: smsResendResponse.message,
          });
          
          if (smsResendResponse.success) {
            setTimer(60);
            setCanResend(false);
            setOtp('');
            CustomAlert.alert('Success', 'New SMS OTP sent successfully!');
            return;
          } else {
            console.warn(`[OTP Verification] Resend SMS failed:`, smsResendResponse.message);
          }
        } catch (smsError: any) {
          // MSG91 resend failed, fall back to backend
          console.error('[OTP Verification] MSG91 SMS resend failed, using backend:', {
            error: smsError.message || smsError,
            phone: params.phone,
            context: params.type === 'forgotPassword' ? 'forgotPassword' : 'register',
          });
        }
      }
      
      // Default: Use backend resend (fallback) - only if userId available
      if (userId && !isRegistrationFlow) {
        await resendOTP(userId, params.phone);
      }
      // For registration flow, resend already handled by MSG91 above
      setTimer(60);
      setCanResend(false);
      setOtp('');
      CustomAlert.alert('Success', 'New OTP sent successfully!');
    } catch (error: any) {
      CustomAlert.alert('Error', error?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    // Handle both 10-digit and 12-digit (91XXXXXXXXXX) formats
    let phoneNum = phone.replace(/^\+/, ''); // Remove + if present
    if (phoneNum.length === 12 && phoneNum.startsWith('91')) {
      // Format 91XXXXXXXXXX to +91-XXXXX-XXXXX
      return `+91-${phoneNum.slice(2, 7)}-${phoneNum.slice(7)}`;
    } else if (phoneNum.length === 10) {
      // Format 10 digits to +91-XXXXX-XXXXX
      return `+91-${phoneNum.slice(0, 5)}-${phoneNum.slice(5)}`;
    }
    return phone;
  };

  const displayValue = params.phone ? formatPhone(params.phone) : params.email || '';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📱</Text>
        </View>
        <Text style={styles.title}>Verification Code</Text>
        <Text style={styles.subtitle}>
          We sent a code to {displayValue}
        </Text>

        <View style={styles.otpContainer}>
          <OTPInput
            length={4}
            value={otp}
            onChange={setOtp}
            onComplete={handleOTPComplete}
          />
        </View>

        <View style={styles.resendContainer}>
          {timer > 0 ? (
            <Text style={styles.timerText}>
              Resend OTP in {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleResendOTP}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        <Button
          title={isLoading ? 'Verifying...' : 'Verify'}
          onPress={handleVerify}
          disabled={otp.length < 4 || otp.length > 6 || isLoading}
          loading={isLoading}
          fullWidth
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  otpContainer: {
    marginVertical: spacing.xl,
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  timerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  resendText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default OTPVerificationScreen;

