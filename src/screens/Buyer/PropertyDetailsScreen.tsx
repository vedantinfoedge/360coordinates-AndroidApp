import React, {useState, useEffect} from 'react';
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
  Alert,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {propertyService} from '../../services/property.service';
import {favoriteService} from '../../services/favorite.service';
import {fixImageUrl} from '../../utils/imageHelper';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import ImageGallery from '../../components/common/ImageGallery';

type PropertyDetailsScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<BuyerTabParamList>,
  NativeStackNavigationProp<RootStackParamList, 'PropertyDetails'>
>;

type Props = {
  navigation: PropertyDetailsScreenNavigationProp;
  route: {
    params: {
      propertyId: string;
    };
  };
};

const {width: SCREEN_WIDTH} = Dimensions.get('window');

const PropertyDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout} = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);

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
        setIsFavorite(propData.is_favorite || false);
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

  const handleToggleFavorite = async () => {
    if (!property) return;
    
    try {
      setTogglingFavorite(true);
      const response = await favoriteService.toggleFavorite(property.id);
      
      if (response && response.success) {
        const newFavoriteStatus = response.data?.is_favorite ?? !isFavorite;
        setIsFavorite(newFavoriteStatus);
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', error.message || 'Failed to update favorite');
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleChatWithOwner = () => {
    if (!property) return;
    navigation.navigate('Chat', {
      screen: 'ChatConversation',
      params: {
        userId: property.seller_id || property.seller_id || property.user_id,
        userName: property.seller_name || property.seller_name || 'Property Owner',
        propertyId: property.id || property.property_id,
        propertyTitle: property.title || property.property_title,
      },
    });
  };

  const handleViewContact = () => {
    setShowContactModal(true);
  };

  if (loading || !property) {
    return (
      <View style={[styles.container, styles.centerContainer]}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading property details...</Text>
      </View>
    );
  }

  // Format property data for display
  const propertyImages = property.images?.map((img: any) => 
    typeof img === 'string' ? fixImageUrl(img) : fixImageUrl(img.image_url || img.url)
  ) || [fixImageUrl(property.cover_image || '')].filter(Boolean);
  
  const formattedPrice = property.price 
    ? `₹${parseFloat(property.price).toLocaleString('en-IN')}`
    : 'Price not available';
  
  const amenities = property.amenities || [];

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />

      {/* Favorite Button - Positioned below header */}
      <TouchableOpacity
        style={[styles.favoriteButton, {top: (insets.top + 60)}]}
        onPress={handleToggleFavorite}
        disabled={togglingFavorite}>
        <View style={styles.favoriteButtonInner}>
          <Text style={styles.favoriteIcon}>
            {isFavorite ? '❤️' : '🤍'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Scrollable Content with Image */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Image Carousel */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={event => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
            );
            setCurrentImageIndex(index);
          }}
          scrollEventThrottle={16}
          style={styles.imageCarousel}>
          {propertyImages.length > 0 ? (
            propertyImages.map((imageUri: string, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.imageContainer}
                onPress={() => setShowImageGallery(true)}
                activeOpacity={0.9}>
                <Image
                  source={{uri: imageUri}}
                  style={styles.image}
                  resizeMode="cover"
                  defaultSource={require('../../assets/logo.jpeg')}
                />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.imageContainer}>
              <Image
                source={require('../../assets/logo.jpeg')}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          )}
        </ScrollView>

        {/* Image Indicators - Positioned over image */}
        {propertyImages.length > 1 && (
          <View style={styles.imageIndicators}>
            {propertyImages.map((_, index) => (
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

        {/* Content Sections */}
        {/* Title and Price */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{property.title || 'Property Title'}</Text>
          <Text style={styles.location}>📍 {property.location || property.city || 'Location not specified'}</Text>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🛏️</Text>
            <Text style={styles.infoText}>{property.bedrooms} Beds</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🚿</Text>
            <Text style={styles.infoText}>{property.bathrooms} Baths</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>📐</Text>
            <Text style={styles.infoText}>{property.area}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoIcon}>🏢</Text>
            <Text style={styles.infoText}>{property.floor}</Text>
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
                {property.type === 'buy' ? 'For Sale' : 'For Rent'}
              </Text>
            </View>
          </View>
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {amenities.length > 0 ? (
              amenities.map((amenity: string, index: number) => (
                <View key={index} style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>✓</Text>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noAmenitiesText}>No amenities listed</Text>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.address}>
            {property.address || property.fullAddress || property.location || 'Address not available'}
          </Text>
          <TouchableOpacity style={styles.mapButton}>
            <Text style={styles.mapButtonText}>View on Map</Text>
          </TouchableOpacity>
        </View>

        {/* Owner Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Owner Information</Text>
          <View style={styles.ownerCard}>
            <View style={styles.ownerHeader}>
              <View style={styles.ownerAvatar}>
                <Text style={styles.ownerAvatarText}>
                  {(property.seller_name || property.owner?.name || 'U')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()}
                </Text>
              </View>
              <View style={styles.ownerInfo}>
                <View style={styles.ownerNameRow}>
                  <Text style={styles.ownerName}>
                    {property.seller_name || property.owner?.name || 'Property Owner'}
                  </Text>
                  {(property.seller_verified || property.owner?.verified) && (
                    <Text style={styles.verifiedBadge}>✓ Verified</Text>
                  )}
                </View>
                <Text style={styles.ownerEmail}>
                  {property.seller_email || property.owner?.email || 'Email not available'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={[styles.actionButtons, {paddingBottom: insets.bottom}]}>
        <TouchableOpacity
          style={styles.contactButton}
          onPress={handleViewContact}>
          <Text style={styles.contactButtonText}>View Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.chatButton}
          onPress={handleChatWithOwner}>
          <Text style={styles.chatButtonText}>💬 Chat with Owner</Text>
        </TouchableOpacity>
      </View>

      {/* Contact Modal */}
      <Modal
        visible={showContactModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowContactModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Contact Details</Text>
              <TouchableOpacity onPress={() => setShowContactModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.contactDetails}>
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Name</Text>
                <Text style={styles.contactValue}>
                  {property.seller_name || property.owner?.name || 'Property Owner'}
                </Text>
              </View>
              {property.seller_phone && (
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  <TouchableOpacity>
                    <Text style={[styles.contactValue, styles.contactLink]}>
                      {property.seller_phone}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              {property.seller_email && (
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Email</Text>
                  <TouchableOpacity>
                    <Text style={[styles.contactValue, styles.contactLink]}>
                      {property.seller_email}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.modalChatButton}
              onPress={() => {
                setShowContactModal(false);
                handleChatWithOwner();
              }}>
              <Text style={styles.modalChatButtonText}>💬 Start Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Gallery Modal */}
      <ImageGallery
        visible={showImageGallery}
        images={propertyImages}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for sticky buttons
  },
  imageCarousel: {
    height: 300,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: 300,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageIndicators: {
    position: 'absolute',
    top: 270,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    zIndex: 2,
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
  backButton: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 20,
  },
  backButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },
  backIcon: {
    fontSize: 24,
    color: colors.text,
    fontWeight: 'bold',
  },
  favoriteButton: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 20,
  },
  favoriteButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      android: {
        elevation: 4,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 2},
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
    }),
  },
  favoriteIcon: {
    fontSize: 20,
  },
  contentContainer: {
    backgroundColor: colors.background,
    paddingBottom: spacing.xl,
  },
  headerSection: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  location: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  price: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  quickInfo: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    justifyContent: 'space-around',
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
    color: colors.text,
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
    fontWeight: '700',
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
    width: '47%',
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 12,
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
    width: '47%',
    gap: spacing.sm,
  },
  amenityIcon: {
    fontSize: 16,
    color: colors.text,
    fontWeight: 'bold',
  },
  amenityText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  address: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  mapButton: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  ownerCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  ownerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  ownerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ownerAvatarText: {
    ...typography.h3,
    color: colors.surface,
    fontWeight: '700',
  },
  ownerInfo: {
    flex: 1,
  },
  ownerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  ownerName: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  verifiedBadge: {
    ...typography.caption,
    color: colors.text,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    fontSize: 10,
  },
  ownerEmail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...Platform.select({
      android: {
        elevation: 8,
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: -2},
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  contactButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.text,
  },
  contactButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  chatButton: {
    flex: 1,
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  chatButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  modalClose: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  contactDetails: {
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  contactItem: {
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontSize: 12,
  },
  contactValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  contactLink: {
    color: colors.text,
    textDecorationLine: 'underline',
  },
  modalChatButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  modalChatButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default PropertyDetailsScreen;

