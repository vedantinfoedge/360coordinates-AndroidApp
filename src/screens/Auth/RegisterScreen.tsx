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
import {useRoute} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth, UserRole} from '../../context/AuthContext';
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
  const [phoneToken, setPhoneToken] = useState<string | null>(null);
  const [phoneReqId, setPhoneReqId] = useState<string | null>(null);
  const [phoneMethod, setPhoneMethod] = useState<'msg91-sdk' | 'msg91-rest' | 'backend' | 'msg91-widget' | null>(null);
  const [showMSG91Widget, setShowMSG91Widget] = useState(false);
  const [widgetPhoneIdentifier, setWidgetPhoneIdentifier] = useState('');

  // Handle return from OTP verification screen
  useEffect(() => {
    const params = route.params as any;
    if (params?.phoneVerified === true) {
      console.log('[Register] Phone verified via OTP verification screen');
      setPhoneVerified(true);
      if (params.phoneToken) {
        setPhoneToken(params.phoneToken);
      }
      if (params.phoneMethod) {
        setPhoneMethod(params.phoneMethod);
      }
      // Clear params to avoid re-triggering
      navigation.setParams({phoneVerified: undefined, phoneToken: undefined, phoneMethod: undefined} as any);
    }
  }, [route.params, navigation]);

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

  const extractWidgetToken = (payload: any): string | null => {
    const candidates = [
      payload?.extractedToken,
      payload?.token,
      payload?.verificationToken,
      payload?.phoneVerificationToken,
      payload?.data?.token,
      payload?.data?.verificationToken,
      payload?.data?.phoneVerificationToken,
      payload?.message,
    ];

    for (const candidate of candidates) {
      if (candidate && typeof candidate === 'string') {
        try {
          const parsed = JSON.parse(candidate);
          const parsedToken =
            parsed?.token ||
            parsed?.verificationToken ||
            parsed?.phoneVerificationToken ||
            parsed?.message;
          if (parsedToken && typeof parsedToken === 'string') {
            return parsedToken;
          }
        } catch {
          return candidate;
        }
      } else if (candidate && typeof candidate === 'object') {
        const nested =
          candidate?.token ||
          candidate?.verificationToken ||
          candidate?.phoneVerificationToken ||
          candidate?.message;
        if (nested && typeof nested === 'string') {
          return nested;
        }
      }
    }

    return null;
  };

  const handleWidgetSuccess = (data: any) => {
    const token = extractWidgetToken(data);
    const reqIdFromWidget =
      data?.reqId ||
      data?.requestId ||
      data?.data?.reqId ||
      data?.data?.requestId ||
      token;

    console.log('[Register] MSG91 widget success payload:', {
      tokenPreview: token ? `${token.substring(0, 12)}...` : 'missing',
      reqId: reqIdFromWidget,
    });

    setPhoneToken(token || null);
    setPhoneReqId(reqIdFromWidget || null);
    setPhoneMethod('msg91-widget');
    setPhoneVerified(true);
    setPhoneVerifying(false);

    CustomAlert.alert(
      'Verified',
      'Phone verified via MSG91 widget. You can continue with registration.',
    );
  };

  const handleWidgetFailure = (error: any) => {
    const message =
      error?.message ||
      error?.error?.message ||
      error?.error ||
      (typeof error === 'string' ? error : 'Verification failed. Please try again.');

    console.error('[Register] MSG91 widget failure:', error);
    setPhoneVerified(false);
    setPhoneVerifying(false);
    setPhoneToken(null);
    setPhoneReqId(null);
    setPhoneMethod(null);
    setShowMSG91Widget(false);

    CustomAlert.alert('Verification Failed', message);
  };

  const handleWidgetClose = () => {
    setShowMSG91Widget(false);
    setPhoneVerifying(false);
  };

  const handlePhoneVerify = () => {
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

    console.log('[Register] Opening MSG91 widget for phone verification:', {
      identifier: formattedPhone,
      length: formattedPhone.length,
    });

    // Reset previous verification state and show widget
    setPhoneVerified(false);
    setPhoneToken(null);
    setPhoneReqId(null);
    setPhoneMethod('msg91-widget');

    setWidgetPhoneIdentifier(formattedPhone);
    setShowMSG91Widget(true);
    setPhoneVerifying(true);
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

    // Validate password length (minimum 6 characters)
    if (password.length < 6) {
      CustomAlert.alert('Error', 'Password must be at least 6 characters long');
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
          // Format phone for navigation (12 digits: 91XXXXXXXXXX)
          const phoneDigits = phone.replace(/\D/g, '');
          let formattedPhoneForNav = '';
          if (phoneDigits.length === 10) {
            formattedPhoneForNav = '91' + phoneDigits;
          } else if (phoneDigits.length === 12 && phoneDigits.startsWith('91')) {
            formattedPhoneForNav = phoneDigits;
          } else {
            formattedPhoneForNav = '91' + phoneDigits.slice(-10);
          }
          
          navigation.navigate('OTPVerification', {
            userId: response.data.user_id,
            user_id: response.data.user_id, // Support both formats
            phone: formattedPhoneForNav, // Pass 12-digit format
            email: email,
            type: 'register',
            reqId: phoneReqId || undefined, // Pass reqId if available
            method: phoneMethod || undefined, // Pass method if available
          });
        }
      }
    } catch (error: any) {
      // Handle validation errors (422) with detailed messages
      if (error.status === 422 && error.data?.errors) {
        const errors = error.data.errors;
        let errorMessages: string[] = [];
        
        // Collect all validation error messages
        Object.keys(errors).forEach((field) => {
          const fieldError = errors[field];
          if (typeof fieldError === 'string') {
            errorMessages.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${fieldError}`);
          } else if (Array.isArray(fieldError)) {
            errorMessages.push(`${field.charAt(0).toUpperCase() + field.slice(1)}: ${fieldError.join(', ')}`);
          }
        });
        
        if (errorMessages.length > 0) {
          CustomAlert.alert('Validation Error', errorMessages.join('\n'));
        } else {
          CustomAlert.alert('Validation Error', error.data?.message || 'Please check your input and try again');
        }
      } else {
        // Handle other errors
        const errorMessage = error.message || error.data?.message || 'Registration failed. Please try again.';
        CustomAlert.alert('Error', errorMessage);
      }
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
    <>
      <MSG91WebWidget
        visible={showMSG91Widget}
        onClose={handleWidgetClose}
        identifier={widgetPhoneIdentifier}
        widgetType="sms"
        onSuccess={handleWidgetSuccess}
        onFailure={handleWidgetFailure}
      />
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
                      setPhoneReqId(null);
                      setPhoneMethod(null);
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

      </KeyboardAvoidingView>
    </>
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
