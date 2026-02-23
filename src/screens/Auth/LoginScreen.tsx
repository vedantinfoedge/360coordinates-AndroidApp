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
  Dimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradientLib from 'react-native-linear-gradient';

const LinearGradient = LinearGradientLib as React.ComponentType<any>;
import CustomAlert from '../../utils/alertHelper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {fonts, spacing} from '../../theme';
import {scale, verticalScale, moderateScale} from '../../utils/responsive';
import {useAuth, UserRole} from '../../context/AuthContext';
import {authColors, authFonts} from './authDesignTheme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

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
  const insets = useSafeAreaInsets();
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
    {value: 'buyer' as UserRole, label: 'Buyer / Tenant', icon: '🏠'},
    {value: 'seller' as UserRole, label: 'Seller / Owner', icon: '🏢'},
    {value: 'agent' as UserRole, label: 'Agent / Builder', icon: '🤝'},
  ];

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'buyer': return 'Buyer/Tenant';
      case 'seller': return 'Seller/Owner';
      case 'agent': return 'Agent/Builder';
    }
  };

  const completedFields = [email, password].filter(Boolean).length;

  // Animate progress bar when fields change (0-2 fields -> 0-100%)
  useEffect(() => {
    Animated.timing(progressWidth, {
      toValue: (completedFields / 2) * 100,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  }, [completedFields]);

  const trackWidth = SCREEN_WIDTH - 56;
  const progressBarWidth = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: [0, trackWidth],
  });

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
    <View style={[styles.container, {paddingTop: insets.top}]}>
      {/* Background */}
      <LinearGradient
        colors={[...authColors.backgroundGradient]}
        style={StyleSheet.absoluteFill}
        start={{x: 0.5, y: 0}}
        end={{x: 0.5, y: 1}}
      />
      {/* Orbs */}
      <View style={styles.orbContainer} pointerEvents="none">
        <View style={[styles.orb, styles.orb1]} />
        <View style={[styles.orb, styles.orb2]} />
        <View style={[styles.orb, styles.orb3]} />
      </View>
      {/* Grid overlay */}
      <View style={styles.gridOverlay} pointerEvents="none" />

      {/* Status bar area */}
      <View style={styles.statusBar}>
        <Text style={styles.statusTime}>
          {new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: false}).replace(' ', '')}
        </Text>
        <View style={styles.statusIcons} />
      </View>

      {/* Logo area - KEEP current circular animation */}
      <View style={styles.logoArea}>
        <Animated.View style={{
          transform: [
            {scale: logoScale},
            {rotate: spin},
          ],
          opacity: logoOpacity,
        }}>
          <Animated.View style={{
            shadowColor: authColors.blue2,
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
            borderRadius: 36,
          }}>
            <Image
              source={require('../../assets/App-icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>
        </Animated.View>
        <Animated.Text style={[styles.appName, {opacity: headerOpacity}]}>360Coordinates</Animated.Text>
      </View>

      {/* Heading */}
      <Animated.View style={[styles.headingArea, {opacity: headerOpacity}]}>
        <Text style={styles.h1}>Welcome{'\n'}<Text style={styles.h1Emphasis}>Back.</Text></Text>
        <Text style={styles.h2}>Sign in to explore your dream property</Text>
      </Animated.View>

      {/* Progress bar */}
      <Animated.View style={[styles.progWrap, {opacity: headerOpacity}]}>
        <View style={styles.progTrack}>
          <Animated.View style={[styles.progFill, {width: progressBarWidth}]} />
        </View>
        <Text style={styles.progLabel}>{completedFields}/2 fields completed</Text>
      </Animated.View>

      {/* Scrollable Form */}
      <KeyboardAvoidingView
        style={styles.formContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.contentContainer, {paddingBottom: insets.bottom + 20}]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Animated.View style={[styles.card, {
            opacity: cardOpacity,
            transform: [{translateY: cardTranslateY}],
          }]}>
            <View style={styles.cardScroll}>
              <Text style={styles.sectionLabel}>SIGN IN AS</Text>
              <View style={styles.roleRow}>
                {roles.map((role, index) => (
                  <Animated.View
                    key={role.value}
                    style={{
                      flex: 1,
                      opacity: roleButtonAnims[index],
                    }}>
                    <TouchableOpacity
                      style={[
                        styles.roleBtn,
                        selectedRole === role.value && styles.roleBtnActive,
                      ]}
                      onPress={() => setSelectedRole(role.value)}
                      activeOpacity={0.8}>
                      {selectedRole === role.value && (
                        <LinearGradient
                          colors={[...authColors.ctaGradient]}
                          style={[StyleSheet.absoluteFill, styles.roleBtnGradient]}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                        />
                      )}
                      <Text style={styles.roleIcon}>{role.icon}</Text>
                      <Text style={[
                        styles.roleName,
                        selectedRole === role.value && styles.roleNameActive,
                      ]}>
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              <View style={styles.divider} />

              <View style={styles.field}>
                <Text style={styles.fieldLbl}>EMAIL ADDRESS</Text>
                <View style={styles.inpWrap}>
                  <TextInput
                    style={styles.inp}
                    placeholder="your@email.com"
                    placeholderTextColor={authColors.textPlaceholder}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.fieldLbl}>PASSWORD</Text>
                <View style={styles.inpWrap}>
                  <TextInput
                    style={styles.inp}
                    placeholder="Enter your password"
                    placeholderTextColor={authColors.textPlaceholder}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeBtn}
                    onPress={() => setShowPassword(!showPassword)}>
                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.optsRow}>
                <TouchableOpacity
                  style={styles.remRow}
                  onPress={async () => {
                    const newVal = !rememberMe;
                    setRememberMe(newVal);
                    if (!newVal) await clearSavedCredentials();
                  }}>
                  <View style={[styles.cb, rememberMe && styles.cbOn]}>
                    {rememberMe && <Text style={styles.cbCheck}>✓</Text>}
                  </View>
                  <Text style={styles.remTxt}>Remember me</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                  <Text style={styles.forgot}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              <Animated.View style={{transform: [{scale: buttonScale}]}}>
                <TouchableOpacity
                  style={[styles.ctaBtn, isLoading && styles.ctaBtnDisabled]}
                  onPress={() => handleLogin()}
                  onPressIn={handlePressIn}
                  onPressOut={handlePressOut}
                  disabled={isLoading}
                  activeOpacity={0.9}>
                  <LinearGradient
                    colors={isLoading ? ['#5a6a7a', '#4a5a6a'] : [...authColors.ctaGradient]}
                    style={StyleSheet.absoluteFill}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                  />
                  <Text style={styles.ctaBtnText}>
                    {isLoading ? 'Signing in...' : `Sign In as ${getRoleLabel(selectedRole)}`}
                  </Text>
                  <View style={styles.arr}>
                    <Text style={styles.arrIcon}>→</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>

              <View style={styles.cardFoot}>
                <Text style={styles.cardFootText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                  <Text style={styles.cardFootLink}>Register now</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.company} testID="buyer-copyright-brand">
                <Text style={styles.companyText}>Vedant Infoedge India LLP</Text>
              </View>
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
  statusBar: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5,
  },
  statusTime: {
    color: authColors.textWhite,
    fontSize: 15,
    fontFamily: authFonts.button,
  },
  statusIcons: {
    width: 50,
    height: 14,
  },
  logoArea: {
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 0,
    zIndex: 5,
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(210,225,245,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  appName: {
    fontSize: 18,
    fontFamily: authFonts.button,
    color: authColors.blueAccent,
    letterSpacing: -0.3,
    marginTop: 8,
  },
  headingArea: {
    paddingHorizontal: 28,
    paddingTop: 14,
    zIndex: 5,
  },
  h1: {
    fontSize: 28,
    fontFamily: authFonts.heading,
    color: authColors.textWhite,
    lineHeight: 34,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  h1Emphasis: {
    color: authColors.blueAccent,
  },
  h2: {
    fontSize: 13,
    fontFamily: authFonts.body,
    color: authColors.muted,
  },
  progWrap: {
    paddingHorizontal: 28,
    marginTop: 10,
    zIndex: 5,
  },
  progTrack: {
    height: 3,
    backgroundColor: authColors.progressTrack,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progFill: {
    height: '100%',
    backgroundColor: authColors.blue2,
    borderRadius: 2,
  },
  progLabel: {
    fontSize: 10.5,
    color: authColors.footerMuted,
    marginTop: 5,
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    zIndex: 5,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  card: {
    marginHorizontal: 14,
    backgroundColor: authColors.cardBg,
    borderWidth: 1,
    borderColor: authColors.cardBorder,
    borderRadius: 26,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 16},
    shadowOpacity: 0.5,
    shadowRadius: 50,
    elevation: 8,
  },
  cardScroll: {
    padding: 20,
  },
  sectionLabel: {
    fontSize: 10.5,
    fontFamily: authFonts.sectionLabel,
    color: authColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 9,
  },
  roleRow: {
    flexDirection: 'row',
    gap: 7,
    marginBottom: 18,
  },
  roleBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5,
    borderColor: authColors.cardBorder,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    overflow: 'hidden',
  },
  roleBtnActive: {
    borderColor: authColors.blue2,
    shadowColor: authColors.blue,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
  },
  roleBtnGradient: {
    borderRadius: 12,
  },
  roleIcon: {
    fontSize: 17,
    zIndex: 1,
  },
  roleName: {
    fontSize: 9.5,
    fontFamily: authFonts.sectionLabel,
    color: authColors.roleInactive,
    textAlign: 'center',
    lineHeight: 13,
    zIndex: 1,
  },
  roleNameActive: {
    color: authColors.textWhite,
  },
  divider: {
    height: 1,
    backgroundColor: authColors.divider,
    marginBottom: 16,
  },
  field: {
    marginBottom: 12,
  },
  fieldLbl: {
    fontSize: 10.5,
    fontFamily: authFonts.sectionLabel,
    color: authColors.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  inpWrap: {
    backgroundColor: authColors.inputBg,
    borderWidth: 1.5,
    borderColor: authColors.inputBorder,
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    height: 48,
  },
  inp: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: authFonts.body,
    color: authColors.textWhite,
    padding: 0,
  },
  eyeBtn: {
    padding: 8,
  },
  eyeIcon: {
    fontSize: 15,
    opacity: 0.7,
  },
  optsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  remRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  cb: {
    width: 18,
    height: 18,
    backgroundColor: authColors.checkboxBg,
    borderWidth: 1.5,
    borderColor: authColors.checkboxBorder,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cbOn: {
    backgroundColor: authColors.blue,
    borderColor: authColors.blue,
  },
  cbCheck: {
    color: authColors.textWhite,
    fontSize: 10,
    fontFamily: authFonts.sectionLabel,
  },
  remTxt: {
    fontSize: 12,
    fontFamily: authFonts.body,
    color: authColors.textMutedLight,
  },
  forgot: {
    fontSize: 12,
    fontFamily: authFonts.link,
    color: authColors.blueAccent,
  },
  ctaBtn: {
    height: 52,
    borderRadius: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: authColors.blue,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.42,
    shadowRadius: 22,
    elevation: 6,
  },
  ctaBtnDisabled: {
    opacity: 0.7,
  },
  ctaBtnText: {
    fontSize: 14.5,
    fontFamily: authFonts.button,
    color: authColors.textWhite,
    letterSpacing: -0.1,
    zIndex: 1,
  },
  arr: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 7,
    zIndex: 1,
  },
  arrIcon: {
    color: authColors.textWhite,
    fontSize: 12,
  },
  cardFoot: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  cardFootText: {
    fontSize: 12.5,
    fontFamily: authFonts.body,
    color: authColors.footerMuted,
  },
  cardFootLink: {
    fontSize: 12.5,
    fontFamily: authFonts.link,
    color: authColors.blueAccent,
  },
  company: {
    alignItems: 'center',
    marginTop: 10,
  },
  companyText: {
    fontSize: 10.5,
    fontFamily: authFonts.body,
    color: authColors.companyMuted,
  },
});

export default LoginScreen;
