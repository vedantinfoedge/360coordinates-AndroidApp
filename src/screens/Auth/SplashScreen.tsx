import React, {useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, typography, spacing} from '../../theme';
import {verticalScale, moderateScale} from '../../utils/responsive';
import {useAuth} from '../../context/AuthContext';

const Gradient = LinearGradient as React.ComponentType<any>;
const {width} = Dimensions.get('window');

type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const {isAuthenticated, user, isLoading} = useAuth();

  useEffect(() => {
    if (!isLoading) {
          const timer = setTimeout(() => {
            if (isAuthenticated && user) {
              // Navigate to role-based dashboard
              // Allow buyer and seller to access each other's dashboards
              if (user.user_type === 'buyer' || user.user_type === 'seller') {
                (navigation as any).replace('Buyer'); // Default to Buyer dashboard
              } else if (user.user_type === 'agent') {
                (navigation as any).replace('Agent');
              } else {
                (navigation as any).replace('Auth');
              }
            } else {
              // Guest user: open Buyer screen directly to browse properties
              (navigation as any).replace('Buyer');
            }
          }, 2500);

      return () => clearTimeout(timer);
    }
  }, [navigation, isAuthenticated, user, isLoading]);

  return (
    <Gradient
      colors={[colors.primary, colors.secondary]}
      style={styles.container}>
      <View style={styles.wrapper}>
        <View style={styles.content}>
          <Image
            source={require('../../assets/loadinglogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.tagline}>Find Your Dream Property in India</Text>
        </View>
        <ActivityIndicator size="large" color={colors.surface} style={styles.loader} />
      </View>
    </Gradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.4,
    height: width * 0.4,
    marginBottom: spacing.lg,
  },
  appName: {
    ...typography.h1,
    color: colors.surface,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  wrapper: {
    flex: 1,
    width: '100%',
  },
  tagline: {
    ...typography.body,
    fontSize: moderateScale(20),
    lineHeight: moderateScale(28),
    color: colors.surface,
    opacity: 0.9,
    textAlign: 'center',
  },
  loader: {
    position: 'absolute',
    bottom: verticalScale(spacing.xxl * 2),
  },
});

export default SplashScreen;

