import React, {useEffect, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  BackHandler,
  Image,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';

type SellSelectionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SellSelection'>;

type Props = {
  navigation: SellSelectionScreenNavigationProp;
};

const SellSelectionScreen: React.FC<Props> = ({navigation}) => {
  const {isAuthenticated, user} = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  // Handle Android hardware back button
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        navigation.navigate('Initial' as never);
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [navigation])
  );

  const handleOptionSelect = (option: 'seller' | 'agent' | 'builder') => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      // Navigate to login/register with the selected role
      navigation.navigate('Auth' as never, {
        screen: 'Login',
        params: {userType: option, requireAuth: true},
      } as never);
    } else {
      // User is authenticated, navigate to appropriate dashboard via MainTabs
      navigation.reset({
        index: 0,
        routes: [{name: 'MainTabs' as never, params: {screen: option === 'seller' ? 'Seller' : option === 'agent' ? 'Agent' : 'Builder'}}],
      });
    }
  };

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{translateY: slideAnim}],
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, animatedStyle]}>
          <View style={styles.headerSection}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.navigate('Initial' as never)}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Choose Your Role</Text>
            <Text style={styles.subtitle}>
              Select how you want to list your property
            </Text>
          </View>

          <View style={styles.optionsSection}>
            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleOptionSelect('seller')}
              activeOpacity={0.8}>
              <View style={styles.optionImageContainer}>
                <Image
                  source={require('../../assets/Seller.jpg')}
                  style={styles.optionImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.optionTitle}>Owner / Seller</Text>
              <Text style={styles.optionDescription}>
                List your property directly as an owner
              </Text>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>✓ Add unlimited properties</Text>
                <Text style={styles.featureItem}>✓ Manage inquiries</Text>
                <Text style={styles.featureItem}>✓ Track views and leads</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleOptionSelect('agent')}
              activeOpacity={0.8}>
              <View style={styles.optionImageContainer}>
                <Image
                  source={require('../../assets/agent.jpg')}
                  style={styles.optionImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.optionTitle}>Agent</Text>
              <Text style={styles.optionDescription}>
                List properties on behalf of clients
              </Text>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>✓ Manage multiple properties</Text>
                <Text style={styles.featureItem}>✓ Client management tools</Text>
                <Text style={styles.featureItem}>✓ Advanced analytics</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionCard}
              onPress={() => handleOptionSelect('builder')}
              activeOpacity={0.8}>
              <View style={styles.optionImageContainer}>
                <Image
                  source={require('../../assets/builder.jpg')}
                  style={styles.optionImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={styles.optionTitle}>Builder</Text>
              <Text style={styles.optionDescription}>
                List your construction projects
              </Text>
              <View style={styles.featureList}>
                <Text style={styles.featureItem}>✓ Project listings</Text>
                <Text style={styles.featureItem}>✓ Unit management</Text>
                <Text style={styles.featureItem}>✓ Builder dashboard</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  headerSection: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  optionsSection: {
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  optionCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionImageContainer: {
    width: '100%',
    height: 180,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary,
  },
  optionImage: {
    width: '100%',
    height: '100%',
  },
  optionTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  optionDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  featureList: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  featureItem: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingLeft: spacing.sm,
  },
});

export default SellSelectionScreen;

