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
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {BuilderTabParamList} from '../../components/navigation/BuilderTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {propertyService} from '../../services/property.service';
import {fixImageUrl, isValidImageUrl} from '../../utils/imageHelper';
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

// Property image type (matches website format)
interface PropertyImage {
  id: number;
  url: string;
  alt: string;
}

const BuilderPropertyDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout, user} = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const imageScrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadPropertyDetails();
  }, [route.params.propertyId]);

  // Reset image index when property changes
  useEffect(() => {
    if (property && property.images && property.images.length > 0) {
      setCurrentImageIndex(0);
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
        
        // Convert array of strings to array of objects (like website)
        let propertyImages: PropertyImage[] = [];
        
        // Primary: Extract from images array and convert to objects
        if (propData.images && Array.isArray(propData.images) && propData.images.length > 0) {
          propertyImages = propData.images
            .map((img: any, idx: number) => {
              if (typeof img === 'string') {
                const trimmed = img.trim();
                if (trimmed && trimmed !== '' && trimmed !== 'null' && trimmed !== 'undefined') {
                  const fixedUrl = fixImageUrl(trimmed);
                  if (fixedUrl && isValidImageUrl(fixedUrl) && !fixedUrl.includes('placeholder')) {
                    return {
                      id: idx + 1,
                      url: fixedUrl,
                      alt: propData.title || `Project image ${idx + 1}`
                    };
                  }
                }
              } else if (typeof img === 'object' && img !== null) {
                const url = img.url || img.image_url || img.src || img.path || img.image || '';
                if (url && typeof url === 'string') {
                  const fixedUrl = fixImageUrl(url.trim());
                  if (fixedUrl && isValidImageUrl(fixedUrl)) {
                    return {
                      id: idx + 1,
                      url: fixedUrl,
                      alt: propData.title || `Project image ${idx + 1}`
                    };
                  }
                }
              }
              return null;
            })
            .filter((img: PropertyImage | null): img is PropertyImage => {
              if (!img || !img.url || img.url.length === 0) return false;
              return isValidImageUrl(img.url);
            });
        }
        
        // Fallback: Use cover_image if no images array found
        if (propertyImages.length === 0 && propData.cover_image) {
          const coverImageUrl = fixImageUrl(propData.cover_image);
          if (coverImageUrl && isValidImageUrl(coverImageUrl) && !coverImageUrl.includes('placeholder')) {
            propertyImages = [{
              id: 1,
              url: coverImageUrl,
              alt: propData.title || 'Project image'
            }];
          }
        }
        
        // Final fallback: Placeholder
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
      const shareUrl = `https://demo1.indiapropertys.com/property/${property.id}`;
      const priceText = property.price 
        ? `₹${parseFloat(property.price).toLocaleString('en-IN')}${property.status === 'rent' ? '/month' : ''}`
        : 'Price not available';
      const shareMessage = `Check out this project!\n\n${property.title || 'Project'}\n📍 ${property.location || property.city || 'Location not specified'}\n💰 ${priceText}\n\n${property.description ? property.description.substring(0, 100) + '...' : ''}\n\nView more details: ${shareUrl}`;
      
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
  const propertyImages: PropertyImage[] = property.images && Array.isArray(property.images) && property.images.length > 0
    ? property.images.filter((img: any): img is PropertyImage => {
        return img && 
               typeof img === 'object' && 
               img.url && 
               typeof img.url === 'string' &&
               img.url.trim() !== '' &&
               img.url.startsWith('http');
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
                onMomentumScrollEnd={event => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                  );
                  if (index >= 0 && index < propertyImages.length) {
                    setCurrentImageIndex(index);
                  }
                }}
                onScroll={event => {
                  const index = Math.round(
                    event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
                  );
                  if (index >= 0 && index < propertyImages.length && index !== currentImageIndex) {
                    setCurrentImageIndex(index);
                  }
                }}
                scrollEventThrottle={16}
                style={styles.imageCarousel}
                contentContainerStyle={{
                  ...styles.imageCarouselContent,
                  width: SCREEN_WIDTH * propertyImages.length,
                }}
                decelerationRate="fast"
                snapToInterval={SCREEN_WIDTH}
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
                      defaultSource={require('../../assets/logo.jpeg')}
                      onError={(error) => {
                        console.error(`[BuilderPropertyDetails] Image ${index} failed to load:`, image.url);
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Image Counter */}
              {propertyImages.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {propertyImages.length}
                  </Text>
                </View>
              )}
          
              {/* Navigation Arrows */}
              {propertyImages.length > 1 && (
                <>
                  <TouchableOpacity
                    style={[styles.carouselNavButton, styles.carouselNavButtonLeft]}
                    onPress={() => {
                      const newIndex = currentImageIndex > 0 
                        ? currentImageIndex - 1 
                        : propertyImages.length - 1;
                      setCurrentImageIndex(newIndex);
                      imageScrollViewRef.current?.scrollTo({
                        x: newIndex * SCREEN_WIDTH,
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
                      imageScrollViewRef.current?.scrollTo({
                        x: newIndex * SCREEN_WIDTH,
                        animated: true,
                      });
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.carouselNavButtonText}>›</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Image Indicators/Dots */}
              {propertyImages.length > 1 && (
                <View style={styles.imageIndicators}>
                  {propertyImages.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setCurrentImageIndex(index);
                        imageScrollViewRef.current?.scrollTo({
                          x: index * SCREEN_WIDTH,
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
                source={require('../../assets/logo.jpeg')}
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
          <Text style={styles.location}>📍 {property.location || property.city || property.address || 'Location not specified'}</Text>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          {property.bedrooms && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🛏️</Text>
              <Text style={styles.infoText}>{property.bedrooms} Beds</Text>
            </View>
          )}
          {property.bathrooms && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🚿</Text>
              <Text style={styles.infoText}>{property.bathrooms} Baths</Text>
            </View>
          )}
          {property.area && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>📐</Text>
              <Text style={styles.infoText}>
                {typeof property.area === 'number' ? `${property.area} sq ft` : property.area}
              </Text>
            </View>
          )}
          {property.floor && (
            <View style={styles.infoItem}>
              <Text style={styles.infoIcon}>🏢</Text>
              <Text style={styles.infoText}>{property.floor}</Text>
            </View>
          )}
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
    height: 300,
    position: 'relative',
  },
  imageCarousel: {
    height: 300,
  },
  imageCarouselContent: {
    alignItems: 'center',
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: 300,
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
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    flex: 1,
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
  location: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  price: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '700',
  },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoIcon: {
    fontSize: 24,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  section: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
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
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
    gap: spacing.xs,
  },
  amenityIcon: {
    fontSize: 16,
    color: colors.success,
  },
  amenityText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
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

export default BuilderPropertyDetailsScreen;
