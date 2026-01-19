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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth, UserRole} from '../../context/AuthContext';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

// Storage keys for Remember Me feature
const REMEMBERED_EMAIL_KEY = '@remembered_email';
const REMEMBERED_PASSWORD_KEY = '@remembered_password';
const REMEMBER_ME_ENABLED_KEY = '@remember_me_enabled';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Login'
>;

type Props = {
  navigation: LoginScreenNavigationProp;
};

const LoginScreen: React.FC<Props> = ({navigation}) => {
  const {login} = useAuth();
  const route = useRoute();
  const params = (route.params as any) || {};
  const returnTo = params.returnTo;
  const propertyId = params.propertyId;
  const autoShowContact = params.autoShowContact;
  const userTypeParam = params.userType;
  const targetDashboard = params.targetDashboard;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    (userTypeParam as UserRole) || 'buyer'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const building1Anim = useRef(new Animated.Value(0)).current;
  const building2Anim = useRef(new Animated.Value(0)).current;
  const building3Anim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

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

  // Load saved credentials on mount
  useEffect(() => {
    loadSavedCredentials();
  }, []);

  // Set selectedRole from route params if provided
  useEffect(() => {
    if (userTypeParam) {
      const role = userTypeParam.toLowerCase().trim() as UserRole;
      if (role === 'seller' || role === 'buyer' || role === 'agent') {
        setSelectedRole(role);
      }
    }
  }, [userTypeParam]);

  const loadSavedCredentials = async () => {
    try {
      const rememberMeEnabled = await AsyncStorage.getItem(REMEMBER_ME_ENABLED_KEY);
      if (rememberMeEnabled === 'true') {
        const savedEmail = await AsyncStorage.getItem(REMEMBERED_EMAIL_KEY);
        const savedPassword = await AsyncStorage.getItem(REMEMBERED_PASSWORD_KEY);
        
        if (savedEmail) {
          setEmail(savedEmail);
        }
        if (savedPassword) {
          setPassword(savedPassword);
        }
        setRememberMe(true);
      }
    } catch (error) {
      console.error('Error loading saved credentials:', error);
    }
  };

  const saveCredentials = async (email: string, password: string) => {
    try {
      await AsyncStorage.setItem(REMEMBER_ME_ENABLED_KEY, 'true');
      await AsyncStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      await AsyncStorage.setItem(REMEMBERED_PASSWORD_KEY, password);
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };

  const clearSavedCredentials = async () => {
    try {
      await AsyncStorage.removeItem(REMEMBER_ME_ENABLED_KEY);
      await AsyncStorage.removeItem(REMEMBERED_EMAIL_KEY);
      await AsyncStorage.removeItem(REMEMBERED_PASSWORD_KEY);
    } catch (error) {
      console.error('Error clearing saved credentials:', error);
    }
  };

  const handleLogin = async (retryUserType?: UserRole) => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    // Ensure we have a valid userType string - CRITICAL: Use selectedRole from UI
    const userTypeToUse: string = (retryUserType || selectedRole || 'buyer') as string;
    
    console.log('[LoginScreen] 🔐 Login attempt:', {
      email: email.trim(),
      selectedRole,
      retryUserType,
      userTypeToUse,
    });
    
    try {
      // Pass the selected role to login - backend requires userType
      // Backend validates role access:
      // - Buyer/Tenant (registered) → Can login as "buyer" OR "seller" ✅
      // - Seller/Owner (registered) → Can login as "buyer" OR "seller" ✅
      // - Agent/Builder (registered) → Can ONLY login as "agent" (403 if try buyer/seller) ❌
      // IMPORTANT: We pass userTypeToUse which is the selected role from the UI
      await login(email.trim(), password, userTypeToUse);
      
      console.log('[LoginScreen] ✅ Login successful, navigation will happen automatically based on userType:', userTypeToUse);
      
      // Save credentials if Remember Me is checked
      if (rememberMe) {
        await saveCredentials(email.trim(), password);
      } else {
        // Clear saved credentials if Remember Me is unchecked
        await clearSavedCredentials();
      }
      
      // If returnTo is specified, navigate back to that screen
      if (returnTo === 'Profile') {
        // Navigate back to MainTabs and then to Profile
        navigation.getParent()?.navigate('MainTabs' as never, {
          screen: 'Profile',
        } as never);
      } else if (returnTo === 'Chats') {
        // Navigate back to MainTabs and then to Chats
        navigation.getParent()?.navigate('MainTabs' as never, {
          screen: 'Chats',
        } as never);
      } else if (returnTo === 'PropertyDetails' && propertyId) {
        // Navigate back to PropertyDetails screen with flag to auto-show contact
        // Navigate to MainTabs -> Search -> PropertyDetails
        const parentNav = navigation.getParent();
        if (parentNav) {
          (parentNav as any).navigate('MainTabs', {
            screen: 'Search',
            params: {
              screen: 'PropertyDetails',
              params: {
                propertyId: propertyId,
                returnFromLogin: true,
              },
            },
          });
        }
      } else {
        // Navigation will be handled automatically by AppNavigator
        // It will check for targetDashboard in AsyncStorage (set by InitialScreen)
        // and navigate to the appropriate dashboard (Seller, Agent, or Builder)
        // If no targetDashboard, it will navigate based on user.user_type
      }
    } catch (error: any) {
      console.error('[LoginScreen] Login error:', error);
      
      // Handle validation errors (400)
      if (error.status === 400) {
        const errorMsg = error.message || error.error?.message || 'Validation failed. Please check your email, password, and selected role.';
        Alert.alert('Validation Failed', errorMsg);
        return;
      }
      
      // Handle 403 errors with specific messages and auto-retry
      if (error.status === 403) {
        const errorMessage = error.message || error.error?.message || 'Access denied. You don\'t have permission to access this dashboard.';
        const suggestedUserType = error.data?.suggestedUserType;
        
        console.log('[LoginScreen] 403 Error - Suggested user type:', suggestedUserType);
        
        // If we have a suggested user type and we're not already retrying, offer to auto-retry
        if (suggestedUserType && !retryUserType && suggestedUserType !== userTypeToUse) {
          const suggestedRoleLabel = getRoleLabel(suggestedUserType as UserRole);
          
          Alert.alert(
            'Access Denied',
            `${errorMessage}\n\nYou are registered as ${suggestedRoleLabel}. Would you like to switch to ${suggestedRoleLabel} login?`,
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => {
                  // Update selected role to match suggestion
                  setSelectedRole(suggestedUserType as UserRole);
                },
              },
              {
                text: 'Switch & Login',
                onPress: () => {
                  setSelectedRole(suggestedUserType as UserRole);
                  handleLogin(suggestedUserType as UserRole);
                },
              },
            ],
            {cancelable: false}
          );
        } else {
          // Show error message with role information
          let roleHint = '';
          if (errorMessage.includes('Agent/Builder') || errorMessage.includes('agent')) {
            roleHint = '\n\nYou are registered as an Agent/Builder. You can only access the Agent/Builder dashboard.';
            setSelectedRole('agent');
          } else if (errorMessage.includes('Buyer/Tenant') || errorMessage.includes('buyer')) {
            roleHint = '\n\nYou are registered as a Buyer/Tenant. You can access both Buyer and Seller dashboards.';
            setSelectedRole('buyer');
          } else if (errorMessage.includes('Seller/Owner') || errorMessage.includes('seller')) {
            roleHint = '\n\nYou are registered as a Seller/Owner. You can access both Buyer and Seller dashboards.';
            setSelectedRole('seller');
          }
          
          Alert.alert(
            'Access Denied',
            errorMessage + roleHint,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Role already updated above
                },
              },
            ]
          );
        }
      } else if (error.status === 401) {
        Alert.alert('Login Failed', 'Invalid email or password. Please check your credentials and try again.');
      } else {
        const errorMsg = error.message || error.error?.message || 'Login failed. Please try again.';
        Alert.alert('Error', errorMsg);
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

  const getRoleLabel = (role: UserRole) => {
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
        {/* Overlay for better text readability */}
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
          showsVerticalScrollIndicator={false}
          onScroll={Animated.event(
            [{nativeEvent: {contentOffset: {y: scrollY}}}],
            {useNativeDriver: false},
          )}>
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
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to continue to your account
              </Text>
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
                  onPress={() => {
                    console.log('[LoginScreen] Role selected:', role.value);
                    setSelectedRole(role.value);
                  }}
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
                Buyers and Sellers can switch between these two dashboards
              </Text>
            </View>

            {/* Form */}
            <View style={styles.form}>
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
                />
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

              {/* Remember Me & Forgot Password */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={async () => {
                    const newRememberMe = !rememberMe;
                    setRememberMe(newRememberMe);
                    // If unchecking, clear saved credentials
                    if (!newRememberMe) {
                      await clearSavedCredentials();
                    }
                  }}>
                  <View
                    style={[
                      styles.checkbox,
                      rememberMe && styles.checkboxChecked,
                    ]}>
                    {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity>
                  <Text style={styles.forgotPassword}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Sign In Button */}
              <TouchableOpacity
                style={styles.signInButton}
                onPress={() => {
                  console.log('[LoginScreen] Sign In button pressed, selectedRole:', selectedRole);
                  handleLogin();
                }}
                disabled={isLoading}>
                <Text style={styles.signInButtonText}>
                  {isLoading
                    ? 'Signing in...'
                    : `Sign In as ${getRoleLabel(selectedRole)}`}
                </Text>
              </TouchableOpacity>

              {/* Register Link */}
              <View style={styles.registerContainer}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.registerLink}>Register now</Text>
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
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 14,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    borderWidth: 2,
    borderColor: colors.border,
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
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...typography.caption,
    color: colors.text,
    fontSize: 14,
  },
  forgotPassword: {
    ...typography.caption,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  signInButton: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.cta,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  signInButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default LoginScreen;
