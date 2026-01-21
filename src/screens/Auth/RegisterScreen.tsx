import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ImageBackground,
  Image,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import CustomAlert from '../../utils/alertHelper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth, UserRole} from '../../context/AuthContext';
import {otpService} from '../../services/otp.service';
import MSG91WebWidget from '../../components/auth/MSG91WebWidget';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

type RegisterScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Register'
>;

type Props = {
  navigation: RegisterScreenNavigationProp;
};

const RegisterScreen: React.FC<Props> = ({navigation}) => {
  const {register} = useAuth();
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
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [showPhoneWidget, setShowPhoneWidget] = useState(false);

  // Animation values
  const building1Anim = useRef(new Animated.Value(0)).current;
  const building2Anim = useRef(new Animated.Value(0)).current;
  const building3Anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Continuous building animations
    const animateBuildings = () => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(building1Anim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(building1Anim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(1000),
            Animated.timing(building2Anim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(building2Anim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
        ),
        Animated.loop(
          Animated.sequence([
            Animated.delay(2000),
            Animated.timing(building3Anim, {
              toValue: 1,
              duration: 3000,
              useNativeDriver: true,
            }),
            Animated.timing(building3Anim, {
              toValue: 0,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
        ),
      ]).start();
    };

    animateBuildings();
  }, []);

  // Email is automatically accepted (no verification needed)

  const handlePhoneVerify = async () => {
    if (!phone) {
      CustomAlert.alert('Error', 'Please enter your phone number first');
      return;
    }
    
    // Format phone number (matching website workflow)
    // Website accepts: 10 digits (starts with 6-9) or 12 digits (starts with 91)
    // Format: 91XXXXXXXXXX (country code + number, no + sign)
    const digits = phone.replace(/\D/g, '');
    
    let formattedPhone = '';
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      formattedPhone = '91' + digits; // Add country code
    } else if (digits.length === 12 && digits.startsWith('91')) {
      formattedPhone = digits; // Already formatted
    } else {
      CustomAlert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    
    // PRIMARY: Try native MSG91 SDK first (faster, more reliable, no WebView issues)
    setPhoneVerifying(true);
    try {
      const response = await otpService.sendSMS(formattedPhone, 'register');
      
      if (response.success) {
        setPhoneVerified(true);
        
        // Extract token from response (comprehensive token extraction)
        const token = response.token || 
                     response.data?.token || 
                     response.data?.verificationToken ||
                     response.verificationToken ||
                     response.data?.phoneVerificationToken ||
                     response.message; // Sometimes token is in message field
        
        if (token) {
          setPhoneToken(token);
          console.log('[Register] Phone verification token stored:', token);
        }
        
        if (response.reqId) {
          console.log('[Register] OTP Request ID:', response.reqId);
        }
        
        CustomAlert.alert('Success', 'Verification SMS sent! Please check your phone and enter the OTP when prompted.');
        setPhoneVerifying(false);
        return; // Success - exit early
      } else {
        // Native SDK failed, fallback to WebView widget
        console.warn('[Register] Native SDK failed, falling back to WebView widget:', response.message);
        setPhoneVerifying(false);
        setShowPhoneWidget(true);
        return;
      }
    } catch (error: any) {
      // Native SDK error - check if it's a recoverable error
      console.warn('[Register] Native SDK error, checking if WebView fallback is needed:', error);
      
      // Check for specific errors that should NOT use WebView fallback
      const nonRecoverableErrors = [
        'Invalid phone number',
        'Please enter a valid',
      ];
      
      const isNonRecoverable = nonRecoverableErrors.some(msg => 
        error?.message?.includes(msg)
      );
      
      if (isNonRecoverable) {
        setPhoneVerifying(false);
        CustomAlert.alert('Error', error?.message || 'Invalid phone number. Please check and try again.');
        return;
      }
      
      // For other errors (401, network, etc.), try WebView widget as fallback
      console.log('[Register] Attempting WebView widget fallback');
      setPhoneVerifying(false);
      setShowPhoneWidget(true);
    }
  };

  // Handle widget success (comprehensive token extraction)
  const handlePhoneWidgetSuccess = async (data: any) => {
    console.log('[Register] MSG91 Widget success:', data);
    setPhoneVerifying(false);
    setShowPhoneWidget(false);
    
    // Comprehensive token extraction from widget response
    // MSG91 can return tokens in various formats
    let token = data?.token || 
                data?.verificationToken || 
                data?.phoneVerificationToken ||
                data?.data?.token ||
                data?.data?.verificationToken ||
                data?.data?.phoneVerificationToken ||
                data?.message; // Sometimes token is in message field
    
    // If message is a JSON string, try parsing it
    if (!token && data?.message && typeof data.message === 'string') {
      try {
        const parsed = JSON.parse(data.message);
        token = parsed?.token || 
                parsed?.verificationToken || 
                parsed?.phoneVerificationToken ||
                parsed?.message;
      } catch (e) {
        // Not JSON, might be token itself
        if (data.message.length > 20 && data.message.length < 200) {
          token = data.message;
        }
      }
    }
    
    if (token) {
      setPhoneToken(token);
      console.log('[Register] Phone verification token stored from widget:', token);
    } else {
      console.warn('[Register] No token found in widget response, but verification succeeded');
    }
    
    setPhoneVerified(true);
    CustomAlert.alert('Success', 'Phone number verified successfully!');
  };

  // Handle widget failure - show user-friendly error (native SDK already tried)
  const handlePhoneWidgetFailure = async (error: any) => {
    console.warn('[Register] MSG91 Widget failed:', error);
    setShowPhoneWidget(false);
    setPhoneVerifying(false);
    
    // Extract error details
    const errorCode = error?.code || error?.error?.code;
    const errorMessage = error?.message || error?.error?.message || 'Widget verification failed';
    
    // Provide specific error messages based on error code
    let userMessage = 'Failed to verify phone number. ';
    let actionMessage = '';
    
    if (errorCode === '401' || errorMessage?.includes('AuthenticationFailure') || errorMessage?.includes('401')) {
      userMessage = 'Authentication failed. ';
      actionMessage = 'Please verify MSG91 credentials in the dashboard.';
    } else if (errorCode === 'SCRIPT_LOAD_FAILED' || errorMessage?.includes('script failed to load')) {
      userMessage = 'Widget failed to load. ';
      actionMessage = 'Please check your internet connection and try again.';
    } else if (errorCode === 'INVALID_WIDGET_ID' || errorCode === 'INVALID_AUTH_TOKEN') {
      userMessage = 'Widget configuration error. ';
      actionMessage = 'Please check MSG91 widget credentials.';
    } else if (errorMessage?.includes('IP Blocked') || errorCode === '408') {
      userMessage = 'IP address blocked. ';
      actionMessage = 'Please whitelist your IP in MSG91 dashboard or disable IP whitelisting.';
    } else if (errorMessage?.includes('Mobile Integration not enabled')) {
      userMessage = 'Mobile integration not enabled. ';
      actionMessage = 'Please enable Mobile Integration in MSG91 dashboard widget settings.';
    } else {
      actionMessage = 'Please try again or contact support.';
    }
    
    CustomAlert.alert(
      'Verification Failed',
      userMessage + actionMessage + '\n\nNote: The native SDK was already attempted. If this issue persists, please contact support.',
      [
        {text: 'OK'},
        {
          text: 'Retry',
          onPress: () => {
            // Retry with native SDK (skip widget this time)
            const digits = phone.replace(/\D/g, '');
            let formattedPhone = '';
            if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
              formattedPhone = '91' + digits;
            } else if (digits.length === 12 && digits.startsWith('91')) {
              formattedPhone = digits;
            }
            
            if (formattedPhone) {
              setPhoneVerifying(true);
              otpService.sendSMS(formattedPhone, 'register', true) // skipMSG91 = true to use backend API
                .then((response) => {
                  if (response.success) {
                    setPhoneVerified(true);
                    const token = response.token || response.data?.token || response.data?.verificationToken;
                    if (token) setPhoneToken(token);
                    CustomAlert.alert('Success', 'Verification SMS sent via backend API!');
                  } else {
                    CustomAlert.alert('Error', response.message || 'Failed to send OTP');
                  }
                })
                .catch((err) => {
                  CustomAlert.alert('Error', err?.message || 'Failed to send OTP. Please try again later.');
                })
                .finally(() => {
                  setPhoneVerifying(false);
                });
            }
          }
        }
      ]
    );
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

    if (password !== confirmPassword) {
      CustomAlert.alert('Error', 'Passwords do not match');
      return;
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
      CustomAlert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      CustomAlert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Check if phone is verified (email is automatically accepted)
    if (!phoneVerified) {
      CustomAlert.alert('Error', 'Please verify your phone number before registering');
      return;
    }

    setIsLoading(true);
    try {
      // Extract actual token from MSG91 response (matching website workflow)
      // Website handles JSON format tokens
      let actualPhoneToken = phoneToken;
      if (phoneToken) {
        try {
          const parsed = typeof phoneToken === 'string' 
            ? JSON.parse(phoneToken) 
            : phoneToken;
          
          // Website extracts: parsed.message || parsed.token || parsed.verificationToken || original
          actualPhoneToken = parsed?.message || 
                             parsed?.token || 
                             parsed?.verificationToken || 
                             phoneToken;
        } catch (e) {
          // Not JSON, use as-is
          actualPhoneToken = phoneToken;
        }
      }
      
      // Format phone for registration (matching website: +91XXXXXXXXXX)
      const phoneDigits = phone.replace(/\D/g, '');
      let formattedPhoneForRegistration = '';
      if (phoneDigits.length === 10) {
        formattedPhoneForRegistration = '+91' + phoneDigits;
      } else if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
        formattedPhoneForRegistration = '+' + phoneDigits;
      } else {
        formattedPhoneForRegistration = '+91' + phoneDigits.slice(-10); // Fallback
      }
      
      const response = await register(
        name,
        email,
        formattedPhoneForRegistration,
        password,
        selectedRole,
        undefined, // No email token needed (email auto-verified)
        actualPhoneToken || undefined,
      );
      
      // Handle registration response (matching website workflow)
      if (response && response.success) {
        // Check if auto-login happened (token and user in response)
        if (response.data?.token && response.data?.user) {
          // Auto-login successful - navigate to dashboard (AppNavigator will handle routing)
          CustomAlert.alert(
            'Success',
            `Registration successful! Welcome, ${name}!`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigation will be handled automatically by AppNavigator
                  // based on user type from AuthContext
                },
              },
            ],
          );
        } else if (response.data?.user_id) {
          // Legacy flow: OTP verification required
        navigation.navigate('OTPVerification', {
          userId: response.data.user_id,
          user_id: response.data.user_id, // Support both formats
          phone: phone.replace(/[^0-9]/g, ''),
          email: email,
          type: 'register',
        });
        }
      }
    } catch (error: any) {
      CustomAlert.alert('Error', error.message || 'Registration failed');
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
      case 'buyer':
        return 'Buyer/Tenant';
      case 'seller':
        return 'Seller/Owner';
      case 'agent':
        return 'Agent/Builder';
    }
  };

  // Building animation transforms
  const building1TranslateY = building1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const building2TranslateY = building2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -15],
  });

  const building3TranslateY = building3Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -25],
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      {/* Background with gradient pattern */}
      <ImageBackground
        source={require('../../assets/browserlogo.png')}
        style={styles.backgroundImage}
        imageStyle={styles.backgroundImageStyle}
        resizeMode="cover">
        {/* Black Overlay */}
        <View style={styles.overlay} />

        {/* Animated Buildings */}
        <View style={styles.animationContainer}>
          <Animated.View
            style={[
              styles.building,
              styles.building1,
              {transform: [{translateY: building1TranslateY}]},
            ]}>
            <Text style={styles.buildingEmoji}>🏢</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.building,
              styles.building2,
              {transform: [{translateY: building2TranslateY}]},
            ]}>
            <Text style={styles.buildingEmoji}>🏗️</Text>
          </Animated.View>
          <Animated.View
            style={[
              styles.building,
              styles.building3,
              {transform: [{translateY: building3TranslateY}]},
            ]}>
            <Text style={styles.buildingEmoji}>🏠</Text>
          </Animated.View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}>
          {/* Transparent Card */}
          <View style={styles.card}>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/browserlogo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Sign up to get started</Text>
            </View>

            {/* Role Selection - Square boxes with minimal radius */}
            <View style={styles.roleContainer}>
              {roles.map(role => (
                <TouchableOpacity
                  key={role.value}
                  style={[
                    styles.roleButton,
                    selectedRole === role.value && styles.roleButtonSelected,
                  ]}
                  onPress={() => setSelectedRole(role.value)}
                  activeOpacity={0.7}>
                  <View style={styles.roleButtonInner}>
                    <Text style={styles.roleIcon}>{role.icon}</Text>
                    <Text
                      style={[
                        styles.roleButtonText,
                        selectedRole === role.value &&
                          styles.roleButtonTextSelected,
                      ]}
                      numberOfLines={2}>
                      {role.label}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                Select your role to access the appropriate dashboard
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
              {/* Full Name Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>

              {/* Email Input (No verification needed) */}
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
                />
              </View>

              {/* Phone Input with Verify Button */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                <Text style={styles.label}>Phone Number</Text>
                  {phoneVerified && (
                    <Text style={styles.verifiedBadge}>✓ Verified</Text>
                  )}
                </View>
                <View style={styles.inputWithButton}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your 10-digit phone number"
                  placeholderTextColor={colors.textSecondary}
                  value={phone}
                    onChangeText={(text) => {
                      setPhone(text);
                      setPhoneVerified(false);
                      setPhoneToken(null);
                    }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
                  <TouchableOpacity
                    style={[
                      styles.verifyButton,
                      phoneVerified && styles.verifyButtonVerified,
                    ]}
                    onPress={handlePhoneVerify}
                    disabled={!phone || phoneVerifying || phoneVerified}>
                    {phoneVerifying ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : phoneVerified ? (
                      <Text style={styles.verifyButtonText}>✓</Text>
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your password"
                    placeholderTextColor={colors.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.eyeIcon}>
                      {showPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
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
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }>
                    <Text style={styles.eyeIcon}>
                      {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity
                style={[
                  styles.registerButton,
                  !selectedRole && styles.registerButtonDisabled,
                ]}
                onPress={handleRegister}
                disabled={isLoading || !selectedRole}>
                <Text style={styles.registerButtonText}>
                  {isLoading
                    ? 'Creating account...'
                    : `Register as ${getRoleLabel(selectedRole)}`}
                </Text>
              </TouchableOpacity>

              {/* Login Link */}
              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={styles.loginLink}>Login now</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </ImageBackground>

      {/* MSG91 Phone Verification Widget */}
      {showPhoneWidget && phone && (
        <MSG91WebWidget
          visible={showPhoneWidget}
          onClose={() => {
            setShowPhoneWidget(false);
            setPhoneVerifying(false);
          }}
        identifier={(() => {
            const digits = phone.replace(/\D/g, '');
            if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
              return '91' + digits;
            } else if (digits.length === 12 && digits.startsWith('91')) {
              return digits;
            }
            // Fallback: return empty string to avoid invalid identifier error
            return '';
          })()}
          widgetType="sms"
          onSuccess={handlePhoneWidgetSuccess}
          onFailure={handlePhoneWidgetFailure}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  backgroundImageStyle: {
    opacity: 0.15,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  animationContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    zIndex: 0,
  },
  building: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  building1: {
    marginLeft: SCREEN_WIDTH * 0.1,
  },
  building2: {
    marginLeft: SCREEN_WIDTH * 0.05,
  },
  building3: {
    marginRight: SCREEN_WIDTH * 0.1,
  },
  buildingEmoji: {
    fontSize: 80,
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoImage: {
    width: 150,
    height: 50,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    ...typography.h1,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  roleButton: {
    flex: 1,
    borderRadius: 8, // Minimal radius for square boxes
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  roleButtonSelected: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    elevation: 4,
  },
  roleButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.xs,
    minHeight: 40,
  },
  roleIcon: {
    fontSize: 18,
  },
  roleButtonText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  roleButtonTextSelected: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: 'rgba(247, 247, 247, 0.9)',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    flex: 1,
  },
  form: {
    marginTop: spacing.md,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  verifiedBadge: {
    ...typography.caption,
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
  },
  inputWithButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    borderWidth: 2,
    borderColor: colors.border,
  },
  verifyButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
  },
  verifyButtonVerified: {
    backgroundColor: colors.success,
  },
  verifyButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 14,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  eyeButton: {
    padding: spacing.md,
  },
  eyeIcon: {
    fontSize: 20,
  },
  registerButton: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.cta,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: colors.disabled,
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  registerButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  loginLink: {
    ...typography.body,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default RegisterScreen;
