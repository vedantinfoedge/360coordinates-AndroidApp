import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  Platform,
  ActivityIndicator,
  Share,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SellerTabParamList } from '../../components/navigation/SellerTabNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon } from '../../components/navigation/TabIcons';
import { verticalScale, moderateScale, scale } from '../../utils/responsive';
import { propertyService } from '../../services/property.service';
import CustomAlert from '../../utils/alertHelper';
import { validateAndProcessPropertyImages, PropertyImage } from '../../utils/imageHelper';
import SellerHeader from '../../components/SellerHeader';
import { useAuth } from '../../context/AuthContext';
import ImageGallery from '../../components/common/ImageGallery';
import { Linking } from 'react-native';
import { capitalize, capitalizeAmenity } from '../../utils/formatters';

// Import WebView with error handling
let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch (error) {
  console.warn('[PropertyDetails] WebView not available:', error);
}

type SellerPropertyDetailsScreenNavigationProp = NativeStackNavigationProp<SellerTabParamList, 'PropertyDetails'>;

type Props = {
  navigation: SellerPropertyDetailsScreenNavigationProp;
  route: {
    params: {
      propertyId: string;
    };
  };
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Calculate image carousel width accounting for container margins
const IMAGE_CAROUSEL_WIDTH = SCREEN_WIDTH - (spacing.md * 2);

const PropertyDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + verticalScale(70);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { logout, user } = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageScrollViewRef = useRef<any>(null);

  useEffect(() => {
    loadPropertyDetails();
  }, [route.params.propertyId]);

  // Reset image index when property changes
  useEffect(() => {
    if (property && property.images && property.images.length > 0) {
      setCurrentImageIndex(0);
      // Reset scroll position to first image
      setTimeout(() => {
        imageScrollViewRef.current?.scrollTo({
          x: 0,
          animated: false,
        });
      }, 100);
    }
  }, [property?.id]);

  const canEditProperty = (property: any): boolean => {
    const createdAt = property.created_at || property.created_date || property.date_created;
    if (!createdAt) return true;

    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - createdDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    return diffHours < 24;
  };

  const loadPropertyDetails = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getPropertyDetails(route.params.propertyId);

      const responseData = response as any;

      if (responseData && responseData.success && responseData.data) {
        const propData = responseData.data.property || responseData.data;

        // Use helper function to validate and process images (EXACTLY like website/Buyer)
        let propertyImages: PropertyImage[] = validateAndProcessPropertyImages(
          propData.images,
          propData.title || 'Property',
          propData.cover_image
        );

        // Final fallback
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
      console.error('[PropertyDetails] Error loading property:', error);
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

  const handleEdit = () => {
    if (!property) return;
    navigation.navigate('AddProperty', {
      propertyId: property.id,
      isLimitedEdit: !canEditProperty(property),
      createdAt: property.created_at || property.created_date,
    });
  };

  // Check if video URL is valid
  const isValidVideoUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string') {
      return false;
    }
    const trimmedUrl = url.trim();
    if (trimmedUrl === '') return false;

    return (
      trimmedUrl.includes('youtube.com') ||
      trimmedUrl.includes('youtu.be') ||
      trimmedUrl.includes('vimeo.com') ||
      trimmedUrl.endsWith('.mp4') ||
      trimmedUrl.endsWith('.mov') ||
      trimmedUrl.endsWith('.webm') ||
      trimmedUrl.startsWith('http://') ||
      trimmedUrl.startsWith('https://')
    );
  };

  // Convert video URL to embed format
  const getVideoEmbedUrl = (url: string | null | undefined): string => {
    if (!url || typeof url !== 'string') return '';

    const trimmedUrl = url.trim();
    if (trimmedUrl.includes('youtube.com/watch?v=')) {
      const videoId = trimmedUrl.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (trimmedUrl.includes('youtu.be/')) {
      const videoId = trimmedUrl.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (trimmedUrl.includes('vimeo.com/')) {
      const videoId = trimmedUrl.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return trimmedUrl;
  };

  if (loading || !property) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading property details...</Text>
      </View>
    );
  }

  const amenities = property.amenities || [];
  const propertyImages = property.images || [];
  const videoUrl = property.video_url || property.video;
  const hasVideo = isValidVideoUrl(videoUrl);

  return (
    <View style={styles.container}>
      <SellerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onSubscriptionPress={() => navigation.navigate('Subscription')}
        onLogoutPress={logout}
        scrollY={scrollY}
      />

      <Animated.ScrollView
        ref={imageScrollViewRef as any}
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight + spacing.md }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false } // headerHeight interpolation might need false, or stick to just opacity
        )}
      >
        {/* Modern Image Carousel - Identical to Buyer */}
        <View style={styles.imageCarouselContainer}>
          <ScrollView
            ref={imageScrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            style={styles.imageCarousel}
            contentContainerStyle={styles.imageCarouselContent}
            onMomentumScrollEnd={(event: any) => {
              const slideSize = event.nativeEvent.layoutMeasurement.width;
              const index = event.nativeEvent.contentOffset.x / slideSize;
              const roundIndex = Math.round(index);
              setCurrentImageIndex(roundIndex);
            }}
          >
            {propertyImages.map((img: PropertyImage, index: number) => (
              <TouchableOpacity
                key={img.id || index}
                activeOpacity={0.9}
                onPress={() => setShowImageGallery(true)}
                style={styles.imageContainer}
              >
                <Image
                  source={{ uri: img.url }}
                  style={styles.image}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Image Navigation Buttons */}
          {propertyImages.length > 1 && (
            <>
              {currentImageIndex > 0 && (
                <TouchableOpacity
                  style={[styles.carouselNavButton, styles.carouselNavButtonLeft]}
                  onPress={() => {
                    const newIndex = currentImageIndex - 1;
                    imageScrollViewRef.current?.scrollTo({
                      x: newIndex * IMAGE_CAROUSEL_WIDTH, // Approximate width
                      animated: true
                    });
                    setCurrentImageIndex(newIndex);
                  }}
                >
                  <Text style={styles.carouselNavButtonText}>‹</Text>
                </TouchableOpacity>
              )}
              {currentImageIndex < propertyImages.length - 1 && (
                <TouchableOpacity
                  style={[styles.carouselNavButton, styles.carouselNavButtonRight]}
                  onPress={() => {
                    const newIndex = currentImageIndex + 1;
                    imageScrollViewRef.current?.scrollTo({
                      x: newIndex * IMAGE_CAROUSEL_WIDTH,
                      animated: true
                    });
                    setCurrentImageIndex(newIndex);
                  }}
                >
                  <Text style={styles.carouselNavButtonText}>›</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Indicators */}
          {propertyImages.length > 1 && (
            <View style={styles.imageIndicators}>
              {propertyImages.map((img: any, index: number) => (
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

          <TouchableOpacity style={styles.shareButton} onPress={handleShareProperty}>
            <Text style={styles.shareButtonText}>Share</Text>
          </TouchableOpacity>

          {hasVideo && (
            <TouchableOpacity style={styles.videoButton} onPress={() => setShowVideoModal(true)}>
              <TabIcon name="video" color={colors.surface} size={18} />
              <Text style={styles.videoButtonText}>Video Tour</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Property Info Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{property.title || 'Property Title'}</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.price}>
                {property.price ? `₹${parseFloat(property.price).toLocaleString('en-IN')}` : 'Price on Request'}
              </Text>
              {property.status === 'rent' && <Text style={styles.perMonth}>/mo</Text>}
            </View>
          </View>

          <View style={styles.locationRow}>
            <View style={styles.locationIconWrap}>
              <TabIcon name="location" color={colors.textSecondary} size={18} />
            </View>
            <Text style={styles.location}>{property.location || property.city || 'Location not available'}</Text>
          </View>

          {/* Key Specs Row */}
          <View style={styles.specsRow}>
            {property.bedrooms && (
              <View style={styles.specItem}>
                <TabIcon name="bed" color={colors.primary} size={20} />
                <Text style={styles.specValue}>{property.bedrooms} Beds</Text>
              </View>
            )}
            {property.bathrooms && (
              <View style={styles.specItem}>
                <TabIcon name="bath" color={colors.primary} size={20} />
                <Text style={styles.specValue}>{property.bathrooms} Baths</Text>
              </View>
            )}
            {property.area && (
              <View style={styles.specItem}>
                <TabIcon name="square" color={colors.primary} size={20} />
                <Text style={styles.specValue}>{property.area} sqft</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <TabIcon name="file-text" color={colors.primary} size={20} />
            <Text style={styles.sectionTitle}>Description</Text>
          </View>
          <Text style={styles.description}>
            {property.description || 'No description available for this property.'}
          </Text>
        </View>

        {/* Details Grid */}
        <View style={styles.section}>
          <View style={styles.sectionTitleContainer}>
            <TabIcon name="building" color={colors.primary} size={20} />
            <Text style={styles.sectionTitle}>Details</Text>
          </View>
          <View style={styles.detailsGrid}>
            {property.property_type && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Type</Text>
                <Text style={styles.detailValue}>{property.property_type}</Text>
              </View>
            )}
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Status</Text>
              <Text style={styles.detailValue}>
                {property.status === 'rent' ? 'For Rent' : 'For Sale'}
              </Text>
            </View>
            {property.furnishing && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Furnishing</Text>
                <Text style={styles.detailValue}>{property.furnishing}</Text>
              </View>
            )}
            {property.possession_status && (
              <View style={styles.detailItem}>
                <Text style={styles.detailLabel}>Possession</Text>
                <Text style={styles.detailValue}>{property.possession_status}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Amenities */}
        {amenities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <TabIcon name="sparkles" color={colors.primary} size={20} />
              <Text style={styles.sectionTitle}>Amenities</Text>
            </View>
            <View style={styles.amenitiesGrid}>
              {amenities.map((amenity: string, index: number) => (
                <View key={index} style={styles.amenityItem}>
                  <TabIcon name="check" color={colors.primary} size={16} />
                  <Text style={styles.amenityText}>{capitalizeAmenity(amenity)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {/* Seller Actions - Edit Button */}
      <View style={[styles.actionButtons, { paddingBottom: insets.bottom + spacing.sm }]}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleEdit}>
          <TabIcon name="edit" color={colors.surface} size={18} />
          <Text style={styles.editButtonText}>Edit Property</Text>
        </TouchableOpacity>
      </View>

      <ImageGallery
        visible={showImageGallery}
        images={propertyImages.map((img: PropertyImage) => img.url)}
        initialIndex={currentImageIndex}
        onClose={() => setShowImageGallery(false)}
      />

      {/* Video Modal */}
      {WebView && (
        <Modal
          visible={showVideoModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowVideoModal(false)}
        >
          <View style={styles.videoModalContainer}>
            <View style={styles.videoModalContent}>
              <TouchableOpacity
                style={styles.videoCloseButton}
                onPress={() => setShowVideoModal(false)}
              >
                <Text style={styles.videoCloseText}>Close</Text>
              </TouchableOpacity>
              <View style={styles.webViewContainer}>
                <WebView
                  source={{ uri: getVideoEmbedUrl(videoUrl) }}
                  style={styles.webView}
                  allowsFullscreenVideo={true}
                  javaScriptEnabled={true}
                  domStorageEnabled={true}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
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
    paddingBottom: 120, // Space for bottom buttons
  },
  imageCarouselContainer: {
    height: 450,
    position: 'relative',
    paddingTop: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
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
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadius.xl,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  indicatorActive: {
    backgroundColor: colors.surface,
    width: 32,
  },
  shareButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  shareButtonText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
  },
  videoButton: {
    position: 'absolute',
    bottom: spacing.xl + spacing.sm,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.round,
    zIndex: 10,
  },
  videoButtonIcon: {
    color: '#FFF',
    fontSize: 12,
    marginRight: 6,
  },
  videoButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  title: {
    ...typography.h2,
    flex: 1,
    color: colors.text,
    minWidth: 200,
  },
  priceBadge: {
    backgroundColor: colors.primary + '15', // 15% opacity
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    ...typography.h3,
    color: colors.primary,
  },
  perMonth: {
    ...typography.caption,
    color: colors.primary,
    marginLeft: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  locationIconWrap: {
    marginRight: spacing.xs,
  },
  location: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    justifyContent: 'space-around',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  specIcon: {
    fontSize: 18,
    marginRight: 6,
  },
  specValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  section: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
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
    marginTop: spacing.xs,
  },
  detailItem: {
    width: '47%', // 2 columns with gap
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
  },
  amenityIcon: {
    fontSize: 14,
    marginRight: 6,
    color: colors.primary,
  },
  amenityText: {
    ...typography.body,
    fontSize: 14,
    color: colors.text,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  editButtonText: {
    ...typography.h3,
    color: colors.surface,
    fontSize: 16,
  },
  videoModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
  },
  videoModalContent: {
    width: '100%',
    height: '60%',
    backgroundColor: '#000',
  },
  videoCloseButton: {
    padding: 15,
    alignItems: 'flex-end',
  },
  videoCloseText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
});

export default PropertyDetailsScreen;
