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
  Dimensions,
  InteractionManager,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradientLib from 'react-native-linear-gradient';

const LinearGradient = LinearGradientLib as React.ComponentType<any>;
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../../utils/alertHelper';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useRoute, useFocusEffect} from '@react-navigation/native';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {colors, spacing} from '../../theme';
import {useAuth, UserRole} from '../../context/AuthContext';
import {authColors, authFonts} from './authDesignTheme';
import {AuthFieldIcon} from './AuthFieldIcons';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
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
  const insets = useSafeAreaInsets();
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

  // Ref to track if we've already processed OTP verification params
  const hasProcessedOtpParams = useRef(false);

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

  // Handle return from OTP verification screen (defer updates to avoid Android layout thrash/glitch)
  useFocusEffect(
    React.useCallback(() => {
      const params = route.params as any;
      // Skip if we've already processed OTP params to prevent re-render loops
      if (hasProcessedOtpParams.current && params?.phoneVerified === undefined) {
        return;
      }
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      const applyOtpParams = () => {
        if (params?.name !== undefined) setName(String(params.name).toUpperCase());
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
        if (params?.role !== undefined) {
          const r = (params.role as string).toLowerCase();
          setSelectedRole(r === 'seller' ? 'seller' : 'agent');
        }
        if (params?.phoneVerified === true) {
          hasProcessedOtpParams.current = true;
          // Batch all OTP-related state updates in one tick to reduce re-renders
          setPhoneVerified(true);
          if (params.phoneToken) setPhoneToken(params.phoneToken);
          if (params.phoneMethod) setPhoneMethod(params.phoneMethod);
          if (params.verifiedOtp) setVerifiedOtp(params.verifiedOtp);
          if (params.phoneMsg91Token) setPhoneMsg91Token(params.phoneMsg91Token);
          if (!params.phoneMsg91Token && params.phoneToken && (params.phoneMethod === 'msg91-sdk' || params.phoneMethod === 'msg91-widget')) {
            setPhoneMsg91Token(params.phoneToken);
          }
          // Clear params after transition settles - delayed on Android to prevent blinking
          const clearDelay = Platform.OS === 'android' ? 500 : 100;
          setTimeout(() => {
            navigation.setParams({
              phoneVerified: undefined,
              phoneToken: undefined,
              phoneMethod: undefined,
              verifiedOtp: undefined,
              phoneMsg91Token: undefined,
              phone: undefined,
              name: undefined,
              email: undefined,
              selectedRole: undefined,
            } as any);
          }, clearDelay);
        }
      };
      const handle = InteractionManager.runAfterInteractions(() => {
        // On Android, add extra delay so native transition fully completes before state updates
        const androidDelay = Platform.OS === 'android' ? 180 : 0;
        if (androidDelay > 0) {
          timeoutId = setTimeout(applyOtpParams, androidDelay);
        } else {
          applyOtpParams();
        }
      });
      return () => {
        handle.cancel();
        if (timeoutId != null) clearTimeout(timeoutId);
      };
    }, [navigation, route.params])
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
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterScreen.tsx:390',message:'handleRegister entry',data:{hasName:!!name,hasEmail:!!email,hasPhone:!!phone,hasPassword:!!password,hasConfirmPassword:!!confirmPassword,selectedRole,phoneVerified,hasPhoneToken:!!phoneToken,hasPhoneMsg91Token:!!phoneMsg91Token,hasVerifiedOtp:!!verifiedOtp,phoneMethod},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
    // #endregion
    if (!name || !email || !phone || !password || !confirmPassword) {
      CustomAlert.alert('Error', 'Please fill all fields');
      return;
    }
    // Name is stored in uppercase; ensure non-empty
    const trimmedName = name.trim().toUpperCase();
    if (!trimmedName) {
      CustomAlert.alert('Error', 'Please enter your full name');
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
    // Check phone verification - but don't show error if we're returning from OTP verification
    // The OTP verification screen already shows success message
    if (!phoneVerified && !phoneToken && !phoneMsg91Token && !verifiedOtp) {
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

      // Handle different verification methods with proper fallbacks
      if ((phoneMethod === 'msg91-widget' || phoneMethod === 'msg91-sdk')) {
        // For MSG91 SDK/widget methods, use msg91Token or phoneToken
        phoneVerificationTokenToSend = phoneMsg91Token || phoneToken || undefined;
        phoneVerificationMethodToSend = 'msg91';
        phoneVerifiedFlagToSend = true;
      } else if (phoneMethod === 'backend' && verifiedOtp) {
        // Backend verification - use the verified OTP
        phoneOtpToSend = verifiedOtp;
        phoneVerificationMethodToSend = 'backend';
      } else if (phoneToken) {
        // Fallback - use phoneToken if available
        phoneVerificationTokenToSend = phoneToken;
      } else if (verifiedOtp) {
        // Last resort fallback - use verifiedOtp
        phoneOtpToSend = verifiedOtp;
      }

      // If phone is verified but no token/otp available, send phoneVerified flag
      if (!phoneVerificationTokenToSend && !phoneOtpToSend && phoneVerified) {
        phoneVerifiedFlagToSend = true;
        phoneVerificationMethodToSend = phoneMethod || 'msg91';
      }

      if (!phoneVerificationTokenToSend && !phoneOtpToSend && !phoneVerifiedFlagToSend) {
        CustomAlert.alert('Error', 'Phone verification details missing. Please verify again.');
        setIsLoading(false);
        return;
      }

      const phoneDigits = phone.replace(/\D/g, '');
      const formattedPhone = phoneDigits.length === 10 ? '+91' + phoneDigits : '+91' + phoneDigits.slice(-10);

      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterScreen.tsx:468',message:'Before API call - request data prepared',data:{fullName:trimmedName,email,phone:formattedPhone,userType:selectedRole,hasPhoneToken:!!phoneVerificationTokenToSend,hasPhoneOtp:!!phoneOtpToSend,phoneVerified:phoneVerifiedFlagToSend,phoneVerificationMethod:phoneVerificationMethodToSend},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      console.log('[RegisterScreen] Sending registration request:', {
        fullName: trimmedName,
        email,
        phone: formattedPhone,
        userType: selectedRole,
        hasPhoneToken: !!phoneVerificationTokenToSend,
        hasPhoneOtp: !!phoneOtpToSend,
        phoneVerified: phoneVerifiedFlagToSend,
      });

      const response = await register(
        trimmedName, email, formattedPhone, password, selectedRole,
        undefined, phoneVerificationTokenToSend, phoneOtpToSend,
        phoneVerificationMethodToSend, phoneVerifiedFlagToSend,
      );
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterScreen.tsx:486',message:'After register() call - response received',data:{success:response?.success,hasToken:!!response?.data?.token,hasUser:!!response?.data?.user,hasUserId:!!response?.data?.user_id,message:response?.message,status:response?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      
      console.log('[RegisterScreen] Registration response:', JSON.stringify(response, null, 2));
      
      if (response?.success) {
        if (response.data?.token && response.data?.user) {
          // Auto-login flow: Backend returns token and user directly
          console.log('[RegisterScreen] Auto-login flow: Token and user received');
          
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
          
          CustomAlert.alert('Success', `Welcome, ${trimmedName}!`, [
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
          // OTP verification flow: Backend returns user_id, need to verify OTP
          console.log('[RegisterScreen] OTP verification flow: user_id received:', response.data.user_id);
          
          const formattedPhoneForNav = '91' + phone.replace(/\D/g, '').slice(-10);
          (navigation as any).navigate('OTPVerification', {
            userId: response.data.user_id,
            phone: formattedPhoneForNav,
            email, type: 'register',
            reqId: phoneReqId || undefined,
            method: phoneMethod || undefined,
            formData: {
              name: trimmedName,
              email,
              phone: formattedPhoneForNav,
              selectedRole: selectedRole,
            },
          });
        } else {
          // Unexpected response structure - log and show error
          console.error('[RegisterScreen] Unexpected response structure:', {
            success: response.success,
            hasToken: !!response.data?.token,
            hasUser: !!response.data?.user,
            hasUserId: !!response.data?.user_id,
            dataKeys: response.data ? Object.keys(response.data) : [],
            fullResponse: response,
          });
          
          CustomAlert.alert(
            'Registration Issue',
            'Registration completed but received unexpected response. Please try logging in or contact support.',
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.navigate('Login');
                },
              },
            ]
          );
        }
      } else {
        // Registration failed - response.success is false
        const errorMessage = response?.message || response?.error || 'Registration failed. Please try again.';
        console.error('[RegisterScreen] Registration failed:', {
          success: response?.success,
          message: response?.message,
          error: response?.error,
          status: response?.status,
        });
        
        CustomAlert.alert('Registration Failed', errorMessage);
      }
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/46268aef-e207-4f37-bc15-922b8a7a4be9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'RegisterScreen.tsx:533',message:'Catch block - error caught',data:{message:error?.message,status:error?.status,errorType:error?.constructor?.name,hasError:!!error?.error,errorMessage:error?.error?.message,networkError:!error?.status},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      
      console.error('[RegisterScreen] Registration error caught:', {
        message: error.message,
        status: error.status,
        error: error.error,
        fullError: error,
      });
      
      // Extract better error message
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else if (typeof error.error === 'string') {
        errorMessage = error.error;
      } else if (error.status === 400) {
        errorMessage = 'Invalid registration data. Please check all fields and try again.';
      } else if (error.status === 409) {
        errorMessage = 'An account with this email or phone already exists. Please login instead.';
      } else if (error.status === 500) {
        errorMessage = 'Server error. Please try again in a few moments.';
      }
      
      CustomAlert.alert('Registration Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const roles = [
    {value: 'buyer' as UserRole, label: 'Buyer / Tenant', icon: '🏠'},
    {value: 'seller' as UserRole, label: 'Seller / Owner', icon: '🏢'},
    {value: 'agent' as UserRole, label: 'Agent / Builder', icon: '🤝'},
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

  const trackWidth = SCREEN_WIDTH - 56;
  // Native-driver compatible progress: scaleX + translateX so bar fills left-to-right without layout thrash
  const progressScaleX = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: [0, 1],
  });
  const progressTranslateX = progressWidth.interpolate({
    inputRange: [0, 100],
    outputRange: [-trackWidth / 2, 0],
  });

  // Animate progress bar when fields change (useNativeDriver: true to prevent Android glitch)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // On Android, defer progress bar update slightly to avoid overlapping with OTP-return re-renders
    const androidDeferMs = Platform.OS === 'android' ? 120 : 0;
    const runProgressAnimation = () => {
      Animated.timing(progressWidth, {
        toValue: (completedFields / 8) * 100,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    };
    const handle = InteractionManager.runAfterInteractions(() => {
      if (androidDeferMs > 0) {
        timeoutId = setTimeout(runProgressAnimation, androidDeferMs);
      } else {
        runProgressAnimation();
      }
    });
    return () => {
      handle.cancel();
      if (timeoutId != null) clearTimeout(timeoutId);
    };
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

        <View style={styles.statusBar}>
          <Text style={styles.statusTime}>
            {new Date().toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', hour12: false}).replace(' ', '')}
          </Text>
          <View style={styles.statusIcons} />
        </View>

        <View style={styles.logoArea}>
          <Animated.View style={{
            transform: [{scale: logoScale}, {rotate: spin}],
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

        <Animated.View style={[styles.headingArea, {opacity: headerOpacity}]}>
          <Text style={styles.h1}>Create{'\n'}<Text style={styles.h1Emphasis}>Account.</Text></Text>
          <Text style={styles.h2}>Join us to find your perfect property</Text>
        </Animated.View>

        <Animated.View style={[styles.progWrap, {opacity: headerOpacity}]}>
          <View style={styles.progTrack}>
            <Animated.View
              style={[
                styles.progFill,
                {
                  width: trackWidth,
                  transform: [
                    {translateX: progressTranslateX},
                    {scaleX: progressScaleX},
                  ],
                },
              ]}
            />
          </View>
          <Text style={styles.progLabel}>{completedFields}/8 fields completed</Text>
        </Animated.View>

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
                <Text style={styles.sectionLabel}>REGISTER AS</Text>
                <View style={styles.roleRow}>
                  {roles.map((role, index) => (
                    <Animated.View key={role.value} style={{flex: 1, opacity: roleButtonAnims[index]}}>
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
                  <View style={styles.fieldLblRow}>
                    <AuthFieldIcon name="person" size={11} color={authColors.muted} />
                    <Text style={styles.fieldLbl}>FULL NAME</Text>
                  </View>
                  <View style={styles.inpWrap}>
                    <AuthFieldIcon name="person" size={15} opacity={0.32} />
                    <TextInput
                      style={[styles.inp, {textTransform: 'uppercase'}]}
                      placeholder="Enter your full name"
                      placeholderTextColor={authColors.textPlaceholder}
                      value={name}
                      onChangeText={(t: string) => setName(t.toUpperCase())}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.field}>
                  <View style={styles.fieldLblRow}>
                    <AuthFieldIcon name="envelope" size={11} color={authColors.muted} />
                    <Text style={styles.fieldLbl}>EMAIL ADDRESS</Text>
                  </View>
                  <View style={styles.inpWrap}>
                    <AuthFieldIcon name="envelope" size={15} opacity={0.32} />
                    <TextInput
                      style={styles.inp}
                      placeholder="Enter your email"
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
                  <View style={styles.fieldLblRowPhone}>
                    <View style={styles.fieldLblIconWrap}>
                      <AuthFieldIcon name="phone" size={11} color={authColors.muted} />
                      <Text style={styles.fieldLbl}>PHONE NUMBER</Text>
                    </View>
                    {phoneVerified && <Text style={styles.verifiedBadge}>✓ Verified</Text>}
                  </View>
                  <View style={styles.phoneRow}>
                    <View style={styles.phonePrefix}>
                      <Text style={styles.phonePrefixText}>🇮🇳 +91</Text>
                    </View>
                    <View style={[styles.inpWrap, styles.phoneInpWrap]}>
                      <AuthFieldIcon name="phone" size={15} opacity={0.32} />
                      <TextInput
                        style={styles.inp}
                        placeholder="10-digit number"
                        placeholderTextColor={authColors.textPlaceholder}
                        value={phone}
                        onChangeText={(t: string) => {
                          setPhone(t);
                          setPhoneVerified(false);
                          setPhoneToken(null);
                        }}
                        keyboardType="phone-pad"
                        maxLength={10}
                      />
                    </View>
                    <Animated.View style={{transform: [{scale: !phoneVerified && phone ? verifyButtonPulse : 1}]}}>
                      <TouchableOpacity
                        style={[
                          styles.verifyBtn,
                          phoneVerified && styles.verifyBtnVerified,
                        ]}
                        onPress={handlePhoneVerify}
                        disabled={!phone || phoneVerifying || phoneVerified}
                        activeOpacity={0.8}>
                        {phoneVerifying ? (
                          <ActivityIndicator size="small" color={authColors.textWhite} />
                        ) : phoneVerified ? (
                          <Text style={styles.verifyBtnText}>✓</Text>
                        ) : (
                          <Text style={styles.verifyBtnText}>Verify</Text>
                        )}
                      </TouchableOpacity>
                    </Animated.View>
                  </View>
                </View>

                <View style={styles.field}>
                  <View style={styles.fieldLblRow}>
                    <AuthFieldIcon name="padlock" size={11} color={authColors.muted} />
                    <Text style={styles.fieldLbl}>PASSWORD</Text>
                  </View>
                  <View style={styles.inpWrap}>
                    <AuthFieldIcon name="padlock" size={15} opacity={0.32} />
                    <TextInput
                      style={styles.inp}
                      placeholder="Min 6 characters"
                      placeholderTextColor={authColors.textPlaceholder}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
                      <AuthFieldIcon
                        name={showPassword ? 'eye-off' : 'eye'}
                        size={15}
                        opacity={0.35}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.field}>
                  <View style={styles.fieldLblRow}>
                    <AuthFieldIcon name="shield" size={11} color={authColors.muted} />
                    <Text style={styles.fieldLbl}>CONFIRM PASSWORD</Text>
                  </View>
                  <View style={styles.inpWrap}>
                    <AuthFieldIcon name="shield" size={15} opacity={0.32} />
                    <TextInput
                      style={styles.inp}
                      placeholder="Confirm your password"
                      placeholderTextColor={authColors.textPlaceholder}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                      <AuthFieldIcon
                        name={showConfirmPassword ? 'eye-off' : 'eye'}
                        size={15}
                        opacity={0.35}
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.termsRow}
                  onPress={() => setAgreedToTerms(!agreedToTerms)}
                  activeOpacity={1}>
                  <View style={[styles.cb, agreedToTerms && styles.cbOn]}>
                    {agreedToTerms && <Text style={styles.cbCheck}>✓</Text>}
                  </View>
                  <View style={styles.termsTxtWrap}>
                    <Text style={styles.termsTxt}>I agree to the </Text>
                    <TouchableOpacity onPress={() => (navigation as any).getParent()?.navigate('TermsConditions')}>
                      <Text style={styles.termsLink}>Terms & Conditions</Text>
                    </TouchableOpacity>
                    <Text style={styles.termsTxt}> and </Text>
                    <TouchableOpacity onPress={() => (navigation as any).getParent()?.navigate('PrivacyPolicy')}>
                      <Text style={styles.termsLink}>Privacy Policy</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>

                <Animated.View style={{transform: [{scale: buttonScale}]}}>
                  <TouchableOpacity
                    style={[
                      styles.ctaBtn,
                      (!selectedRole || isLoading || !agreedToTerms) && styles.ctaBtnDisabled,
                    ]}
                    onPress={handleRegister}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={isLoading || !selectedRole || !agreedToTerms}
                    activeOpacity={0.9}>
                    <LinearGradient
                      colors={
                        isLoading
                          ? ['#5a6a7a', '#4a5a6a']
                          : [...authColors.ctaGradient]
                      }
                      style={StyleSheet.absoluteFill}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 1}}
                    />
                    <Text style={styles.ctaBtnText}>
                      {isLoading ? 'Creating Account...' : `Register as ${getRoleLabel(selectedRole)}`}
                    </Text>
                    <View style={styles.arr}>
                      <Text style={styles.arrIcon}>→</Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>

                <View style={styles.cardFoot}>
                  <Text style={styles.cardFootText}>Already have an account? </Text>
                  <TouchableOpacity onPress={() => (navigation as any).navigate('Login')}>
                    <Text style={styles.cardFootLink}>Login now</Text>
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
  },
  fieldLblRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  fieldLblRowPhone: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldLblIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  verifiedBadge: {
    fontSize: 10.5,
    fontFamily: authFonts.sectionLabel,
    color: colors.success,
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
    gap: 9,
  },
  phoneInpWrap: {
    flex: 1,
  },
  inp: {
    flex: 1,
    fontSize: 13.5,
    fontFamily: authFonts.body,
    color: authColors.textWhite,
    padding: 0,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phonePrefix: {
    backgroundColor: authColors.inputBg,
    borderWidth: 1.5,
    borderColor: authColors.inputBorder,
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 48,
    justifyContent: 'center',
    minWidth: 56,
  },
  phonePrefixText: {
    fontSize: 13.5,
    fontFamily: authFonts.button,
    color: 'rgba(255,255,255,0.6)',
  },
  verifyBtn: {
    backgroundColor: authColors.blue2,
    borderRadius: 13,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70,
  },
  verifyBtnVerified: {
    backgroundColor: colors.success,
  },
  verifyBtnText: {
    fontSize: 12,
    fontFamily: authFonts.button,
    color: authColors.textWhite,
  },
  eyeBtn: {
    padding: 8,
  },
  eyeIcon: {
    fontSize: 15,
    opacity: 0.7,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 18,
  },
  cb: {
    width: 18,
    height: 18,
    marginTop: 2,
    flexShrink: 0,
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
  termsTxtWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsTxt: {
    fontSize: 12,
    fontFamily: authFonts.body,
    color: authColors.muted,
    lineHeight: 18,
  },
  termsLink: {
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

export default RegisterScreen;
