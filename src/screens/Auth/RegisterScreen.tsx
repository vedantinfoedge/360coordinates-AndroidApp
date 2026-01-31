import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../../utils/alertHelper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useRoute, useFocusEffect} from '@react-navigation/native';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {colors, spacing} from '../../theme';
import {useAuth, UserRole} from '../../context/AuthContext';
import MSG91WebWidget from '../../components/auth/MSG91WebWidget';
import {otpService} from '../../services/otp.service';
import {switchToSMSWidget, initializeMSG91} from '../../config/msg91.config';

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'Register'
>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

const RegisterScreen: React.FC<Props> = ({navigation}) => {
  const {register} = useAuth();
  const route = useRoute();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneMsg91Token, setPhoneMsg91Token] = useState<string | null>(null);
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [phoneReqId, setPhoneReqId] = useState<string | null>(null);
  const [phoneMethod, setPhoneMethod] = useState<'msg91-sdk' | 'msg91-rest' | 'backend' | 'msg91-widget' | null>(null);
  const [verifiedOtp, setVerifiedOtp] = useState<string | null>(null);
  const [showMSG91Widget, setShowMSG91Widget] = useState(false);
  const [widgetPhoneIdentifier, setWidgetPhoneIdentifier] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(60)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const roleButtonAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const verifyButtonPulse = useRef(new Animated.Value(1)).current;

  // 360 Logo rotation interpolation
  const spin = logoRotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Run animations on mount
  useEffect(() => {
    // Logo entrance with 360 rotation
    Animated.parallel([
      // Scale up
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      // Fade in
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      // 360 degree rotation
      Animated.timing(logoRotation, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // After initial animation, start subtle continuous glow pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(logoGlow, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(logoGlow, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Header text fade in (delayed)
    setTimeout(() => {
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }, 500);

    // Card slide up animation (delayed)
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(cardTranslateY, {
          toValue: 0,
          tension: 50,
          friction: 9,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();

      // Staggered role button animations
      const staggerDelay = 100;
      roleButtonAnims.forEach((anim, index) => {
        setTimeout(() => {
          Animated.spring(anim, {
            toValue: 1,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          }).start();
        }, index * staggerDelay);
      });
    }, 600);

    // Pulse animation for verify button
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(verifyButtonPulse, {
          toValue: 1.05,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(verifyButtonPulse, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, []);

  // Handle return from OTP verification screen
  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as any;
      
      if (params?.name !== undefined) setName(params.name);
      if (params?.email !== undefined) setEmail(params.email);
      if (params?.phone !== undefined) {
        const rawPhone = String(params.phone ?? '');
        const digitsOnly = rawPhone.replace(/\D/g, '');
        let phoneToRestore = digitsOnly;
        if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
          phoneToRestore = digitsOnly.slice(2);
        } else if (digitsOnly.length > 10) {
          phoneToRestore = digitsOnly.slice(-10);
        }
        setPhone(phoneToRestore);
      }
      if (params?.selectedRole !== undefined) setSelectedRole(params.selectedRole);
      
      if (params?.phoneVerified === true) {
        setPhoneVerified(true);
        if (params.phoneToken) setPhoneToken(params.phoneToken);
        if (params.phoneMethod) setPhoneMethod(params.phoneMethod);
        if (params.verifiedOtp) setVerifiedOtp(params.verifiedOtp);
        navigation.setParams({
          phoneVerified: undefined,
          phoneToken: undefined,
          phoneMethod: undefined,
          verifiedOtp: undefined,
          phone: undefined,
          name: undefined,
          email: undefined,
          selectedRole: undefined,
        } as any);
      }
    }, [route.params, navigation])
  );

  const extractWidgetToken = (payload: any): string | null => {
    const candidates = [
      payload?.extractedToken, payload?.token, payload?.verificationToken,
      payload?.phoneVerificationToken, payload?.data?.token,
      payload?.data?.verificationToken, payload?.data?.phoneVerificationToken,
      payload?.message,
    ];
    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string') {
        try {
          const parsed = JSON.parse(candidate);
          const parsedToken = parsed?.token || parsed?.verificationToken || parsed?.message;
          if (parsedToken && typeof parsedToken === 'string') return parsedToken;
        } catch {
          return candidate;
        }
      }
    }
    return null;
  };

  const handleWidgetSuccess = (data: any) => {
    const token = extractWidgetToken(data);
    const reqIdFromWidget = data?.reqId || data?.requestId || data?.data?.reqId || token;

    if (!token) {
      CustomAlert.alert('Verification Error', 'Could not read verification token.');
      setPhoneVerified(false);
      setPhoneToken(null);
      setPhoneVerifying(false);
      setShowMSG91Widget(false);
      return;
    }

    const msg91PayloadForBackend = JSON.stringify({...data, extractedToken: token});
    setPhoneMsg91Token(msg91PayloadForBackend);
    setPhoneToken(token);
    setPhoneReqId(reqIdFromWidget || null);
    setPhoneMethod('msg91-widget');
    setPhoneVerified(true);
    setPhoneVerifying(false);
    setShowMSG91Widget(false);
  };

  const handleWidgetFailure = async (error: any) => {
    setShowMSG91Widget(false);
    setPhoneVerifying(false);
    setPhoneVerified(false);
    setPhoneMsg91Token(null);
    setPhoneToken(null);
    CustomAlert.alert('Verification Failed', error?.message || 'Please try again.');
  };

  const handleWidgetClose = () => {
    setShowMSG91Widget(false);
    setPhoneVerifying(false);
  };

  const handlePhoneVerify = async () => {
    if (!phone) {
      CustomAlert.alert('Error', 'Please enter your phone number first');
      return;
    }
    
    const digits = phone.replace(/\D/g, '');
    if (!(digits.length === 10 && /^[6-9]\d{9}$/.test(digits))) {
      CustomAlert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    const formattedPhoneForSDK = '91' + digits;
    const normalizedPhone = '+91' + digits;

    setPhoneVerifying(true);
    setPhoneVerified(false);
    setPhoneMsg91Token(null);
    setPhoneToken(null);
    setPhoneReqId(null);
    setPhoneMethod(null);

    try {
      const {OTPWidget} = require('@msg91comm/sendotp-react-native');
      
      try {
        await switchToSMSWidget();
      } catch {
        await initializeMSG91();
        await switchToSMSWidget();
      }
      
      const response = await OTPWidget.sendOTP({identifier: formattedPhoneForSDK});
      
      if (response && (response.success || response.status === 'success' || response.type === 'success')) {
        let reqId = response.reqId || response.requestId || response.data?.reqId || response.id;
        
        if (!reqId && response.message && /^[0-9a-fA-F]{20,32}$/.test(String(response.message).trim())) {
          reqId = response.message;
        }

        if (reqId) setPhoneReqId(reqId);
        setPhoneMethod('msg91-sdk');

        (navigation as any).navigate('OTPVerification', {
          phone: normalizedPhone,
          type: 'register',
          reqId: reqId,
          method: 'msg91-sdk',
          formData: {name, email, phone: normalizedPhone, selectedRole},
        });
      } else {
        throw new Error(response?.message || 'Failed to send OTP');
      }
    } catch (error: any) {
      CustomAlert.alert('Error', error?.message || 'Failed to send OTP.');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      CustomAlert.alert('Error', 'Please fill all fields');
      return;
    }
    if (!selectedRole) {
      CustomAlert.alert('Error', 'Please select a role');
      return;
    }
    if (!agreedToTerms) {
      CustomAlert.alert('Error', 'Please agree to Terms & Conditions');
      return;
    }
    if (password.length < 6) {
      CustomAlert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      CustomAlert.alert('Error', 'Passwords do not match');
      return;
    }
    if (!phoneVerified) {
      CustomAlert.alert('Error', 'Please verify your phone number');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      CustomAlert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      let phoneVerificationTokenToSend: string | undefined;
      let phoneOtpToSend: string | undefined;
      let phoneVerificationMethodToSend: string | undefined;
      let phoneVerifiedFlagToSend: boolean | undefined;

      if ((phoneMethod === 'msg91-widget' || phoneMethod === 'msg91-sdk') && phoneMsg91Token) {
        phoneVerificationTokenToSend = phoneMsg91Token;
      } else if (phoneMethod === 'backend' && verifiedOtp) {
        phoneOtpToSend = verifiedOtp;
      } else if (phoneToken) {
        phoneVerificationTokenToSend = phoneToken;
      }

      if (!phoneVerificationTokenToSend && !phoneOtpToSend) {
        CustomAlert.alert('Error', 'Phone verification details missing. Please verify again.');
        setIsLoading(false);
        return;
      }

      const phoneDigits = phone.replace(/\D/g, '');
      const formattedPhone = phoneDigits.length === 10 ? '+91' + phoneDigits : '+91' + phoneDigits.slice(-10);

      const response = await register(
        name, email, formattedPhone, password, selectedRole,
        undefined, phoneVerificationTokenToSend, phoneOtpToSend,
        phoneVerificationMethodToSend, phoneVerifiedFlagToSend,
      );
      
      if (response?.success) {
        if (response.data?.token && response.data?.user) {
          // Set the dashboard preference based on selected role
          const dashboardMap: Record<string, string> = {
            'buyer': 'buyer',
            'seller': 'seller',
            'agent': 'agent',
          };
          const targetDashboard = dashboardMap[selectedRole] || 'buyer';
          
          // Save both immediate target and persistent preference
          await AsyncStorage.setItem('@target_dashboard', targetDashboard);
          await AsyncStorage.setItem('@user_dashboard_preference', targetDashboard);
          
          CustomAlert.alert('Success', `Welcome, ${name}!`, [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to the selected role's dashboard
                const parentNav = navigation.getParent();
                if (selectedRole === 'seller') {
                  (parentNav as any)?.reset({
                    index: 0,
                    routes: [{name: 'Seller'}],
                  });
                } else if (selectedRole === 'agent') {
                  (parentNav as any)?.reset({
                    index: 0,
                    routes: [{name: 'Agent'}],
                  });
                } else {
                  // Buyer - go to MainTabs
                  (parentNav as any)?.reset({
                    index: 0,
                    routes: [{name: 'MainTabs'}],
                  });
                }
              },
            },
          ]);
        } else if (response.data?.user_id) {
          const formattedPhoneForNav = '91' + phone.replace(/\D/g, '').slice(-10);
          (navigation as any).navigate('OTPVerification', {
            userId: response.data.user_id,
            phone: formattedPhoneForNav,
            email, type: 'register',
            reqId: phoneReqId || undefined,
            method: phoneMethod || undefined,
            formData: {
              name,
              email,
              phone: formattedPhoneForNav,
              selectedRole: selectedRole, // Pass the selected role for navigation after OTP
            },
          });
        }
      }
    } catch (error: any) {
      CustomAlert.alert('Error', error.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {value: 'buyer' as UserRole, label: 'Buyer/Tenant', icon: '👤'},
    {value: 'seller' as UserRole, label: 'Seller/Owner', icon: '🏠'},
    {value: 'agent' as UserRole, label: 'Agent/Builder', icon: '🏢'},
  ];

  const getRoleLabel = (role: UserRole | null) => {
    if (!role) return 'User';
    switch (role) {
      case 'buyer': return 'Buyer/Tenant';
      case 'seller': return 'Seller/Owner';
      case 'agent': return 'Agent/Builder';
    }
  };

  const completedFields = [selectedRole, name, email, phone, phoneVerified, password, confirmPassword, agreedToTerms].filter(Boolean).length;

  // Animate progress bar when fields change
  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: (completedFields / 8) * 100,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [completedFields]);

  // Button press animation
  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <MSG91WebWidget
        visible={showMSG91Widget}
        onClose={handleWidgetClose}
        identifier={widgetPhoneIdentifier}
        widgetType="sms"
        onSuccess={handleWidgetSuccess}
        onFailure={handleWidgetFailure}
      />
      <View style={styles.container}>
        {/* Fixed Header with 360 logo animation */}
        <View style={styles.fixedHeader}>
          <Animated.View style={{
            transform: [
              {scale: logoScale},
              {rotate: spin}, // 360-degree rotation
            ],
            opacity: logoOpacity,
          }}>
            <Animated.View style={{
              shadowColor: colors.primary,
              shadowOffset: {width: 0, height: 0},
              shadowOpacity: logoGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [0.3, 0.8],
              }),
              shadowRadius: logoGlow.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 20],
              }),
              elevation: 8,
              borderRadius: 35,
            }}>
              <Image
                source={require('../../assets/App-icon.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
          </Animated.View>
          <Animated.Text style={[styles.appName, {opacity: headerOpacity, transform: [{translateY: headerOpacity.interpolate({
            inputRange: [0, 1],
            outputRange: [15, 0],
          })}]}]}>
            360Coordinates
          </Animated.Text>
          <Animated.View style={[styles.progressBarContainer, {opacity: headerOpacity}]}>
            <View style={styles.progressBar}>
              <Animated.View style={[styles.progressFill, {width: progressWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              })}]} />
            </View>
            <Text style={styles.progressText}>{completedFields}/8 fields completed</Text>
          </Animated.View>
        </View>

        {/* Scrollable Form */}
        <KeyboardAvoidingView
          style={styles.formContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            
            <Animated.View style={[styles.card, {
              opacity: cardOpacity,
              transform: [{translateY: cardTranslateY}],
            }]}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join us to get started</Text>

              {/* Role Selection with staggered animation */}
              <View style={styles.roleContainer}>
                {roles.map((role, index) => (
                  <Animated.View
                    key={role.value}
                    style={{
                      flex: 1,
                      opacity: roleButtonAnims[index],
                      transform: [{
                        scale: roleButtonAnims[index].interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        }),
                      }],
                    }}>
                    <TouchableOpacity
                      style={[
                        styles.roleButton,
                        selectedRole === role.value && styles.roleButtonSelected,
                      ]}
                      onPress={() => setSelectedRole(role.value)}
                      activeOpacity={0.7}>
                      <Text style={styles.roleIcon}>{role.icon}</Text>
                      <Text style={[
                        styles.roleButtonText,
                        selectedRole === role.value && styles.roleButtonTextSelected,
                      ]}>
                        {role.label}
                      </Text>
                      {selectedRole === role.value && <Text style={styles.selectedCheck}>✓</Text>}
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              {/* Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email Address</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Phone Input */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Phone Number</Text>
                  {phoneVerified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
                </View>
                <View style={styles.phoneRow}>
                  <View style={styles.phoneInputContainer}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.phoneInput}
                      placeholder="10-digit number"
                      placeholderTextColor={colors.textSecondary}
                      value={phone}
                      onChangeText={(text: string) => {
                        setPhone(text);
                        setPhoneVerified(false);
                        setPhoneToken(null);
                      }}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                  <Animated.View style={{
                    transform: [{scale: !phoneVerified && phone ? verifyButtonPulse : 1}],
                  }}>
                    <TouchableOpacity
                      style={[
                        styles.verifyButton,
                        phoneVerified && styles.verifyButtonVerified,
                      ]}
                      onPress={handlePhoneVerify}
                      disabled={!phone || phoneVerifying || phoneVerified}
                      activeOpacity={0.8}>
                      {phoneVerifying ? (
                        <ActivityIndicator size="small" color={colors.surface} />
                      ) : phoneVerified ? (
                        <Text style={styles.verifyButtonText}>✓</Text>
                      ) : (
                        <Text style={styles.verifyButtonText}>Verify</Text>
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Min 6 characters"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                    <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                  {confirmPassword && password === confirmPassword && (
                    <Text style={styles.matchIcon}>✓</Text>
                  )}
                </View>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}>
                <View style={[styles.termsCheckbox, agreedToTerms && styles.termsCheckboxChecked]}>
                  {agreedToTerms && <Text style={styles.termsCheckmark}>✓</Text>}
                </View>
                <Text style={styles.termsText}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms & Conditions</Text>
                  {' '}and{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Register Button with animation */}
              <Animated.View style={{transform: [{scale: buttonScale}]}}>
                <TouchableOpacity
                  style={[
                    styles.registerButton,
                    (!selectedRole || isLoading || !agreedToTerms) && styles.registerButtonDisabled,
                  ]}
                  onPress={handleRegister}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={isLoading || !selectedRole || !agreedToTerms}
                  activeOpacity={0.9}>
                  <Text style={styles.registerButtonText}>
                    {isLoading ? 'Creating Account...' : `Register as ${getRoleLabel(selectedRole)}`}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => (navigation as any).navigate('Login')}>
                  <Text style={styles.loginLink}>Login now</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  fixedHeader: {
    backgroundColor: '#FAFAFA',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 119, 192, 0.1)',
  },
  logoImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: spacing.xs,
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  progressBarContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  roleButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.sm,
    alignItems: 'center',
    position: 'relative',
  },
  roleButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.accent,
  },
  roleIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  roleButtonText: {
    fontSize: 9,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleButtonTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  selectedCheck: {
    position: 'absolute',
    top: 2,
    right: 4,
    fontSize: 10,
    color: colors.primary,
    fontWeight: 'bold',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  verifiedBadge: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
  },
  countryCode: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  phoneInput: {
    flex: 1,
    padding: spacing.md,
    paddingLeft: 0,
    fontSize: 16,
    color: colors.text,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    minWidth: 80,
    alignItems: 'center',
  },
  verifyButtonVerified: {
    backgroundColor: colors.success,
  },
  verifyButtonText: {
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: spacing.sm,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  eyeIcon: {
    fontSize: 18,
    padding: spacing.xs,
  },
  matchIcon: {
    fontSize: 16,
    color: colors.success,
    marginRight: spacing.xs,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  termsCheckbox: {
    width: 22,
    height: 22,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginTop: 2,
  },
  termsCheckboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsCheckmark: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 20,
  },
  termsLink: {
    color: colors.primary,
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  registerButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  registerButtonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default RegisterScreen;
