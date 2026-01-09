import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ImageBackground,
  Image,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth, UserRole} from '../../context/AuthContext';
import {otpService} from '../../services/otp.service';

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
  const [emailVerifying, setEmailVerifying] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailToken, setEmailToken] = useState<string | null>(null);
  const [phoneToken, setPhoneToken] = useState<string | null>(null);

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

  const handleEmailVerify = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email first');
      return;
    }
    
    setEmailVerifying(true);
    try {
      const response = await otpService.sendEmail(email);
      if (response.success) {
        setEmailVerified(true);
        // Store MSG91 token if available
        if (response.data?.token || response.data?.verificationToken) {
          setEmailToken(response.data.token || response.data.verificationToken);
        }
        Alert.alert('Success', 'Verification email sent! Please check your inbox and enter the OTP when prompted.');
      } else {
        Alert.alert('Error', response.message || 'Failed to send verification email');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification email');
    } finally {
      setEmailVerifying(false);
    }
  };

  const handlePhoneVerify = async () => {
    if (!phone) {
      Alert.alert('Error', 'Please enter your phone number first');
      return;
    }
    
    const phoneNumber = phone.replace(/[^0-9]/g, '');
    if (phoneNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }
    
    setPhoneVerifying(true);
    try {
      const response = await otpService.sendSMS(`+91${phoneNumber}`);
      if (response.success) {
        setPhoneVerified(true);
        // Store MSG91 token if available
        if (response.data?.token || response.data?.verificationToken) {
          setPhoneToken(response.data.token || response.data.verificationToken);
        }
        Alert.alert('Success', 'Verification SMS sent! Please check your phone and enter the OTP when prompted.');
      } else {
        Alert.alert('Error', response.message || 'Failed to send verification SMS');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send verification SMS');
    } finally {
      setPhoneVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !phone || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    if (!selectedRole) {
      Alert.alert('Error', 'Please select a role');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Validate phone number (10 digits)
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    // Check if email and phone are verified
    if (!emailVerified || !phoneVerified) {
      Alert.alert('Error', 'Please verify both email and phone number before registering');
      return;
    }

    setIsLoading(true);
    try {
      const response = await register(
        name,
        email,
        phone.replace(/[^0-9]/g, ''),
        password,
        selectedRole,
        emailToken || undefined,
        phoneToken || undefined,
      );
      // If registration successful, navigate to OTP verification
      if (response && response.success && response.data?.user_id) {
        navigation.navigate('OTPVerification', {
          userId: response.data.user_id,
          user_id: response.data.user_id, // Support both formats
          phone: phone.replace(/[^0-9]/g, ''),
          email: email,
          type: 'register',
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Registration failed');
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

              {/* Email Input with Verify Button */}
              <View style={styles.inputContainer}>
                <View style={styles.labelRow}>
                <Text style={styles.label}>Email Address</Text>
                  {emailVerified && (
                    <Text style={styles.verifiedBadge}>✓ Verified</Text>
                  )}
                </View>
                <View style={styles.inputWithButton}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      setEmailVerified(false);
                      setEmailToken(null);
                    }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                  <TouchableOpacity
                    style={[
                      styles.verifyButton,
                      emailVerified && styles.verifyButtonVerified,
                    ]}
                    onPress={handleEmailVerify}
                    disabled={!email || emailVerifying || emailVerified}>
                    {emailVerifying ? (
                      <ActivityIndicator size="small" color={colors.surface} />
                    ) : emailVerified ? (
                      <Text style={styles.verifyButtonText}>✓</Text>
                    ) : (
                      <Text style={styles.verifyButtonText}>Verify</Text>
                    )}
                  </TouchableOpacity>
                </View>
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
