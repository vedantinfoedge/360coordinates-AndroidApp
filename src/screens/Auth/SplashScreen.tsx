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
import {useAuth} from '../../context/AuthContext';

const {width, height} = Dimensions.get('window');

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
              // Check if user has seen onboarding
              // For now, navigate to Auth (we'll add onboarding later)
              (navigation as any).replace('Auth');
            }
          }, 2500);

      return () => clearTimeout(timer);
    }
  }, [navigation, isAuthenticated, user, isLoading]);

  return (
    <LinearGradient
      colors={[colors.primary, colors.secondary]}
      style={styles.container}>
      <View style={styles.content}>
        <Image
          source={require('../../assets/broserlogo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>IndiaPropertys</Text>
        <Text style={styles.tagline}>Find Your Dream Property in India</Text>
      </View>
      <ActivityIndicator size="large" color={colors.surface} style={styles.loader} />
    </LinearGradient>
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
  tagline: {
    ...typography.body,
    color: colors.surface,
    opacity: 0.9,
    textAlign: 'center',
  },
  loader: {
    position: 'absolute',
    bottom: spacing.xxl * 2,
  },
});

export default SplashScreen;

