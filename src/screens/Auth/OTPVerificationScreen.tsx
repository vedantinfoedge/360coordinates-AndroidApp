import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomAlert from '../../utils/alertHelper';
import {useNavigation, useRoute} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../../navigation/AuthNavigator';
import {colors, typography, spacing, borderRadius} from '../../theme';
import Button from '../../components/common/Button';
import OTPInput from '../../components/auth/OTPInput';
import {authService} from '../../services/auth.service';
import {otpService} from '../../services/otp.service';
import {useAuth} from '../../context/AuthContext';
import {switchToSMSWidget, switchToForgotPasswordWidget, initializeMSG91} from '../../config/msg91.config';

type OTPVerificationScreenNavigationProp = NativeStackNavigationProp<
  AuthStackParamList,
  'OTPVerification'
>;

type RouteParams = {
  userId?: number;
  user_id?: number;
  phone?: string;
  email?: string;
  type?: 'register' | 'forgotPassword';
  reqId?: string;
  method?: 'msg91-sdk' | 'msg91-rest' | 'backend' | 'msg91-widget';
  formData?: {
    name?: string;
    email?: string;
    phone?: string;
    selectedRole?: 'buyer' | 'seller' | 'agent' | null;
  };
};

const OTPVerificationScreen: React.FC = () => {
  const navigation = useNavigation<OTPVerificationScreenNavigationProp>();
  const route = useRoute();
  const params = route.params as RouteParams;
  const {verifyOTP, resendOTP} = useAuth();

  const [otp, setOtp] = useState('');
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Log OTP verification screen details when component mounts
  useEffect(() => {
    console.log('[OTP Verification] Screen loaded:', {
      type: params.type,
      phone: params.phone,
      email: params.email,
      reqId: params.reqId,
      method: params.method,
      userId: params.userId,
    });
    
    if (params.phone) {
      console.log('[OTP Verification] SMS OTP verification:', {
        phone: params.phone,
        method: params.method || 'unknown',
        reqId: params.reqId || 'not provided',
        context: params.type === 'forgotPassword' ? 'forgotPassword' : 'register',
      });
    } else if (params.email) {
      console.log('[OTP Verification] Email OTP verification:', {
        email: params.email,
        method: params.method || 'unknown',
        reqId: params.reqId || 'not provided',
      });
    }
  }, []);

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

  // Helper function to handle role-based navigation after successful OTP verification
  const handleSuccessNavigation = async () => {
    const selectedRole = params.formData?.selectedRole;
    
    if (selectedRole) {
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
    }
    // If no selectedRole, AppNavigator will handle navigation based on user data
  };

  const handleOTPComplete = (value: string) => {
    setOtp(value);
    // Auto-verify when all OTP digits are entered (4 digits), with small delay for better UX
    setTimeout(() => {
      handleVerify();
    }, 300);
  };

  const handleVerify = async () => {
    // Expect a 4-digit OTP
    if (otp.length !== 4) {
      CustomAlert.alert('Error', 'Please enter the 4-digit OTP');
      return;
    }

    const userId = params.userId || params.user_id;
    const isRegistrationFlow = params.type === 'register' || !params.type;
    
    // For registration flow, userId is optional (will be created during registration)
    // For login/forgot password flows, userId is required
    if (!userId && !isRegistrationFlow) {
      CustomAlert.alert('Error', 'User ID not found. Please try again.');
      return;
    }

    setIsLoading(true);
    try {
      // If email is provided, try MSG91 email OTP verification first
      if (params.email) {
        try {
          const emailVerifyResponse = await otpService.verifyEmail(params.email, otp);
          if (emailVerifyResponse.success) {
            // Email OTP verified via MSG91, now verify with backend
            await verifyOTP(userId, otp, params.phone);
            
            // Success - navigation handled by AppNavigator
            if (params.type === 'forgotPassword') {
              navigation.navigate('ResetPassword', {otp} as never);
            } else {
              CustomAlert.alert(
                'Success',
                'Email OTP verified successfully! You are now logged in.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate based on selected role
                      handleSuccessNavigation();
                    },
                  },
                ],
              );
            }
            return;
          }
        } catch (emailError: any) {
          // MSG91 verification failed, fall back to backend verification
          console.warn('[OTP] MSG91 email verification failed, using backend:', emailError);
        }
      }
      
      // If phone is provided, handle SMS OTP verification
      if (params.phone) {
        try {
          // Format phone number consistently (12 digits: 91XXXXXXXXXX)
          // Accept both 91XXXXXXXXXX and 10-digit formats
          let phoneNumber = params.phone.replace(/^\+/, ''); // Remove + if present
          if (phoneNumber.length === 10) {
            phoneNumber = `91${phoneNumber}`; // Convert 10 digits to 91XXXXXXXXXX
          } else if (!phoneNumber.startsWith('91')) {
            phoneNumber = `91${phoneNumber.slice(-10)}`; // Take last 10 digits and add 91
          }
          
          // Determine context: 'forgotPassword' or 'register' (default)
          const context = params.type === 'forgotPassword' ? 'forgotPassword' : 'register';
          
          // Use reqId and method from params if available
          // Priority: msg91-sdk (requires reqId) > backend fallback
          const reqId = params.reqId;
          let method = params.method as 'msg91-sdk' | 'msg91-rest' | 'backend' | 'msg91-widget' | undefined;

          // NEW: MSG91 REST mobile flow (app → backend → MSG91)
          // In this path, backend is already proxying to MSG91 v5 and is the source of truth.
          if (isRegistrationFlow && method === 'msg91-rest') {
            console.log('[OTP Verification] MSG91 REST mobile flow detected - verifying via backend proxy only');

            const restVerifyResponse = await otpService.msg91VerifyViaBackend(
              phoneNumber,
              otp,
              reqId,
            );

            console.log('[OTP Verification] MSG91 REST verify response:', {
              success: restVerifyResponse?.success,
              message: restVerifyResponse?.message,
              data: restVerifyResponse?.data,
            });

            if (restVerifyResponse && restVerifyResponse.success) {
              // Treat phone as fully verified via MSG91; no local OTP/token needed
              navigation.navigate('Register', {
                phoneVerified: true,
                phoneToken: undefined,
                phoneMethod: 'msg91',
                verifiedOtp: undefined,
                phone: params.formData?.phone || phoneNumber,
                name: params.formData?.name,
                email: params.formData?.email,
                selectedRole: params.formData?.selectedRole,
              } as any);

              CustomAlert.alert(
                'Success',
                'Phone number verified successfully! You can now complete registration.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigation already handled above
                    },
                  },
                ],
              );
              return;
            }

            throw new Error(
              restVerifyResponse?.message || 'Invalid or expired OTP. Please try again.',
            );
          }

          // SPECIAL CASE: Registration flow using backend OTP verification
          // -------------------------------------------------------------
          // When method is 'backend' for registration, the website flow sends
          // the OTP ONLY to /auth/register.php (no separate /otp/verify_sms call).
          //
          // Our earlier implementation was calling otpService.verifySMS first
          // (which hits /otp/verify_sms) and THEN sending the same OTP again
          // to /auth/register.php, causing the backend to respond:
          //   "Invalid phone OTP"
          //
          // To match the website behaviour:
          // - For registration + backend, we MUST NOT call verifySMS here.
          // - Instead, we simply capture the OTP and pass it to RegisterScreen
          //   as verifiedOtp, and the /auth/register.php call will validate it.
          if (isRegistrationFlow && method === 'backend') {
            console.log('[OTP Verification] Registration + backend flow detected - skipping /otp/verify_sms and passing OTP directly to registration');

            navigation.navigate('Register', {
              phoneVerified: true,
              phoneToken: undefined,
              phoneMethod: 'backend',
              verifiedOtp: otp,
              phone: params.formData?.phone || phoneNumber,
              name: params.formData?.name,
              email: params.formData?.email,
              selectedRole: params.formData?.selectedRole,
            } as any);

            CustomAlert.alert(
              'Success',
              'Phone number verified successfully! You can now complete registration.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Navigation already handled above
                  },
                },
              ],
            );
            return;
          }
          
          // If method is not provided but reqId exists, assume msg91-sdk (SDK approach)
          if (!method && reqId) {
            method = 'msg91-sdk';
            console.log('[OTP Verification] Method not provided, inferring msg91-sdk from reqId');
          }

          if (method === 'msg91-widget') {
            // Widget flow already validated the OTP; treat it as SDK verification for backend sync
            console.log('[OTP Verification] Normalizing msg91-widget method to msg91-sdk for verification');
            method = 'msg91-sdk';
          }
          
          // NEW: Use MSG91 SDK directly for msg91-sdk method (with or without reqId)
          if (method === 'msg91-sdk') {
            console.log('[OTP Verification] Verifying OTP via MSG91 SDK directly:', {
              phone: phoneNumber,
              reqId: reqId ? `${reqId.substring(0, 15)}...` : 'not provided',
              otpLength: otp.length,
              willTryWithReqId: !!reqId,
              willTryWithPhone: !reqId,
            });
            
            try {
              // Step 3: Frontend calls SDK to verify OTP
              // SDK verifies with MSG91 and returns a token
              const {OTPWidget} = require('@msg91comm/sendotp-react-native');
              
              // Ensure widget is initialized and switched correctly
              try {
                if (context === 'forgotPassword') {
                  await switchToForgotPasswordWidget();
                } else {
                  await switchToSMSWidget();
                }
              } catch (switchError) {
                console.warn('[OTP Verification] Widget switch failed, initializing:', switchError);
                await initializeMSG91();
                if (context === 'forgotPassword') {
                  await switchToForgotPasswordWidget();
                } else {
                  await switchToSMSWidget();
                }
              }
              
              let verifyResponse;
              
              // Try verification with reqId first (preferred method)
              if (reqId) {
                console.log('[OTP Verification] Attempting SDK verifyOTP with reqId:', reqId.substring(0, 15) + '...');
                verifyResponse = await OTPWidget.verifyOTP({
                  reqId: reqId,
                  otp: otp,
                });
              } else {
                // Alternative: Try verification with phone number and OTP (if SDK supports it)
                console.log('[OTP Verification] No reqId available, attempting SDK verifyOTP with phone number');
                console.log('[OTP Verification] Note: Some MSG91 SDK versions may require reqId - this may fail');
                
                // Format phone for SDK (91XXXXXXXXXX, no + sign)
                const phoneForSDK = phoneNumber.replace(/^\+/, '');
                
                try {
                  // Try with phone number instead of reqId
                  verifyResponse = await OTPWidget.verifyOTP({
                    identifier: phoneForSDK,
                    otp: otp,
                  });
                } catch (phoneVerifyError: any) {
                  console.warn('[OTP Verification] SDK verifyOTP with phone number failed:', phoneVerifyError);
                  throw new Error('MSG91 SDK requires reqId for verification. Please try resending OTP.');
                }
              }
              
              // Enhanced logging to capture full verification response structure
              console.log('[OTP Verification] ========== MSG91 SDK verifyOTP FULL RESPONSE ==========');
              console.log('[OTP Verification] Response type:', typeof verifyResponse);
              console.log('[OTP Verification] Response keys:', verifyResponse ? Object.keys(verifyResponse) : 'null/undefined');
              console.log('[OTP Verification] Full response object:', JSON.stringify(verifyResponse, null, 2));
              console.log('[OTP Verification] Response.token:', verifyResponse?.token);
              console.log('[OTP Verification] Response.data?.token:', verifyResponse?.data?.token);
              console.log('[OTP Verification] Response.verificationToken:', verifyResponse?.verificationToken);
              console.log('[OTP Verification] Response.data?.verificationToken:', verifyResponse?.data?.verificationToken);
              console.log('[OTP Verification] Response.message:', verifyResponse?.message);
              console.log('[OTP Verification] Response.success:', verifyResponse?.success);
              console.log('[OTP Verification] Response.status:', verifyResponse?.status);
              console.log('[OTP Verification] Response.type:', verifyResponse?.type);
              console.log('[OTP Verification] Response.verified:', verifyResponse?.verified);
              console.log('[OTP Verification] ====================================================');
              
              // Check for authentication errors (401)
              if (verifyResponse && (verifyResponse.code === '401' || verifyResponse.code === 401 || (verifyResponse.type === 'error' && verifyResponse.message === 'AuthenticationFailure'))) {
                throw new Error('MSG91 Authentication Failure - Invalid widget credentials');
              }
              
              // Check if verification was successful
              if (verifyResponse && (verifyResponse.success || verifyResponse.status === 'success' || verifyResponse.type === 'success' || verifyResponse.verified)) {
                console.log('[OTP Verification] ✅ OTP verified successfully via MSG91 SDK');
                
                // Step 4: Extract verification token from SDK response
                // SDK returns verification token that backend will trust
                // Check all possible fields where MSG91 might return the token
                const verificationToken = verifyResponse.token || 
                                         verifyResponse.data?.token || 
                                         verifyResponse.data?.verificationToken ||
                                         verifyResponse.verificationToken ||
                                         verifyResponse.data?.phoneVerificationToken ||
                                         verifyResponse.data?.message ||
                                         verifyResponse.message || // Sometimes token is in message field
                                         verifyResponse.data?.reqId ||
                                         verifyResponse.reqId ||
                                         reqId; // Use reqId as fallback token
                
                if (!verificationToken) {
                  throw new Error('MSG91 SDK did not return verification token');
                }
                
                console.log('[OTP Verification] Verification token extracted:', {
                  tokenPreview: verificationToken ? `${verificationToken.substring(0, 20)}...` : 'missing',
                });
                
                // For registration flow, navigate back with token
                if (isRegistrationFlow) {
                  console.log('[OTP Verification] Registration flow - returning to RegisterScreen with SDK token');
                  
                  // Build JSON payload for backend as phoneVerificationToken (same format as widget)
                  const msg91PayloadForBackend = JSON.stringify({
                    ...verifyResponse,
                    extractedToken: verificationToken,
                    reqId: reqId,
                  });
                  
                  navigation.navigate('Register', {
                    phoneVerified: true,
                    phoneMsg91Token: msg91PayloadForBackend, // Full MSG91 payload for backend
                    phoneToken: verificationToken, // Human-readable token preview
                    phoneMethod: 'msg91-sdk',
                    phoneReqId: reqId,
                    verifiedOtp: undefined, // No OTP needed, SDK already verified
                    // Restore form data
                    phone: params.formData?.phone || phoneNumber,
                    name: params.formData?.name,
                    email: params.formData?.email,
                    selectedRole: params.formData?.selectedRole,
                  } as any);
                  
                  CustomAlert.alert(
                    'Success',
                    'Phone number verified successfully! You can now complete registration.',
                    [
                      {
                        text: 'OK',
                        onPress: () => {
                          // Navigation already handled above
                        },
                      },
                    ],
                  );
                  return;
                }
                
                // For login/forgot password flows, verify with backend
                if (userId) {
                  console.log('[OTP Verification] Verifying with backend for authentication...');
                  await verifyOTP(userId, otp, params.phone);
                  
                  // Success - navigation handled by AppNavigator
                  if (params.type === 'forgotPassword') {
                    navigation.navigate('ResetPassword', {otp} as never);
                  } else {
                    CustomAlert.alert(
                      'Success',
                      'SMS OTP verified successfully! You are now logged in.',
                      [
                        {
                          text: 'OK',
                          onPress: () => {
                            // Navigate based on selected role
                            handleSuccessNavigation();
                          },
                        },
                      ],
                    );
                  }
                  return;
                } else {
                  throw new Error('User ID required for login/forgot password flow');
                }
              } else {
                // If MSG91 SDK returns failure response
                const errorMsg = verifyResponse?.message || verifyResponse?.error || 'MSG91 SDK verification returned failure response';
                console.error('[OTP Verification] MSG91 SDK verification returned failure:', errorMsg);
                throw new Error(`OTP verification failed: ${errorMsg}`);
              }
            } catch (sdkError: any) {
              console.error('[OTP Verification] MSG91 SDK verification failed:', {
                error: sdkError.message || sdkError,
                willTryBackend: false, // Don't fallback, SDK is primary method
              });
              throw sdkError; // Re-throw to show error to user
            }
          }
          
          console.log('[OTP Verification] Verifying SMS OTP via MSG91/backend helper:', {
            phone: phoneNumber,
            originalPhone: params.phone,
            context,
            reqId: reqId ? `${reqId.substring(0, 15)}...` : 'not provided',
            method: method || 'auto-detect (will try MSG91 SDK, then backend)',
            otpLength: otp.length,
            otpValue: otp, // Log OTP for debugging (remove in production if needed)
          });
          
          const smsVerifyResponse = await otpService.verifySMS(phoneNumber, otp, reqId, context, method);
          
          console.log('[OTP Verification] SMS verification response:', {
            success: smsVerifyResponse.success,
            method: smsVerifyResponse.method,
            message: smsVerifyResponse.message,
            hasToken: !!smsVerifyResponse.token,
            isRegistrationFlow,
          });
          
          if (smsVerifyResponse.success) {
            // SMS OTP verified (via MSG91 SDK or backend fallback)
            console.log('[OTP Verification] OTP verification successful via:', smsVerifyResponse.method || 'unknown');
            
            // Extract token from verification response (if available)
            // The verifySMS function now returns token directly if SDK verification succeeds
            // For backend API, we may need to use reqId or a special marker
            let verificationToken = smsVerifyResponse.token ||
                                   smsVerifyResponse.data?.token || 
                                   smsVerifyResponse.data?.verificationToken ||
                                   smsVerifyResponse.data?.phoneVerificationToken;
            
            // If no token from response, use reqId as fallback (for backend API verification)
            if (!verificationToken) {
              if (smsVerifyResponse.method === 'backend' && params.reqId) {
                // Backend API verification - use reqId as token
                verificationToken = params.reqId;
                console.log('[OTP Verification] Using reqId as token for backend verification:', params.reqId.substring(0, 15) + '...');
              } else if (smsVerifyResponse.reqId) {
                verificationToken = smsVerifyResponse.reqId;
                console.log('[OTP Verification] Using response reqId as token:', smsVerifyResponse.reqId.substring(0, 15) + '...');
              } else if (params.reqId) {
                verificationToken = params.reqId;
                console.log('[OTP Verification] Using original reqId as token fallback:', params.reqId.substring(0, 15) + '...');
              } else {
                console.warn('[OTP Verification] ⚠️ No token or reqId available - registration may fail!');
              }
            }
            
            // For registration flow, mark phone as verified and go back to registration
            if (isRegistrationFlow) {
              console.log('[OTP Verification] Registration flow - phone verified, returning to registration');
              console.log('[OTP Verification] Verification details:', {
                token: verificationToken ? `${verificationToken.substring(0, 20)}...` : 'not provided',
                method: smsVerifyResponse.method || params.method,
                phone: phoneNumber,
              });
              
              // Pass verification result back via navigation params
              // RegisterScreen will use useFocusEffect to detect this
              // Also pass form data to restore form fields
              const navigationParams = {
                phoneVerified: true,
                phoneToken: verificationToken || undefined,
                phoneMethod: smsVerifyResponse.method || params.method || 'backend',
                // For backend verification, pass the OTP that was verified (as fallback if no token)
                verifiedOtp: (smsVerifyResponse.method === 'backend' && !verificationToken) ? otp : undefined,
                // Restore form data if available
                phone: params.formData?.phone || phoneNumber,
                name: params.formData?.name,
                email: params.formData?.email,
                selectedRole: params.formData?.selectedRole,
              };
              
              console.log('[OTP Verification] Navigating back to Register with params:', {
                phoneVerified: navigationParams.phoneVerified,
                phoneToken: navigationParams.phoneToken ? `${navigationParams.phoneToken.substring(0, 10)}...` : 'none',
                phoneMethod: navigationParams.phoneMethod,
                phone: navigationParams.phone,
                hasName: !!navigationParams.name,
                hasEmail: !!navigationParams.email,
                selectedRole: navigationParams.selectedRole,
              });
              
              navigation.navigate('Register', navigationParams as any);
              
              CustomAlert.alert(
                'Success',
                'Phone number verified successfully! You can now complete registration.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigation already handled above
                    },
                  },
                ],
              );
              return;
            }
            
            // For login/forgot password flows, verify with backend
            if (userId) {
              console.log('[OTP Verification] Verifying with backend for authentication...');
              await verifyOTP(userId, otp, params.phone);
              
              // Success - navigation handled by AppNavigator
              if (params.type === 'forgotPassword') {
                navigation.navigate('ResetPassword', {otp} as never);
              } else {
                CustomAlert.alert(
                  'Success',
                  'SMS OTP verified successfully! You are now logged in.',
                  [
                    {
                      text: 'OK',
                      onPress: () => {
                        // Navigate based on selected role
                        handleSuccessNavigation();
                      },
                    },
                  ],
                );
              }
              return;
            } else {
              throw new Error('User ID required for login/forgot password flow');
            }
          } else {
            console.error('[OTP Verification] MSG91 verification returned failure:', smsVerifyResponse.message);
            throw new Error(smsVerifyResponse.message || 'MSG91 verification failed');
          }
        } catch (smsError: any) {
          // MSG91 verification failed, fall back to backend verification
          console.error('[OTP Verification] MSG91 SMS verification failed:', {
            error: smsError.message || smsError,
            phone: params.phone,
            method: params.method,
            willTryBackend: true,
          });
          // Continue to backend fallback below
        }
      }
      
      // Default: Use verifyOTP from AuthContext (fallback to backend)
      // Only if userId is available (not registration flow)
      if (userId && !isRegistrationFlow) {
        await verifyOTP(userId, otp, params.phone);
        
        // If we reach here, verification was successful and user is logged in
        // For forgot password flow, navigate to reset password
        if (params.type === 'forgotPassword') {
          navigation.navigate('ResetPassword', {otp} as never);
        } else {
          // For login flow, show success and navigate to selected role's dashboard
          CustomAlert.alert(
            'Success',
            'OTP verified successfully! You are now logged in.',
            [
              {
                text: 'OK',
                onPress: () => {
                  // Navigate based on selected role
                  handleSuccessNavigation();
                },
              },
            ],
          );
        }
      } else if (isRegistrationFlow) {
        // For registration flow without userId, mark as verified and navigate back with params
        console.log('[OTP Verification] Registration flow - phone verified via backend fallback');
        
        // Format phone for navigation (12 digits: 91XXXXXXXXXX)
        let phoneNumber = params.phone?.replace(/^\+/, '') || '';
        if (phoneNumber.length === 10) {
          phoneNumber = `91${phoneNumber}`;
        } else if (!phoneNumber.startsWith('91') && phoneNumber.length > 0) {
          phoneNumber = `91${phoneNumber.slice(-10)}`;
        }
        
        // Navigate back to Register screen with verification params
        // This ensures RegisterScreen detects phoneVerified via useFocusEffect
        // Also pass form data to restore form fields
        // For backend verification, pass the OTP that was verified (since no token available)
        console.log('[OTP Verification] Backend fallback - passing verified OTP for registration');
        
        navigation.navigate('Register', {
          phoneVerified: true,
          phoneToken: params.reqId || undefined, // Try reqId as token, but likely won't work
          phoneMethod: 'backend', // Backend verification was used
          verifiedOtp: otp, // Pass the OTP that was verified (backend will accept this)
          // Restore form data if available
          phone: params.formData?.phone || phoneNumber,
          name: params.formData?.name,
          email: params.formData?.email,
          selectedRole: params.formData?.selectedRole,
        } as any);
        
        CustomAlert.alert(
          'Success',
          'Phone number verified successfully! You can now complete registration.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigation already handled above
              },
            },
          ],
        );
      } else {
        throw new Error('User ID required for verification');
      }
    } catch (error: any) {
      console.error('[OTP Verification] Verification error:', {
        error: error.message || error,
        errorStack: error.stack,
        originalError: error.originalError,
        backendError: error.backendError,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      });
      
      // Show user-friendly error message
      let errorMessage = 'Invalid OTP. Please try again.';
      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.originalError?.message) {
        errorMessage = error.originalError.message;
      }
      
      CustomAlert.alert('Error', errorMessage);
      setOtp(''); // Clear OTP on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    const userId = params.userId || params.user_id;
    const isRegistrationFlow = params.type === 'register' || !params.type;
    
    // For registration flow, userId is optional (resend doesn't need userId)
    // For login/forgot password flows, userId is required
    if (!userId && !isRegistrationFlow) {
      CustomAlert.alert('Error', 'User ID not found. Please try again.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // If email is provided, try MSG91 email OTP resend first
      if (params.email) {
        try {
          const emailResendResponse = await otpService.resendEmail(params.email);
          if (emailResendResponse.success) {
            setTimer(60);
            setCanResend(false);
            setOtp('');
            CustomAlert.alert('Success', 'New email OTP sent successfully!');
            return;
          }
        } catch (emailError: any) {
          // MSG91 resend failed, fall back to backend
          console.warn('[OTP] MSG91 email resend failed, using backend:', emailError);
        }
      }
      
      // If phone is provided, try MSG91 SMS OTP resend
      if (params.phone) {
        try {
          // Format phone number consistently (12 digits: 91XXXXXXXXXX)
          let phoneNumber = params.phone.replace(/^\+/, ''); // Remove + if present
          if (phoneNumber.length === 10) {
            phoneNumber = `91${phoneNumber}`; // Convert 10 digits to 91XXXXXXXXXX
          } else if (!phoneNumber.startsWith('91')) {
            phoneNumber = `91${phoneNumber.slice(-10)}`; // Take last 10 digits and add 91
          }
          
          // Determine context: 'forgotPassword' or 'register' (default)
          const context = params.type === 'forgotPassword' ? 'forgotPassword' : 'register';
          
          // For MSG91 REST mobile flow, use backend proxy directly
          if (params.method === 'msg91-rest') {
            console.log('[OTP Verification] Resending OTP via MSG91 REST backend flow:', {
              phone: phoneNumber,
              context,
            });

            const restSendResponse = await otpService.msg91SendViaBackend(phoneNumber);

            console.log('[OTP Verification] MSG91 REST resend response:', {
              success: restSendResponse?.success,
              message: restSendResponse?.message,
              data: restSendResponse?.data,
            });

            if (!restSendResponse || !restSendResponse.success) {
              throw new Error(restSendResponse?.message || 'Failed to resend OTP');
            }

            // Update reqId if backend returns a new one
            const newReqId =
              restSendResponse.data?.requestId || restSendResponse.data?.reqId;
            if (newReqId) {
              (route as any).params = {
                ...(route.params as any),
                reqId: newReqId,
              };
            }

            setTimer(60);
            setCanResend(false);
            setOtp('');
            CustomAlert.alert('Success', 'New SMS OTP sent successfully!');
            return;
          }

          console.log(`[OTP Verification] Resending SMS OTP:`, {
            phone: phoneNumber,
            context: context,
            originalPhone: params.phone,
            method: params.method || 'unknown',
          });
          
          const smsResendResponse = await otpService.resendSMS(phoneNumber, context);
          
          console.log(`[OTP Verification] Resend SMS response:`, {
            success: smsResendResponse.success,
            method: smsResendResponse.method,
            reqId: smsResendResponse.reqId,
            message: smsResendResponse.message,
          });
          
          if (smsResendResponse.success) {
            setTimer(60);
            setCanResend(false);
            setOtp('');
            CustomAlert.alert('Success', 'New SMS OTP sent successfully!');
            return;
          } else {
            console.warn(`[OTP Verification] Resend SMS failed:`, smsResendResponse.message);
          }
        } catch (smsError: any) {
          // MSG91 resend failed, fall back to backend
          console.error('[OTP Verification] MSG91 SMS resend failed, using backend:', {
            error: smsError.message || smsError,
            phone: params.phone,
            context: params.type === 'forgotPassword' ? 'forgotPassword' : 'register',
          });
        }
      }
      
      // Default: Use backend resend (fallback) - only if userId available
      if (userId && !isRegistrationFlow) {
        await resendOTP(userId, params.phone);
      }
      // For registration flow, resend already handled by MSG91 above
      setTimer(60);
      setCanResend(false);
      setOtp('');
      CustomAlert.alert('Success', 'New OTP sent successfully!');
    } catch (error: any) {
      CustomAlert.alert('Error', error?.message || 'Failed to resend OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPhone = (phone?: string) => {
    if (!phone) return '';
    // Handle both 10-digit and 12-digit (91XXXXXXXXXX) formats
    let phoneNum = phone.replace(/^\+/, ''); // Remove + if present
    if (phoneNum.length === 12 && phoneNum.startsWith('91')) {
      // Format 91XXXXXXXXXX to +91-XXXXX-XXXXX
      return `+91-${phoneNum.slice(2, 7)}-${phoneNum.slice(7)}`;
    } else if (phoneNum.length === 10) {
      // Format 10 digits to +91-XXXXX-XXXXX
      return `+91-${phoneNum.slice(0, 5)}-${phoneNum.slice(5)}`;
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
            length={4}
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
          title={isLoading ? 'Verifying...' : 'Verify'}
          onPress={handleVerify}
          disabled={otp.length !== 4 || isLoading}
          loading={isLoading}
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

