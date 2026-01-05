import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {colors, typography, spacing, borderRadius} from '../../theme';
import Button from '../../components/common/Button';
import OTPInput from '../../components/auth/OTPInput';

type OTPVerificationScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'OTPVerification'
>;

type RouteParams = {
  phone?: string;
  email?: string;
  type?: 'register' | 'forgotPassword';
};

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

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
    // Auto-verify when 6 digits entered
    handleVerify();
  };

  const handleVerify = () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter the complete OTP');
      return;
    }

    // TODO: Verify OTP with backend
    Alert.alert('Success', 'OTP verified successfully');
    
    if (params.type === 'forgotPassword') {
      navigation.navigate('ResetPassword', {otp} as never);
    } else {
      // Navigate to home after registration
      navigation.navigate('Login' as never);
    }
  };

  const handleResendOTP = () => {
    // TODO: Resend OTP
    setTimer(60);
    setCanResend(false);
    setOtp('');
    Alert.alert('Success', 'OTP sent successfully');
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
          title="Verify"
          onPress={handleVerify}
          disabled={otp.length !== 6}
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

