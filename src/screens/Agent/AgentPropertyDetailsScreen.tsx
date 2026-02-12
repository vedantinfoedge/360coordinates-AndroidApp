import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Share,
  Platform,
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {AgentStackParamList} from '../../navigation/AgentNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {propertyService} from '../../services/property.service';
import {fixImageUrl, isValidImageUrl, validateAndProcessPropertyImages, PropertyImage} from '../../utils/imageHelper';
import AgentHeader from '../../components/AgentHeader';
import {useAuth} from '../../context/AuthContext';
import ImageGallery from '../../components/common/ImageGallery';
import {formatters, capitalize, capitalizeAmenity} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';
import {verticalScale, moderateScale, scale} from '../../utils/responsive';

type PropertyDetailsScreenNavigationProp = NativeStackNavigationProp<
  AgentStackParamList,
  'PropertyDetails'
>;

type PropertyDetailsScreenRouteProp = RouteProp<AgentStackParamList, 'PropertyDetails'>;

type Props = {
  navigation: PropertyDetailsScreenNavigationProp;
  route: PropertyDetailsScreenRouteProp;
};

const {width: SCREEN_WIDTH} = Dimensions.get('window');
// Calculate image carousel width accounting for container margins (match Buyer UI)
const IMAGE_CAROUSEL_WIDTH = SCREEN_WIDTH - (spacing.md * 2);

// PropertyImage type is imported from imageHelper

const AgentPropertyDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout, user} = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageScrollViewRef = useRef<any>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set()); // Track failed image IDs

  useEffect(() => {
    loadPropertyDetails();
  }, [route.params.propertyId]);

  // Reset image index when property changes
  useEffect(() => {
    if (property && property.images && property.images.length > 0) {
      setCurrentImageIndex(0);
      setFailedImages(new Set()); // Reset failed images when property changes
      setTimeout(() => {
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
      console.log('[AgentPropertyDetails] Raw API Response:', {
        success: responseData?.success,
        hasData: !!responseData?.data,
        hasProperty: !!responseData?.data?.property,
        propertyId: responseData?.data?.property?.id,
        propertyTitle: responseData?.data?.property?.title,
        imagesField: responseData?.data?.property?.images,
        imagesType: typeof responseData?.data?.property?.images,
        imagesIsArray: Array.isArray(responseData?.data?.property?.images),
        imagesLength: responseData?.data?.property?.images?.length,
        imagesRaw: JSON.stringify(responseData?.data?.property?.images),
        coverImage: responseData?.data?.property?.cover_image,
      });
      
      if (responseData && responseData.success && responseData.data) {
        const propData = responseData.data.property || responseData.data;
        
        console.log('[AgentPropertyDetails] Property data before processing:', {
          hasImages: !!propData.images,
          imagesType: typeof propData.images,
          imagesIsArray: Array.isArray(propData.images),
          imagesLength: Array.isArray(propData.images) ? propData.images.length : 0,
          imagesRaw: JSON.stringify(propData.images),
          coverImage: propData.cover_image,
        });
        
        // ✅ Use helper function to validate and process images (EXACTLY like website)
        let propertyImages: PropertyImage[] = validateAndProcessPropertyImages(
          propData.images,
          propData.title || 'Property',
          propData.cover_image
        );
        
        console.log(`[AgentPropertyDetails] Processed ${propertyImages.length} valid images from ${propData.images?.length || 0} total`);
        console.log('[AgentPropertyDetails] Final propertyImages:', propertyImages.map(img => ({id: img.id, url: img.url})));
        
        // Final fallback: Placeholder (only if absolutely no images)
        if (propertyImages.length === 0) {
          propertyImages = [{
            id: 1,
            url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
            alt: propData.title || 'Property image'
          }];
        }
        
        // Store images as objects
        propData.images = propertyImages;
        
        setProperty(propData);
        setCurrentImageIndex(0);
      } else {
        CustomAlert.alert('Error', 'Failed to load property details');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('[AgentPropertyDetails] Error loading property:', error);
      CustomAlert.alert('Error', error.message || 'Failed to load property details');
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
      const shareMessage = `Check out this property!\n\n${property.title || 'Property'}\n📍 ${property.location || property.city || 'Location not specified'}\n💰 ${priceText}\n\n${property.description ? property.description.substring(0, 100) + '...' : ''}\n\nVisit us: https://360coordinates.com`;
      
      await Share.share({
        message: shareMessage,
        title: property.title || 'Property',
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing property:', error);
        CustomAlert.alert('Error', 'Failed to share property. Please try again.');
      }
    }
  };

  if (loading || !property) {
    return (
      <View style={styles.container}>
        <AgentHeader
          onProfilePress={() => (navigation as any).navigate('AgentTabs', {screen: 'Profile'})}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading property details...</Text>
        </View>
      </View>
    );
  }

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

  const normalizedStatus = String(property.status || property.listing_type || property.type || '')
    .trim()
    .toLowerCase();
  const isRentListing = normalizedStatus === 'rent';
  const isSaleListing = normalizedStatus === 'sale';

  const hasBachelorsFlag =
    property.available_for_bachelors !== undefined &&
    property.available_for_bachelors !== null;
  const availableForBachelors =
    property.available_for_bachelors === true ||
    property.available_for_bachelors === 'true' ||
    property.available_for_bachelors === 1 ||
    property.available_for_bachelors === '1';

  const handleOpenMap = async () => {
    const lat = property?.latitude;
    const lng = property?.longitude;
    if (!lat || !lng) {
      CustomAlert.alert('Location unavailable', 'This property does not have map coordinates.');
      return;
    }

    const url = `https://www.google.com/maps?q=${encodeURIComponent(String(lat))},${encodeURIComponent(String(lng))}`;
    try {
      await Linking.openURL(url);
    } catch (e) {
      CustomAlert.alert('Error', 'Unable to open maps.');
    }
  };

  return (
    <View style={styles.container}>
      <AgentHeader
        onProfilePress={() => (navigation as any).navigate('AgentTabs', {screen: 'Profile'})}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
        onLogoutPress={logout}
      />

      {/* Share Button - Positioned below header */}
      <View style={[styles.actionButtonsTop, {top: (insets.top + 60)}]}>
        <TouchableOpacity
          style={styles.shareButtonTop}
          onPress={(e: any) => {
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
                  width: IMAGE_CAROUSEL_WIDTH * propertyImages.length, // account for container margins
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
                    {failedImages.has(image.id) ? (
                      <View style={[styles.image, styles.imagePlaceholder]}>
                        <Text style={styles.imagePlaceholderText}>🏠</Text>
                        <Text style={styles.imagePlaceholderSubtext}>Image unavailable</Text>
                      </View>
                    ) : (
                      <Image
                        source={{uri: image.url}}
                        style={styles.image}
                        resizeMode="cover"
                        defaultSource={require('../../assets/logo.png')}
                        onError={(error: any) => {
                          console.error(`[AgentPropertyDetails] Image ${index} failed to load:`, image.url, error);
                          // Mark this image as failed
                          setFailedImages(prev => new Set(prev).add(image.id));
                        }}
                        onLoadStart={() => {
                          // Remove from failed set if it starts loading successfully
                          setFailedImages(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(image.id);
                            return newSet;
                          });
                        }}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Image Indicators/Dots */}
              {propertyImages.length > 1 && (
                <View style={styles.imageIndicators}>
                  {propertyImages.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setCurrentImageIndex(index);
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
          <Text style={styles.title}>{capitalize(property.title || property.property_title || 'Property Title')}</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.location} numberOfLines={2}>
              {property.location || property.city || property.address || 'Location not specified'}
            </Text>
          </View>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🛏</Text>
            </View>
            <Text style={styles.infoText}>
              {(property.bedrooms ?? '—')} Beds
            </Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🚿</Text>
            </View>
            <Text style={styles.infoText}>
              {(property.bathrooms ?? '—')} Baths
            </Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📐</Text>
            </View>
            <Text style={styles.infoText} numberOfLines={1}>
              {property.area
                ? (typeof property.area === 'number' ? `${property.area} sq ft` : String(property.area))
                : '—'}
            </Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🏢</Text>
            </View>
            <Text style={styles.infoText} numberOfLines={1}>
              {(property.floor === '0' || property.floor === 0)
                ? 'Ground floor'
                : (property.floor ?? '—')}
            </Text>
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this property</Text>
          <Text style={styles.description}>{property.description || 'No description available'}</Text>
        </View>

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
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
                {isSaleListing ? 'For Sale' : isRentListing ? 'For Rent' : property.type === 'buy' ? 'For Sale' : 'For Rent'}
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
            {isRentListing && hasBachelorsFlag ? (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Available for bachelors</Text>
                <Text style={styles.detailValue}>
                  {availableForBachelors ? 'Yes' : 'No'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {amenities.length > 0 ? (
              amenities.map((amenity: string, index: number) => {
                const getAmenityIcon = (name: string): string => {
                  const lowerName = name.toLowerCase();
                  if (lowerName.includes('parking') || lowerName.includes('car')) return '🚗';
                  if (lowerName.includes('gym') || lowerName.includes('fitness')) return '💪';
                  if (lowerName.includes('pool') || lowerName.includes('swimming')) return '🏊';
                  if (lowerName.includes('garden') || lowerName.includes('park')) return '🌳';
                  if (lowerName.includes('lift') || lowerName.includes('elevator')) return '🛗';
                  if (lowerName.includes('security') || lowerName.includes('guard')) return '🛡️';
                  if (lowerName.includes('wifi') || lowerName.includes('internet')) return '📶';
                  if (lowerName.includes('ac') || lowerName.includes('air condition')) return '❄️';
                  if (lowerName.includes('power') || lowerName.includes('backup') || lowerName.includes('generator')) return '⚡';
                  if (lowerName.includes('water') || lowerName.includes('supply')) return '💧';
                  if (lowerName.includes('cctv') || lowerName.includes('camera')) return '📹';
                  if (lowerName.includes('club') || lowerName.includes('community')) return '🏛️';
                  if (lowerName.includes('play') || lowerName.includes('children')) return '🎮';
                  if (lowerName.includes('balcony') || lowerName.includes('terrace')) return '🏠';
                  if (lowerName.includes('modular') || lowerName.includes('kitchen')) return '🍳';
                  if (lowerName.includes('wardrobe') || lowerName.includes('closet')) return '🚪';
                  if (lowerName.includes('fire') || lowerName.includes('safety')) return '🔥';
                  if (lowerName.includes('intercom')) return '📞';
                  if (lowerName.includes('gas') || lowerName.includes('pipeline')) return '🔥';
                  if (lowerName.includes('rain') || lowerName.includes('harvest')) return '🌧️';
                  if (lowerName.includes('solar')) return '☀️';
                  if (lowerName.includes('servant') || lowerName.includes('maid')) return '🧹';
                  if (lowerName.includes('visitor')) return '👥';
                  if (lowerName.includes('sport') || lowerName.includes('court')) return '🎾';
                  if (lowerName.includes('jogging') || lowerName.includes('track')) return '🏃';
                  if (lowerName.includes('laundry')) return '🧺';
                  if (lowerName.includes('pet')) return '🐕';
                  if (lowerName.includes('furnished')) return '🛋️';
                  if (lowerName.includes('vastu')) return '🧭';
                  return '✓';
                };

                return (
                  <View key={index} style={styles.amenityItem}>
                    <View style={styles.amenityIconContainer}>
                      <Text style={styles.amenityIcon}>{getAmenityIcon(amenity)}</Text>
                    </View>
                    <Text style={styles.amenityText} numberOfLines={2}>
                      {capitalizeAmenity(amenity)}
                    </Text>
                  </View>
                );
              })
            ) : (
              <Text style={styles.amenityText}>No amenities listed</Text>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.address}>
            {property.address || property.fullAddress || property.location || property.city || 'Address not available'}
          </Text>
          <TouchableOpacity style={styles.mapButton} onPress={handleOpenMap} activeOpacity={0.85}>
            <Text style={styles.mapButtonText}>View on Map</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={[styles.actionButtons, {paddingBottom: insets.bottom}]}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProperty', {propertyId: property.id})}>
          <Text style={styles.editButtonText}>✏️ Edit Property</Text>
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
    paddingBottom: verticalScale(100),
  },
  imageCarouselContainer: {
    height: verticalScale(450),
    position: 'relative',
    paddingTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginTop: spacing.xl + spacing.xl,
    backgroundColor: colors.surfaceSecondary,
  },
  imageCarousel: {
    height: verticalScale(410),
    borderRadius: borderRadius.xl,
  },
  imageCarouselContent: {
    alignItems: 'center',
  },
  imageContainer: {
    width: IMAGE_CAROUSEL_WIDTH,
    height: verticalScale(410),
    borderRadius: borderRadius.xl,
    paddingTop: spacing.md,
    overflow: 'hidden',
  },
  carouselNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: verticalScale(-24),
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      android: {
        elevation: 6,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },
  carouselNavButtonLeft: {
    left: spacing.md,
  },
  carouselNavButtonRight: {
    right: spacing.md,
  },
  carouselNavButtonText: {
    fontSize: moderateScale(28),
    color: colors.primary,
    fontWeight: 'bold',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xl,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  imagePlaceholderSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
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
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: colors.surface,
    width: scale(24),
  },
  imageCounter: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(2, 43, 95, 0.85)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    zIndex: 3,
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
    }),
  },
  imageCounterText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  actionButtonsTop: {
    position: 'absolute',
    paddingTop: spacing.xl,
    paddingRight: spacing.xs,
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.sm,
    lineHeight: 36,
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
    color: colors.primary,
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
    backgroundColor: colors.primary + '15',
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
    color: colors.secondary,
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary + '30',
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 50,
  },
  amenityIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  amenityIcon: {
    fontSize: 16,
  },
  amenityText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  mapButton: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40',
    marginTop: spacing.md,
  },
  mapButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 16,
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
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AgentPropertyDetailsScreen;
