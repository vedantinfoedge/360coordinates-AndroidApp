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
    // Auto-verify when 6 digits entered (with small delay for better UX)
    setTimeout(() => {
      handleVerify();
    }, 300);
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      CustomAlert.alert('Error', 'Please enter the complete OTP');
      return;
    }

    const userId = params.userId || params.user_id;
    if (!userId) {
      CustomAlert.alert('Error', 'User ID not found. Please try registering again.');
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
      
      // If phone is provided, try MSG91 SMS OTP verification
      if (params.phone) {
        try {
          const phoneNumber = params.phone.startsWith('+') ? params.phone : `+91${params.phone}`;
          // Determine context: 'forgotPassword' or 'register' (default)
          const context = params.type === 'forgotPassword' ? 'forgotPassword' : 'register';
          // Use reqId and method from params if available (for widget verification)
          const reqId = params.reqId;
          const method = params.method || (reqId ? 'widget' : undefined);
          console.log('[OTP] Verifying SMS OTP:', {
            phone: phoneNumber,
            context,
            reqId: reqId ? `${reqId.substring(0, 10)}...` : 'not provided',
            method: method || 'auto-detect',
          });
          const smsVerifyResponse = await otpService.verifySMS(phoneNumber, otp, reqId, context, method);
          if (smsVerifyResponse.success) {
            // SMS OTP verified via MSG91, now verify with backend
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
          }
        } catch (smsError: any) {
          // MSG91 verification failed, fall back to backend verification
          console.warn('[OTP] MSG91 SMS verification failed, using backend:', smsError);
        }
      }
      
      // Default: Use verifyOTP from AuthContext (fallback to backend)
      // This handles login automatically
      await verifyOTP(userId, otp, params.phone);
      
      // If we reach here, verification was successful and user is logged in
      // For forgot password flow, navigate to reset password
      if (params.type === 'forgotPassword') {
        navigation.navigate('ResetPassword', {otp} as never);
      } else {
        // For registration, show success and navigation will be handled by AppNavigator
        // The user state change will trigger navigation in AppNavigator
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
    } catch (error: any) {
      CustomAlert.alert('Error', error?.message || 'Invalid OTP. Please try again.');
      setOtp(''); // Clear OTP on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const userId = params.userId || params.user_id;
    if (!userId) {
      CustomAlert.alert('Error', 'User ID not found. Please try registering again.');
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
          const phoneNumber = params.phone.startsWith('+') ? params.phone : `+91${params.phone}`;
          // Determine context: 'forgotPassword' or 'register' (default)
          const context = params.type === 'forgotPassword' ? 'forgotPassword' : 'register';
          const smsResendResponse = await otpService.resendSMS(phoneNumber, context);
          if (smsResendResponse.success) {
            setTimer(60);
            setCanResend(false);
            setOtp('');
            CustomAlert.alert('Success', 'New SMS OTP sent successfully!');
            return;
          }
        } catch (smsError: any) {
          // MSG91 resend failed, fall back to backend
          console.warn('[OTP] MSG91 SMS resend failed, using backend:', smsError);
        }
      }
      
      // Default: Use backend resend (fallback)
      await resendOTP(userId, params.phone);
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
    if (phone.length === 10) {
      return `+91-${phone.slice(0, 5)}-${phone.slice(5)}`;
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
          disabled={otp.length !== 6 || isLoading}
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

