import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradientLib from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import CustomAlert from '../../utils/alertHelper';
import {authColors, authFonts} from './authDesignTheme';
import MSG91WebWidget from '../../components/auth/MSG91WebWidget';
import {switchToForgotPasswordWidget, initializeMSG91} from '../../config/msg91.config';

const LinearGradient = LinearGradientLib as React.ComponentType<any>;

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'ForgotPassword'
>;

type Props = {
  navigation: ForgotPasswordScreenNavigationProp;
};

const ForgotPasswordScreen: React.FC<Props> = ({navigation}) => {
  const insets = useSafeAreaInsets();
  const [phone, setPhone] = useState('');
  const [sendingOTP, setSendingOTP] = useState(false);
  const [showMSG91Widget, setShowMSG91Widget] = useState(false);

  const handleSendOTPSDK = async () => {
    if (!phone) {
      CustomAlert.alert('Error', 'Please enter your phone number');
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (!(digits.length === 10 && /^[6-9]\d{9}$/.test(digits))) {
      CustomAlert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    const formattedPhoneForSDK = '91' + digits;
    const normalizedPhone = '+91' + digits;

    setSendingOTP(true);
    try {
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');

      try {
        await switchToForgotPasswordWidget();
      } catch {
        await initializeMSG91();
        await switchToForgotPasswordWidget();
      }

      const response = await OTPWidget.sendOTP({identifier: formattedPhoneForSDK});

      if (response && (response.success || response.status === 'success' || response.type === 'success')) {
        let reqId = response.reqId || response.requestId || response.data?.reqId || response.id;
        if (!reqId && response.message) {
          const msg = String(response.message).trim();
          if (/^[0-9a-fA-F]{20,32}$/.test(msg)) reqId = msg;
        }

        (navigation as any).navigate('OTPVerification', {
          phone: normalizedPhone,
          type: 'forgotPassword',
          reqId,
          method: 'msg91-sdk',
        });
      } else {
        throw new Error(response?.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      CustomAlert.alert('Error', error?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setSendingOTP(false);
    }
  };

  const handleOpenWidget = () => {
    if (!phone) {
      CustomAlert.alert('Error', 'Please enter your phone number first');
      return;
    }

    const digits = phone.replace(/\D/g, '');
    if (!(digits.length === 10 && /^[6-9]\d{9}$/.test(digits))) {
      CustomAlert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setShowMSG91Widget(true);
  };

  const handleWidgetSuccess = (data: any) => {
    const token = data?.token || data?.data?.token || data?.data?.verificationToken || data?.verificationToken ||
      data?.data?.message || data?.message;
    const reqId = data?.reqId || data?.requestId || data?.data?.reqId;

    if (!token) {
      CustomAlert.alert('Verification Error', 'Could not read verification token.');
      setShowMSG91Widget(false);
      return;
    }

    const digits = phone.replace(/\D/g, '');
    const normalizedPhone = digits.startsWith('91') ? '+' + digits : '+91' + digits;

    setShowMSG91Widget(false);
    (navigation as any).navigate('OTPVerification', {
      phone: normalizedPhone,
      type: 'forgotPassword',
      reqId: reqId || token,
      method: 'msg91-widget',
      formData: {phone: normalizedPhone},
    });
  };

  const handleWidgetFailure = (error: any) => {
    setShowMSG91Widget(false);
    CustomAlert.alert('Verification Failed', error?.message || 'Please try again.');
  };

  const handleWidgetClose = () => {
    setShowMSG91Widget(false);
  };

  return (
    <>
      <MSG91WebWidget
        visible={showMSG91Widget}
        onClose={handleWidgetClose}
        identifier={phone.startsWith('+') ? phone : '+91' + phone.replace(/\D/g, '')}
        widgetType="forgotPassword"
        onSuccess={handleWidgetSuccess}
        onFailure={handleWidgetFailure}
      />
      <View style={[styles.container, {paddingTop: insets.top}]}>
        <LinearGradient
          colors={[...authColors.backgroundGradient]}
          style={StyleSheet.absoluteFill}
          start={{x: 0.5, y: 0}}
          end={{x: 0.5, y: 1}}
        />
        <View style={styles.orbContainer} pointerEvents="none">
          <View style={[styles.orb, styles.orb1]} />
          <View style={[styles.orb, styles.orb2]} />
          <View style={[styles.orb, styles.orb3]} />
        </View>
        <View style={styles.gridOverlay} pointerEvents="none" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardView}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.card}>
              <Text style={styles.title}>Forgot Password</Text>
              <Text style={styles.subtitle}>
                Enter your registered phone number. We&apos;ll send you an OTP to reset your password.
              </Text>

              <View style={styles.field}>
                <Text style={styles.fieldLbl}>PHONE NUMBER</Text>
                <View style={styles.phoneRow}>
                  <View style={styles.phonePrefix}>
                    <Text style={styles.phonePrefixText}>🇮🇳 +91</Text>
                  </View>
                  <View style={[styles.inpWrap, styles.phoneInpWrap]}>
                    <TextInput
                      style={styles.inp}
                      placeholder="10-digit number"
                      placeholderTextColor={authColors.textPlaceholder}
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.ctaBtn, (!phone || sendingOTP) && styles.ctaBtnDisabled]}
                onPress={handleSendOTPSDK}
                disabled={!phone || sendingOTP}
                activeOpacity={0.9}>
                <LinearGradient
                  colors={sendingOTP ? ['#5a6a7a', '#4a5a6a'] : [...authColors.ctaGradient]}
                  style={StyleSheet.absoluteFill}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                />
                <Text style={styles.ctaBtnText}>
                  {sendingOTP ? 'Sending OTP...' : 'Send OTP'}
                </Text>
                {sendingOTP && (
                  <ActivityIndicator size="small" color={authColors.textWhite} style={styles.btnLoader} />
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.widgetLink} onPress={handleOpenWidget}>
                <Text style={styles.widgetLinkText}>Or verify via MSG91 widget</Text>
              </TouchableOpacity>

              <View style={styles.cardFoot}>
                <Text style={styles.cardFootText}>Remember your password? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.cardFootLink}>Back to Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: authColors.background,
  },
  orbContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 9999,
    opacity: 0.15,
  },
  orb1: {
    width: 230,
    height: 230,
    backgroundColor: authColors.orb1,
    top: -70,
    left: -70,
  },
  orb2: {
    width: 190,
    height: 190,
    backgroundColor: authColors.orb2,
    bottom: 140,
    right: -60,
  },
  orb3: {
    width: 130,
    height: 130,
    backgroundColor: authColors.orb3,
    top: 230,
    right: 0,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: authColors.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: authColors.cardBorder,
    padding: 24,
  },
  title: {
    fontFamily: authFonts.heading,
    fontSize: 24,
    color: authColors.textWhite,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: authFonts.body,
    fontSize: 14,
    color: authColors.textMuted,
    marginBottom: 24,
    lineHeight: 20,
  },
  field: {
    marginBottom: 20,
  },
  fieldLbl: {
    fontFamily: authFonts.sectionLabel,
    fontSize: 12,
    color: authColors.textMuted,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phonePrefix: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    backgroundColor: authColors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: authColors.inputBorder,
  },
  phonePrefixText: {
    fontFamily: authFonts.body,
    fontSize: 15,
    color: authColors.textWhite,
  },
  inpWrap: {
    flex: 1,
    backgroundColor: authColors.inputBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: authColors.inputBorder,
  },
  phoneInpWrap: {
    flex: 1,
  },
  inp: {
    fontFamily: authFonts.body,
    fontSize: 15,
    color: authColors.textWhite,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaBtnText: {
    fontFamily: authFonts.button,
    fontSize: 16,
    color: authColors.textWhite,
  },
  btnLoader: {
    marginLeft: 8,
  },
  widgetLink: {
    marginTop: 16,
    alignItems: 'center',
  },
  widgetLinkText: {
    fontFamily: authFonts.link,
    fontSize: 13,
    color: authColors.blueAccent,
  },
  cardFoot: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 24,
    gap: 4,
  },
  cardFootText: {
    fontFamily: authFonts.body,
    fontSize: 14,
    color: authColors.textMuted,
  },
  cardFootLink: {
    fontFamily: authFonts.link,
    fontSize: 14,
    color: authColors.blueAccent,
  },
});

export default ForgotPasswordScreen;
