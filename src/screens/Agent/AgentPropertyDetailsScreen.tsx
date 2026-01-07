import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp, useSafeAreaInsets} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import AgentHeader from '../../components/AgentHeader';
import {propertyService} from '../../services/property.service';
import {fixImageUrl} from '../../utils/imageHelper';

type PropertyDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PropertyDetails'
>;

type PropertyDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  'PropertyDetails'
>;

type Props = {
  navigation: PropertyDetailsScreenNavigationProp;
  route: PropertyDetailsScreenRouteProp;
};

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const AgentPropertyDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout} = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    loadPropertyDetails();
  }, [route.params.propertyId]);

  const loadPropertyDetails = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getPropertyDetails(route.params.propertyId);
      
      if (response && response.success && response.data) {
        const propData = response.data.property || response.data;
        setProperty(propData);
      } else {
        Alert.alert('Error', 'Failed to load property details');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error loading property:', error);
      Alert.alert('Error', error.message || 'Failed to load property details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AgentHeader
          onProfilePress={() => navigation.navigate('Profile' as never)}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading property details...</Text>
        </View>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.container}>
        <AgentHeader
          onProfilePress={() => navigation.navigate('Profile' as never)}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onLogoutPress={logout}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Property not found</Text>
        </View>
      </View>
    );
  }

  const images = property.images || (property.cover_image ? [property.cover_image] : []);
  const formattedImages = images.map((img: string) => fixImageUrl(img));

  return (
    <View style={styles.container}>
      <AgentHeader
        onProfilePress={() => navigation.navigate('Profile' as never)}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onLogoutPress={logout}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        {formattedImages.length > 0 ? (
          <View style={styles.imageContainer}>
            <Image
              source={{uri: formattedImages[currentImageIndex]}}
              style={styles.mainImage}
              resizeMode="cover"
            />
            {formattedImages.length > 1 && (
              <View style={styles.imageIndicators}>
                {formattedImages.map((_: any, index: number) => (
                  <View
                    key={index}
                    style={[
                      styles.indicator,
                      index === currentImageIndex && styles.indicatorActive,
                    ]}
                  />
                ))}
              </View>
            )}
            {formattedImages.length > 1 && (
              <View style={styles.imageNavigation}>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() =>
                    setCurrentImageIndex(
                      currentImageIndex > 0
                        ? currentImageIndex - 1
                        : formattedImages.length - 1
                    )
                  }>
                  <Text style={styles.navButtonText}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.navButton}
                  onPress={() =>
                    setCurrentImageIndex(
                      currentImageIndex < formattedImages.length - 1
                        ? currentImageIndex + 1
                        : 0
                    )
                  }>
                  <Text style={styles.navButtonText}>›</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.placeholderText}>No Image Available</Text>
          </View>
        )}

        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              {property.title || property.property_title || 'Untitled Property'}
            </Text>
            <Text style={styles.location}>
              {property.location || property.city || property.address || 'Location not specified'}
            </Text>
            <Text style={styles.price}>
              {typeof property.price === 'number'
                ? `₹${property.price.toLocaleString('en-IN')}${property.status === 'rent' ? '/month' : ''}`
                : property.price || 'Price not available'}
            </Text>
          </View>

          {/* Details Section */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              {property.bedrooms && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bedrooms</Text>
                  <Text style={styles.detailValue}>{property.bedrooms}</Text>
                </View>
              )}
              {property.bathrooms && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Bathrooms</Text>
                  <Text style={styles.detailValue}>{property.bathrooms}</Text>
                </View>
              )}
              {property.area && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Area</Text>
                  <Text style={styles.detailValue}>
                    {typeof property.area === 'number'
                      ? `${property.area} sq ft`
                      : property.area}
                  </Text>
                </View>
              )}
              {property.built_year && (
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Year Built</Text>
                  <Text style={styles.detailValue}>{property.built_year}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Description */}
          {property.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{property.description}</Text>
            </View>
          )}

          {/* Features/Amenities */}
          {property.amenities && Array.isArray(property.amenities) && property.amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities</Text>
              {property.amenities.map((amenity: string, index: number) => (
                <View key={index} style={styles.featureItem}>
                  <Text style={styles.featureText}>• {amenity}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Property Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Property Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Property Type:</Text>
              <Text style={styles.infoValue}>
                {property.property_type || property.type || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>
                {property.status || property.property_status || 'N/A'}
              </Text>
            </View>
            {property.facing && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Facing:</Text>
                <Text style={styles.infoValue}>{property.facing}</Text>
              </View>
            )}
            {property.furnishing && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Furnishing:</Text>
                <Text style={styles.infoValue}>{property.furnishing}</Text>
              </View>
            )}
          </View>

          {/* Location Map Placeholder */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.mapContainer}>
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>📍</Text>
                <Text style={styles.mapPlaceholderLabel}>Property Location</Text>
                <Text style={styles.mapPlaceholderAddress}>
                  {property.address || property.location || property.city || 'Location not specified'}
                </Text>
                {property.latitude && property.longitude && (
                  <Text style={styles.mapPlaceholderCoords}>
                    {property.latitude}, {property.longitude}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h2,
    color: colors.text,
  },
  imageContainer: {
    height: 300,
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  imageIndicators: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: colors.surface,
  },
  imageNavigation: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 24,
    color: colors.surface,
    fontWeight: 'bold',
  },
  imagePlaceholder: {
    height: 300,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  location: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  featureItem: {
    marginBottom: spacing.xs,
  },
  featureText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  mapContainer: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  mapPlaceholderLabel: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  mapPlaceholderAddress: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  mapPlaceholderCoords: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default AgentPropertyDetailsScreen;
