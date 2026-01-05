import React, {useEffect, useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, typography, spacing} from '../../theme';
import {useAuth} from '../../context/AuthContext';

type SplashScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Splash'
>;

const SplashScreen: React.FC = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();
  const {isAuthenticated, user, isLoading} = useAuth();
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    // Wait for auth to load, then navigate after 3 seconds
    if (!isLoading) {
      const timer = setTimeout(() => {
        if (isAuthenticated && user) {
          // Navigate to role-based dashboard
          if (user.role === 'buyer') {
            navigation.replace('BuyerTabs');
          } else if (user.role === 'seller') {
            navigation.replace('SellerTabs');
          } else if (user.role === 'agent') {
            navigation.replace('AgentTabs');
          } else {
            navigation.replace('Auth');
          }
        } else {
          // Navigate to Auth if not authenticated
          navigation.replace('Auth');
        }
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [navigation, isAuthenticated, user, isLoading]);

  const handleSkip = () => {
    if (isAuthenticated && user) {
      // Navigate to role-based dashboard
      if (user.role === 'buyer') {
        navigation.replace('BuyerTabs');
      } else if (user.role === 'seller') {
        navigation.replace('SellerTabs');
      } else if (user.role === 'agent') {
        navigation.replace('AgentTabs');
      } else {
        navigation.replace('Auth');
      }
    } else {
      navigation.replace('Auth');
    }
  };

  return (
    <View style={styles.container}>
      {/* Status Bar Area */}
      <View style={styles.statusBar}>
        <Text style={styles.statusBarText}>9:41</Text>
        <View style={styles.battery}>
          <View style={styles.batteryLevel} />
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Browser Logo */}
        <Image
          source={require('../../assets/broserlogo.jpeg')}
          style={styles.browserLogo}
          resizeMode="contain"
        />

        {/* App Name */}
        <Text style={styles.appName}>IndiaPropertys</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Find Your Dream Home</Text>
      </View>

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        <View style={[styles.dot, styles.dotActive]} />
        <View style={styles.dot} />
        <View style={styles.dot} />
      </View>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface, // White background
    justifyContent: 'space-between',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  statusBarText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  battery: {
    width: 24,
    height: 12,
    borderWidth: 1,
    borderColor: colors.text,
    borderRadius: 2,
    padding: 1,
  },
  batteryLevel: {
    flex: 1,
    backgroundColor: colors.text,
    borderRadius: 1,
    width: '80%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  browserLogo: {
    width: 200,
    height: 200,
    marginBottom: spacing.xl,
  },
  appName: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 18,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.text,
  },
  skipButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default SplashScreen;

