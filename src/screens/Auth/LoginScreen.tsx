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
  Animated,
  Easing,
} from 'react-native';
import CustomAlert from '../../utils/alertHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {colors, spacing} from '../../theme';
import {useAuth, UserRole} from '../../context/AuthContext';

// Storage keys for Remember Me feature
const REMEMBERED_EMAIL_KEY = '@remembered_email';
const REMEMBERED_PASSWORD_KEY = '@remembered_password';
const REMEMBER_ME_ENABLED_KEY = '@remember_me_enabled';

type LoginScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
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
  const userTypeParam = params.userType;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>(
    (userTypeParam as UserRole) || 'buyer'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoRotation = useRef(new Animated.Value(0)).current;
  const logoGlow = useRef(new Animated.Value(0)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const roleButtonAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

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
        if (savedEmail) setEmail(savedEmail);
        if (savedPassword) setPassword(savedPassword);
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
      CustomAlert.alert('Error', 'Please enter email and password');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      CustomAlert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    const userTypeToUse: string = (retryUserType || selectedRole || 'buyer') as string;
    
    try {
      await login(email.trim(), password, userTypeToUse);
      
      if (rememberMe) {
        await saveCredentials(email.trim(), password);
      } else {
        await clearSavedCredentials();
      }
      
      // Set the dashboard preference based on selected role
      // This ensures navigation goes to correct dashboard after login
      const dashboardMap: Record<string, string> = {
        'buyer': 'buyer',
        'seller': 'seller',
        'agent': 'agent',
      };
      const targetDashboard = dashboardMap[userTypeToUse] || 'buyer';
      
      // Save both immediate target and persistent preference
      await AsyncStorage.setItem('@target_dashboard', targetDashboard);
      await AsyncStorage.setItem('@user_dashboard_preference', targetDashboard);
      
      const parentNav = navigation.getParent();
      
      // Handle specific return destinations within the role's dashboard
      if (returnTo === 'Profile') {
        if (userTypeToUse === 'seller') {
          (parentNav as any)?.reset({
            index: 0,
            routes: [{name: 'Seller'}],
          });
        } else if (userTypeToUse === 'agent') {
          (parentNav as any)?.reset({
            index: 0,
            routes: [{name: 'Agent'}],
          });
        } else {
          (parentNav as any)?.navigate('MainTabs', {screen: 'Profile'});
        }
      } else if (returnTo === 'Chats') {
        if (userTypeToUse === 'seller') {
          (parentNav as any)?.reset({
            index: 0,
            routes: [{name: 'Seller'}],
          });
        } else if (userTypeToUse === 'agent') {
          (parentNav as any)?.reset({
            index: 0,
            routes: [{name: 'Agent'}],
          });
        } else {
          (parentNav as any)?.navigate('MainTabs', {screen: 'Chats'});
        }
      } else if (returnTo === 'PropertyDetails' && propertyId) {
        // For property details, always go to buyer view (MainTabs)
        if (parentNav) {
          (parentNav as any).navigate('MainTabs', {
            screen: 'Search',
            params: {screen: 'PropertyDetails', params: {propertyId, returnFromLogin: true}},
          });
        }
      } else {
        // No specific returnTo - navigate to the selected role's dashboard
        if (userTypeToUse === 'seller') {
          (parentNav as any)?.reset({
            index: 0,
            routes: [{name: 'Seller'}],
          });
        } else if (userTypeToUse === 'agent') {
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
      }
    } catch (error: any) {
      if (error.status === 400) {
        CustomAlert.alert('Validation Failed', error.message || 'Please check your credentials.');
      } else if (error.status === 403) {
        const suggestedUserType = error.data?.suggestedUserType;
        if (suggestedUserType && !retryUserType) {
          CustomAlert.alert(
            'Access Denied',
            `You are registered as ${getRoleLabel(suggestedUserType)}. Switch role?`,
            [
              {text: 'Cancel', onPress: () => setSelectedRole(suggestedUserType)},
              {text: 'Switch & Login', onPress: () => {
                setSelectedRole(suggestedUserType);
                handleLogin(suggestedUserType);
              }},
            ]
          );
        } else {
          CustomAlert.alert('Access Denied', error.message || 'Access denied.');
        }
      } else if (error.status === 401) {
        CustomAlert.alert('Login Failed', 'Invalid email or password.');
      } else {
        CustomAlert.alert('Error', error.message || 'Login failed.');
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
      case 'buyer': return 'Buyer/Tenant';
      case 'seller': return 'Seller/Owner';
      case 'agent': return 'Agent/Builder';
    }
  };

  const completedFields = [email, password].filter(Boolean).length;

  // Animate progress bar when fields change
  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: (completedFields / 2) * 100,
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
            borderRadius: 40,
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
          <Text style={styles.progressText}>{completedFields}/2 fields completed</Text>
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
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>

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
                  </TouchableOpacity>
                </Animated.View>
              ))}
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
                  autoCorrect={false}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember Me & Forgot Password */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={async () => {
                  const newVal = !rememberMe;
                  setRememberMe(newVal);
                  if (!newVal) await clearSavedCredentials();
                }}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Remember me</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.forgotPassword}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Sign In Button with animation */}
            <Animated.View style={{transform: [{scale: buttonScale}]}}>
              <TouchableOpacity
                style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                onPress={() => handleLogin()}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={isLoading}
                activeOpacity={0.9}>
                <Text style={styles.signInButtonText}>
                  {isLoading ? 'Signing in...' : `Sign In as ${getRoleLabel(selectedRole)}`}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.registerLink}>Register now</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: spacing.xs,
  },
  appName: {
    fontSize: 22,
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
    fontSize: 10,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  roleButtonTextSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  eyeButton: {
    padding: spacing.md,
  },
  eyeIcon: {
    fontSize: 18,
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
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: colors.text,
  },
  forgotPassword: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  signInButtonDisabled: {
    backgroundColor: colors.textSecondary,
  },
  signInButtonText: {
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  registerText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  registerLink: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});

export default LoginScreen;
