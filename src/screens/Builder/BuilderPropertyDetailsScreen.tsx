import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {BuilderTabParamList} from '../../components/navigation/BuilderTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {propertyService} from '../../services/property.service';
import {fixImageUrl, isValidImageUrl, validateAndProcessPropertyImages, PropertyImage} from '../../utils/imageHelper';
import BuilderHeader from '../../components/BuilderHeader';
import {useAuth} from '../../context/AuthContext';
import ImageGallery from '../../components/common/ImageGallery';
import {formatters, capitalize, capitalizeAmenity} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type PropertyDetailsScreenNavigationProp = NativeStackNavigationProp<
  BuilderTabParamList,
  'PropertyDetails'
>;

type PropertyDetailsScreenRouteProp = RouteProp<BuilderTabParamList, 'PropertyDetails'>;

type Props = {
  navigation: PropertyDetailsScreenNavigationProp;
  route: PropertyDetailsScreenRouteProp;
};

const {width: SCREEN_WIDTH} = Dimensions.get('window');
// Calculate image carousel width accounting for container margins
const IMAGE_CAROUSEL_WIDTH = SCREEN_WIDTH - (spacing.md * 2);

// PropertyImage type is imported from imageHelper

const BuilderPropertyDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout, user} = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageScrollViewRef = useRef<any>(null);

  useEffect(() => {
    loadPropertyDetails();
  }, [route.params.propertyId]);

  // Reset image index when property changes
  useEffect(() => {
    if (property && property.images && property.images.length > 0) {
      setCurrentImageIndex(0);
      setTimeout(() => {
        // @ts-ignore
        imageScrollViewRef.current?.scrollTo({
          x: 0,
          animated: false,
        });
      }, 100);
    }
  }, [property?.id]);

  const loadPropertyDetails = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getPropertyDetails(route.params.propertyId);
      
      const responseData = response as any;
      console.log('[BuilderPropertyDetails] Raw API Response:', {
        success: responseData?.success,
        hasData: !!responseData?.data,
        hasProperty: !!responseData?.data?.property,
        propertyId: responseData?.data?.property?.id,
        propertyTitle: responseData?.data?.property?.title,
        imagesField: responseData?.data?.property?.images,
      });
      
      if (responseData && responseData.success && responseData.data) {
        const propData = responseData.data.property || responseData.data;
        
        // ✅ Use helper function to validate and process images (EXACTLY like website)
        let propertyImages: PropertyImage[] = validateAndProcessPropertyImages(
          propData.images,
          propData.title || 'Project',
          propData.cover_image
        );
        
        console.log(`[BuilderPropertyDetails] Processed ${propertyImages.length} valid images from ${propData.images?.length || 0} total`);
        
        // Final fallback: Placeholder (only if absolutely no images)
        if (propertyImages.length === 0) {
          propertyImages = [{
            id: 1,
            url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
            alt: propData.title || 'Project image'
          }];
        }
        
        // Store images as objects
        propData.images = propertyImages;
        
        setProperty(propData);
        setCurrentImageIndex(0);
      } else {
        CustomAlert.alert('Error', 'Failed to load project details');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('[BuilderPropertyDetails] Error loading project:', error);
      CustomAlert.alert('Error', error.message || 'Failed to load project details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleShareProperty = async () => {
    if (!property) return;
    
    try {
      const priceText = property.price 
        ? `₹${parseFloat(property.price).toLocaleString('en-IN')}${property.status === 'rent' ? '/month' : ''}`
        : 'Price not available';
      const shareMessage = `Check out this project!\n\n${property.title || 'Project'}\n📍 ${property.location || property.city || 'Location not specified'}\n💰 ${priceText}\n\n${property.description ? property.description.substring(0, 100) + '...' : ''}\n\nVisit us: https://360coordinates.com`;
      
      await Share.share({
        message: shareMessage,
        title: property.title || 'Project',
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing project:', error);
        CustomAlert.alert('Error', 'Failed to share project. Please try again.');
      }
    }
  };

  if (loading || !property) {
    return (
      <View style={styles.container}>
        <BuilderHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading project details...</Text>
        </View>
      </View>
    );
  }

  // Get property images - already converted to objects
  // Get property images - already converted to objects in loadPropertyDetails
  // Use all images that have a valid URL (don't filter out - they're already processed)
  const propertyImages: PropertyImage[] = property.images && Array.isArray(property.images) && property.images.length > 0
    ? property.images.filter((img: any): img is PropertyImage => {
        // Only filter out null/undefined or empty URLs
        return img && 
               typeof img === 'object' && 
               img.url && 
               typeof img.url === 'string' &&
               img.url.trim() !== '';
      })
    : [];
  
  const formattedPrice = property.price 
    ? formatters.price(parseFloat(property.price), property.status === 'rent')
    : 'Price not available';
  
  const amenities = property.amenities || [];
  const isUpcoming = property.project_type === 'upcoming';

  return (
    <View style={styles.container}>
      <BuilderHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />

      {/* Share Button - Positioned below header */}
      <View style={[styles.actionButtonsTop, {top: (insets.top + 60)}]}>
        <TouchableOpacity
          style={styles.shareButtonTop}
          onPress={(e) => {
            e.stopPropagation();
            handleShareProperty();
          }}
          activeOpacity={0.7}>
          <View style={styles.actionButtonInner}>
            <Text style={styles.shareIcon}>🔗</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content with Image */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Image Slider/Carousel */}
        <View style={styles.imageCarouselContainer}>
          {propertyImages.length > 0 ? (
            <>
              <ScrollView
                ref={imageScrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(event: any) => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / IMAGE_CAROUSEL_WIDTH,
                  );
                  if (index >= 0 && index < propertyImages.length) {
                    setCurrentImageIndex(index);
                  }
                }}
                onScroll={(event: any) => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / IMAGE_CAROUSEL_WIDTH,
                  );
                  if (index >= 0 && index < propertyImages.length && index !== currentImageIndex) {
                    setCurrentImageIndex(index);
                  }
                }}
                scrollEventThrottle={16}
                style={styles.imageCarousel}
                contentContainerStyle={{
                  ...styles.imageCarouselContent,
                  width: IMAGE_CAROUSEL_WIDTH * propertyImages.length,
                }}
                decelerationRate="fast"
                snapToInterval={IMAGE_CAROUSEL_WIDTH}
                snapToAlignment="center">
                {propertyImages.map((image: PropertyImage, index: number) => (
                  <TouchableOpacity
                    key={image.id}
                    style={styles.imageContainer}
                    onPress={() => {
                      setCurrentImageIndex(index);
                      setShowImageGallery(true);
                    }}
                    activeOpacity={0.9}>
                    <Image
                      source={{uri: image.url}}
                      style={styles.image}
                      resizeMode="cover"
                      defaultSource={require('../../assets/logo.png')}
                      onError={(error) => {
                        console.error(`[BuilderPropertyDetails] Image ${index} failed to load:`, image.url);
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Image Counter - Hidden per user request */}
              {/* {propertyImages.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {propertyImages.length}
                  </Text>
                </View>
              )} */}
          
              {/* Navigation Arrows - Hidden per user request */}
              {/* {propertyImages.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.carouselNavButton, styles.carouselNavButtonLeft]}
                    onPress={() => {
                      const newIndex = currentImageIndex > 0 
                        ? currentImageIndex - 1 
                        : propertyImages.length - 1;
                      setCurrentImageIndex(newIndex);
                      // @ts-ignore
                      imageScrollViewRef.current?.scrollTo({
                        x: newIndex * IMAGE_CAROUSEL_WIDTH,
                        animated: true,
                      });
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.carouselNavButtonText}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.carouselNavButton, styles.carouselNavButtonRight]}
                    onPress={() => {
                      const newIndex = currentImageIndex < propertyImages.length - 1 
                        ? currentImageIndex + 1 
                        : 0;
                      setCurrentImageIndex(newIndex);
                      // @ts-ignore
                      imageScrollViewRef.current?.scrollTo({
                        x: newIndex * IMAGE_CAROUSEL_WIDTH,
                        animated: true,
                      });
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.carouselNavButtonText}>›</Text>
                  </TouchableOpacity>
                </>
              )} */}

              {/* Image Indicators/Dots */}
              {propertyImages.length > 1 && (
                <View style={styles.imageIndicators}>
                  {propertyImages.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setCurrentImageIndex(index);
                        // @ts-ignore
                        imageScrollViewRef.current?.scrollTo({
                          x: index * IMAGE_CAROUSEL_WIDTH,
                          animated: true,
                        });
                      }}
                      activeOpacity={0.7}>
                      <View
                        style={[
                          styles.indicator,
                          index === currentImageIndex && styles.indicatorActive,
                        ]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imageContainer}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          )}
        </View>

        {/* Content Sections */}
        {/* Title and Price */}
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{capitalize(property.title || property.property_title || 'Project Title')}</Text>
            {isUpcoming && (
              <View style={styles.upcomingBadge}>
                <Text style={styles.upcomingBadgeText}>Upcoming Project</Text>
              </View>
            )}
          </View>
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.location}>{property.location || property.city || property.address || 'Location not specified'}</Text>
          </View>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🛏</Text>
            </View>
            <Text style={styles.infoText}>{property.bedrooms || 'N/A'} Beds</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🚿</Text>
            </View>
            <Text style={styles.infoText}>{property.bathrooms || 'N/A'} Baths</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📐</Text>
            </View>
            <Text style={styles.infoText}>
              {property.area ? (typeof property.area === 'number' ? `${property.area} sq ft` : property.area) : 'N/A'}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🏢</Text>
            </View>
            <Text style={styles.infoText}>{property.floor || 'N/A'}</Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this project</Text>
          <Text style={styles.description}>{property.description || 'No description available'}</Text>
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.detailsGrid}>
            {property.age && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Property Age</Text>
                <Text style={styles.detailValue}>{property.age}</Text>
              </View>
            )}
            {property.total_floors && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Total Floors</Text>
                <Text style={styles.detailValue}>{property.total_floors}</Text>
              </View>
            )}
            {property.facing && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Facing</Text>
                <Text style={styles.detailValue}>{property.facing}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <Text style={styles.detailValue}>
                {property.status === 'rent' ? 'For Rent' : 'For Sale'}
              </Text>
            </View>
            {property.property_type && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Property Type</Text>
                <Text style={styles.detailValue}>{property.property_type}</Text>
              </View>
            )}
            {property.furnishing && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Furnishing</Text>
                <Text style={styles.detailValue}>{property.furnishing}</Text>
              </View>
            )}
            {property.rera_number && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>RERA Number</Text>
                <Text style={styles.detailValue}>{property.rera_number}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Amenities */}
        {amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((amenity: string, index: number) => (
                <View key={index} style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>✓</Text>
                  <Text style={styles.amenityText}>{capitalizeAmenity(amenity)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.address}>
            {property.address || property.fullAddress || property.location || property.city || 'Address not available'}
          </Text>
          {property.latitude && property.longitude && (
            <Text style={styles.coordinates}>
              Coordinates: {property.latitude}, {property.longitude}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={[styles.actionButtons, {paddingBottom: insets.bottom}]}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProperty', {propertyId: property.id})}>
          <Text style={styles.editButtonText}>✏️ Edit Project</Text>
        </TouchableOpacity>
      </View>

      {/* Image Gallery Modal */}
      <ImageGallery
        visible={showImageGallery}
        images={propertyImages.map(img => img.url)}
        initialIndex={currentImageIndex}
        onClose={() => setShowImageGallery(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageCarouselContainer: {
    height: 450,
    position: 'relative',
    paddingTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginTop: spacing.xl + spacing.xl, // Extra space to show top rounded corners below header
    backgroundColor: colors.surfaceSecondary,
  },
  imageCarousel: {
    height: 410,
    borderRadius: borderRadius.xl,
  },
  imageCarouselContent: {
    alignItems: 'center',
  },
  imageContainer: {
    width: IMAGE_CAROUSEL_WIDTH,
    height: 410,
    borderRadius: borderRadius.xl,
    paddingTop: spacing.md,
    overflow: 'hidden',
  },
  carouselNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  carouselNavButtonLeft: {
    left: spacing.md,
  },
  carouselNavButtonRight: {
    right: spacing.md,
  },
  carouselNavButtonText: {
    fontSize: 24,
    color: colors.surface,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xl,
  },
  imageIndicators: {
    position: 'absolute',
    bottom: spacing.md,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    zIndex: 3,
    paddingVertical: spacing.xs,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: colors.surface,
    width: 24,
  },
  imageCounter: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 3,
  },
  imageCounterText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtonsTop: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 100,
    flexDirection: 'row',
    gap: spacing.sm,
    elevation: 10,
  },
  shareButtonTop: {
    zIndex: 101,
    elevation: 10,
  },
  actionButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  shareIcon: {
    fontSize: 18,
  },
  headerSection: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.secondary, // Dark Charcoal #1D242B
    flex: 1,
    lineHeight: 36,
  },
  upcomingBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  upcomingBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
    fontSize: 11,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  locationIcon: {
    fontSize: 16,
  },
  location: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    flex: 1,
  },
  price: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary, // Blue #0077C0
    marginTop: spacing.xs,
  },
  quickInfo: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-around',
    gap: spacing.sm,
  },
  infoCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    minHeight: 80,
    justifyContent: 'center',
    gap: spacing.xs,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary + '15', // 15% opacity purple
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.secondary, // Navy
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '30', // 30% opacity purple accent line
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
    fontSize: 16,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  detailItem: {
    width: '47%',
    padding: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      android: {
        elevation: 2,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 1},
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
    }),
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '47%',
    backgroundColor: colors.surfaceSecondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  amenityIcon: {
    fontSize: 16,
    color: colors.primary, // Purple checkmark
    fontWeight: 'bold',
  },
  amenityText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
    marginBottom: spacing.xs,
  },
  coordinates: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    flexDirection: 'row',
    gap: spacing.md,
  },
  editButton: {
    flex: 1,
    backgroundColor: colors.primary, // Purple background
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: colors.primary,
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
    }),
  },
  editButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default BuilderPropertyDetailsScreen;
