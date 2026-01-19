import React, {useState, useEffect, useRef} from 'react';
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
  Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {BuyerTabParamList} from '../../components/navigation/BuyerTabNavigator';
import {CompositeNavigationProp} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {propertyService} from '../../services/property.service';
import {favoriteService} from '../../services/favorite.service';
import {buyerService} from '../../services/buyer.service';
import {fixImageUrl, isValidImageUrl} from '../../utils/imageHelper';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import ImageGallery from '../../components/common/ImageGallery';
import {Linking} from 'react-native';

type PropertyDetailsScreenNavigationProp = BottomTabNavigationProp<BuyerTabParamList, 'PropertyDetails'>;

type Props = {
  navigation: PropertyDetailsScreenNavigationProp;
  route: {
    params: {
      propertyId: string;
      returnFromLogin?: boolean;
    };
  };
};

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Property image type (matches website format)
interface PropertyImage {
  id: number;
  url: string;
  alt: string;
}

const TOTAL_INTERACTION_LIMIT = 5;
const INTERACTION_STORAGE_KEY = 'interaction_remaining';
const CONTACT_UNLOCK_PREFIX = 'contactUnlocked_';
const CHAT_STARTED_PREFIX = 'chatStarted_';

const PropertyDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout, user, isAuthenticated} = useAuth();
  const [property, setProperty] = useState<any>(null);
  
  // Check if user is guest
  const isLoggedIn = Boolean(user && isAuthenticated);
  const isGuest = !isLoggedIn;
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const imageScrollViewRef = useRef<ScrollView>(null);

  const [interactionState, setInteractionState] = useState({
    remaining: TOTAL_INTERACTION_LIMIT,
    max: TOTAL_INTERACTION_LIMIT,
  });
  const [interactionLoading, setInteractionLoading] = useState(true);
  const [contactUnlocked, setContactUnlocked] = useState(false);
  const [chatUnlocked, setChatUnlocked] = useState(false);
  const [processingContact, setProcessingContact] = useState(false);
  const [processingChat, setProcessingChat] = useState(false);

  useEffect(() => {
    loadPropertyDetails();
  }, [route.params.propertyId]);

  useEffect(() => {
    initializeInteractionState();
  }, []);

  useEffect(() => {
    if (property?.id) {
      loadPropertyUnlockState(property.id);
    } else {
      setContactUnlocked(false);
      setChatUnlocked(false);
    }
  }, [property?.id]);

  // Handle return from login - auto show contact details if user just logged in
  useEffect(() => {
    const params = route.params as any;
    if (params?.returnFromLogin === true && user && property && !showContactModal) {
      // User just logged in, automatically show contact details (one-time activity)
      const showContactAfterLogin = async () => {
        // Wait a bit for interaction state to initialize
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Only show if user is buyer
        if (user.user_type === 'buyer') {
          // Now show contact details (handleViewContact will check limit and unlock state)
          handleViewContact();
        }
      };
      
      showContactAfterLogin();
    }
  }, [user, property, route.params?.returnFromLogin, showContactModal]);

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

  const loadPropertyDetails = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getPropertyDetails(route.params.propertyId);
      
      // Comprehensive logging for debugging
      const responseData = response as any; // API service returns parsed data
      console.log('[PropertyDetails] Raw API Response:', {
        success: responseData?.success,
        hasData: !!responseData?.data,
        hasProperty: !!responseData?.data?.property,
        propertyId: responseData?.data?.property?.id,
        propertyTitle: responseData?.data?.property?.title,
        imagesField: responseData?.data?.property?.images,
        imagesType: typeof responseData?.data?.property?.images,
        imagesIsArray: Array.isArray(responseData?.data?.property?.images),
        imagesLength: responseData?.data?.property?.images?.length,
        firstImage: responseData?.data?.property?.images?.[0],
        coverImage: responseData?.data?.property?.cover_image,
      });
      
      if (responseData && responseData.success && responseData.data) {
        const propData = responseData.data.property || responseData.data;
        
        // ✅ CRITICAL: Convert array of strings to array of objects (EXACTLY like website)
        // Website does: prop.images.map((img, idx) => ({id: idx + 1, url: img, alt: prop.title}))
        // Backend returns: images: ["https://...", "https://...", ...] (array of URL strings)
        let propertyImages: PropertyImage[] = [];
        
        // Primary: Extract from images array and convert to objects
        if (propData.images && Array.isArray(propData.images) && propData.images.length > 0) {
          console.log(`[PropertyDetails] Converting ${propData.images.length} images to objects (like website)`);
          
          propertyImages = propData.images
            .map((img: any, idx: number) => {
              // Handle string URLs (primary format from backend)
                if (typeof img === 'string') {
                const trimmed = img.trim();
                if (trimmed && 
                    trimmed !== '' && 
                    trimmed !== 'null' && 
                    trimmed !== 'undefined' &&
                    trimmed.length > 0) {
                  // Backend already provides full URLs, but validate and fix if needed
                  const fixedUrl = fixImageUrl(trimmed);
                  if (fixedUrl && 
                      isValidImageUrl(fixedUrl) &&
                      !fixedUrl.includes('placeholder') &&
                      !fixedUrl.includes('unsplash.com')) {
                    // ✅ Convert to object format (like website)
                    return {
                      id: idx + 1,
                      url: fixedUrl,  // Full URL from backend
                      alt: propData.title || `Property image ${idx + 1}`
                    };
                  } else if (idx === 0) {
                    console.warn(`[PropertyDetails] Invalid image URL at index ${idx}:`, trimmed, '->', fixedUrl);
                  }
                }
              }
              // Handle object format (if backend ever returns objects)
              else if (typeof img === 'object' && img !== null) {
                const url = img.url || img.image_url || img.src || img.path || img.image || '';
                if (url && typeof url === 'string') {
                  const fixedUrl = fixImageUrl(url.trim());
                  if (fixedUrl && isValidImageUrl(fixedUrl)) {
                    return {
                      id: idx + 1,
                      url: fixedUrl,
                      alt: propData.title || `Property image ${idx + 1}`
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
        
        // Fallback 1: Check response.data.images (if backend returns at top level)
        if (propertyImages.length === 0 && responseData.data.images && Array.isArray(responseData.data.images)) {
          console.log('[PropertyDetails] Using fallback: response.data.images');
          propertyImages = responseData.data.images
            .map((img: any, idx: number) => {
              if (typeof img === 'string') {
                const trimmed = img.trim();
                if (trimmed && trimmed !== '' && trimmed !== 'null') {
                  const fixedUrl = fixImageUrl(trimmed);
                  if (fixedUrl && isValidImageUrl(fixedUrl) && !fixedUrl.includes('placeholder')) {
                    return {
                      id: idx + 1,
                      url: fixedUrl,
                      alt: propData.title || `Property image ${idx + 1}`
                    };
                  }
                }
                }
                return null;
              })
            .filter((img: PropertyImage | null): img is PropertyImage => {
              if (!img || !img.url) return false;
              return isValidImageUrl(img.url);
            });
        }
        
        // Fallback 2: Use cover_image if no images array found
        if (propertyImages.length === 0 && propData.cover_image) {
          console.log('[PropertyDetails] Using fallback: cover_image');
          const coverImageUrl = fixImageUrl(propData.cover_image);
          if (coverImageUrl && isValidImageUrl(coverImageUrl) && !coverImageUrl.includes('placeholder')) {
            propertyImages = [{
              id: 1,
              url: coverImageUrl,
              alt: propData.title || 'Property image'
            }];
          }
        }
        
        // Final fallback: Placeholder (only if absolutely no images)
        if (propertyImages.length === 0) {
          console.log('[PropertyDetails] Using final fallback: placeholder');
          propertyImages = [{
            id: 1,
            url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
            alt: propData.title || 'Property image'
          }];
        }
        
        // Log processing results
        console.log('[PropertyDetails] Image Processing Results:', {
          step1_rawImages: propData.images,
          step2_afterConversion: propertyImages,
          step3_finalCount: propertyImages.length,
          step4_allHaveUrl: propertyImages.every(img => img && img.url),
          step5_allUrlsValid: propertyImages.every(img => img && img.url && isValidImageUrl(img.url)),
          step6_coverImageFallback: propData.cover_image,
        });
        
        // Store images as objects (like website format)
        propData.images = propertyImages;
        
        // Final logging
        console.log('[PropertyDetails] Final Images Array (Objects):', {
          count: propertyImages.length,
          images: propertyImages.map(img => ({id: img.id, url: img.url, alt: img.alt})),
          allHaveUrl: propertyImages.every(img => img && img.url),
          allUrlsValid: propertyImages.every(img => img && img.url && isValidImageUrl(img.url)),
          firstImage: propertyImages[0],
          lastImage: propertyImages[propertyImages.length - 1],
          propertyId: propData.id,
        });
        
        // Extract seller data from nested structure (backend returns property.seller object)
        // Backend structure: { property: { seller: { name, phone, email } } }
        // Normalize to flat structure for backward compatibility
        if (propData.seller && typeof propData.seller === 'object') {
          propData.seller_name = propData.seller.name || propData.seller_name;
          propData.seller_phone = propData.seller.phone || propData.seller_phone;
          propData.seller_email = propData.seller.email || propData.seller_email;
          propData.seller_id = propData.seller.id || propData.seller.user_id || propData.seller_id;
        }
        
        // Debug: Log owner/seller information
        console.log('[PropertyDetails] Owner/Seller Information:', {
          seller_id: propData.seller_id,
          seller_name: propData.seller_name,
          seller_phone: propData.seller_phone,
          seller_email: propData.seller_email,
          seller: propData.seller, // Full seller object
          sellerName: propData.seller?.name,
          sellerPhone: propData.seller?.phone,
          sellerEmail: propData.seller?.email,
          owner: propData.owner,
          ownerName: propData.owner?.name || propData.owner?.full_name,
          ownerPhone: propData.owner?.phone,
          ownerEmail: propData.owner?.email,
          ownerId: propData.owner?.id || propData.owner?.user_id,
          hasOwnerData: !!(propData.owner || propData.seller || propData.seller_name || propData.seller_phone || propData.seller_email),
        });
        
        // Debug: Log each image
        console.log('=== IMAGE DEBUG ===');
        console.log('Total images:', propertyImages.length);
        propertyImages.forEach((img, idx) => {
          console.log(`Image ${idx + 1}:`, {
            id: img.id,
            url: img.url,
            urlLength: img.url.length,
            isValid: img.url.startsWith('http')
          });
        });
        console.log('==================');
        
        setProperty(propData);
        setIsFavorite(propData.is_favorite || false);
        setCurrentImageIndex(0); // Reset to first image
      } else {
        Alert.alert('Error', 'Failed to load property details');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('[PropertyDetails] Error loading property:', error);
      Alert.alert('Error', error.message || 'Failed to load property details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const initializeInteractionState = async () => {
    try {
      setInteractionLoading(true);
      const stored = await AsyncStorage.getItem(INTERACTION_STORAGE_KEY);
      let remaining = TOTAL_INTERACTION_LIMIT;

      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          remaining = Math.min(parsed, TOTAL_INTERACTION_LIMIT);
        }
      } else {
        await AsyncStorage.setItem(
          INTERACTION_STORAGE_KEY,
          TOTAL_INTERACTION_LIMIT.toString(),
        );
      }

      setInteractionState({
        remaining,
        max: TOTAL_INTERACTION_LIMIT,
      });
    } catch (error) {
      console.error('[PropertyDetails] Error loading interaction state:', error);
      setInteractionState({
        remaining: TOTAL_INTERACTION_LIMIT,
        max: TOTAL_INTERACTION_LIMIT,
      });
    } finally {
      setInteractionLoading(false);
    }
  };

  const loadPropertyUnlockState = async (propertyId: string | number) => {
    try {
      const id = String(propertyId);
      const keys = [
        `${CONTACT_UNLOCK_PREFIX}${id}`,
        `${CHAT_STARTED_PREFIX}${id}`,
      ];
      const results = await AsyncStorage.multiGet(keys);
      const contactValue = results.find(item => item[0] === keys[0])?.[1];
      const chatValue = results.find(item => item[0] === keys[1])?.[1];

      setContactUnlocked(contactValue === 'true');
      setChatUnlocked(chatValue === 'true');
    } catch (error) {
      console.error('[PropertyDetails] Error loading unlock state:', error);
      setContactUnlocked(false);
      setChatUnlocked(false);
    }
  };

  const consumeInteraction = async () => {
    try {
      const stored = await AsyncStorage.getItem(INTERACTION_STORAGE_KEY);
      let remaining = TOTAL_INTERACTION_LIMIT;

      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          remaining = Math.min(parsed, TOTAL_INTERACTION_LIMIT);
        }
      }

      if (remaining <= 0) {
        setInteractionState({
          remaining: 0,
          max: TOTAL_INTERACTION_LIMIT,
        });
        return {success: false, remaining: 0};
      }

      const newRemaining = remaining - 1;
      await AsyncStorage.setItem(
        INTERACTION_STORAGE_KEY,
        newRemaining.toString(),
      );
      setInteractionState({
        remaining: newRemaining,
        max: TOTAL_INTERACTION_LIMIT,
      });

      return {success: true, remaining: newRemaining};
    } catch (error) {
      console.error('[PropertyDetails] Error consuming interaction:', error);
      return {success: false, remaining: interactionState.remaining};
    }
  };

  const unlockContactForProperty = async (propertyId: string | number) => {
    try {
      await AsyncStorage.setItem(
        `${CONTACT_UNLOCK_PREFIX}${propertyId}`,
        'true',
      );
      setContactUnlocked(true);
    } catch (error) {
      console.error('[PropertyDetails] Error unlocking contact:', error);
    }
  };

  const markChatStartedForProperty = async (propertyId: string | number) => {
    try {
      await AsyncStorage.setItem(`${CHAT_STARTED_PREFIX}${propertyId}`, 'true');
      setChatUnlocked(true);
    } catch (error) {
      console.error('[PropertyDetails] Error saving chat state:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (!property) return;
    
    try {
      setTogglingFavorite(true);
      // Use buyerService for consistency with other buyer screens
      const response = await buyerService.toggleFavorite(property.id) as any;
      
      if (response && response.success) {
        const newFavoriteStatus = response.data?.is_favorite ?? !isFavorite;
        setIsFavorite(newFavoriteStatus);
        // Update property object
        setProperty({...property, is_favorite: newFavoriteStatus});
      } else {
        Alert.alert('Error', response?.message || 'Failed to update favorite');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', error.message || 'Failed to update favorite');
    } finally {
      setTogglingFavorite(false);
    }
  };

  const handleShareProperty = async () => {
    if (!property) return;
    
    try {
      const shareUrl = `https://demo1.indiapropertys.com/property/${property.id}`;
      const priceText = property.price 
        ? `₹${parseFloat(property.price).toLocaleString('en-IN')}${property.status === 'rent' ? '/month' : ''}`
        : 'Price not available';
      const shareMessage = `Check out this property!\n\n${property.title || 'Property'}\n📍 ${property.location || property.city || 'Location not specified'}\n💰 ${priceText}\n\n${property.description ? property.description.substring(0, 100) + '...' : ''}\n\nView more details: ${shareUrl}`;
      
      await Share.share({
        message: shareMessage,
        title: property.title || 'Property',
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('Error sharing property:', error);
        Alert.alert('Error', 'Failed to share property. Please try again.');
      }
    }
  };

  const handleChatWithOwner = async () => {
    if (processingChat) {
      return;
    }

    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login to chat with the owner.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Login',
            onPress: () => {
              // Navigate to auth, then return to this screen after login
              navigation.navigate('Auth' as never, {
                screen: 'Login',
                params: {returnTo: 'PropertyDetails', propertyId: route.params.propertyId},
              } as never);
            },
          },
        ]
      );
      return;
    }
    if (!property) {
      Alert.alert('Error', 'Property information not available');
      return;
    }

    if (interactionLoading) {
      Alert.alert('Please wait', 'Loading your interaction balance...');
      return;
    }
    
    const sellerId = property.seller_id || property.owner?.id || property.owner?.user_id || property.user_id;
    // Prioritize seller object from backend, then fallback to flat fields
    const sellerName = property.seller?.name || property.seller_name || property.owner?.name || property.owner?.full_name || 'Property Owner';
    const propId = property.id || property.property_id;
    const propTitle = property.title || property.property_title || 'Property';
    
    if (!sellerId) {
      Alert.alert('Error', 'Owner information not available');
      return;
    }

    try {
      setProcessingChat(true);

      if (!chatUnlocked) {
        const result = await consumeInteraction();
        if (!result.success) {
          Alert.alert(
            'Interaction limit reached',
            'Interaction limit reached. Upgrade to continue.',
          );
          return;
        }
        await markChatStartedForProperty(propId);
      }
    
      console.log('[PropertyDetails] Navigating to chat:', {
        userId: sellerId,
        userName: sellerName,
        propertyId: propId,
        propertyTitle: propTitle,
      });
      
      (navigation as any).navigate('Chat', {
        screen: 'ChatConversation',
        params: {
          userId: Number(sellerId),
          userName: sellerName,
          propertyId: Number(propId),
          propertyTitle: propTitle,
        },
      });
    } finally {
      setProcessingChat(false);
    }
  };

  const handleViewContact = async () => {
    console.log('[PropertyDetails] handleViewContact called', {
      showContactModal,
      user: user ? {id: user.id, type: user.user_type} : null,
      propertyId: property?.id,
      hasProperty: !!property,
    });
    
    if (processingContact) {
      return;
    }

    if (!property || !property.id) {
      Alert.alert('Error', 'Property information not available');
      return;
    }
    
    // Check if user is logged in
    if (!user) {
      Alert.alert(
        'Login Required',
        'Please login to view owner contact details.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Login',
            onPress: () => {
              // Navigate to auth, then return to this screen after login with flag to auto-show contact
              (navigation as any).navigate('Auth', {
                screen: 'Login',
                params: {
                  returnTo: 'PropertyDetails',
                  propertyId: route.params.propertyId,
                  autoShowContact: true,
                },
              });
            },
          },
        ]
      );
      return;
    }

    // Check if user is buyer
    if (user.user_type !== 'buyer') {
      Alert.alert('Access Denied', 'Only buyers can view owner contact details.');
      return;
    }

    // If already showing, just hide (no interaction deduction)
    if (showContactModal) {
      console.log('[PropertyDetails] Hiding contact modal');
      setShowContactModal(false);
      return;
    }

    // If contact already unlocked for this property, show immediately
    if (contactUnlocked) {
      setShowContactModal(true);
      return;
    }

    if (interactionLoading) {
      Alert.alert('Please wait', 'Loading your interaction balance...');
      return;
    }

    if (interactionState.remaining <= 0) {
      Alert.alert(
        'Interaction limit reached',
        'Interaction limit reached. Upgrade to continue.',
      );
      return;
    }

    try {
      setProcessingContact(true);
      const result = await consumeInteraction();

      if (!result.success) {
        Alert.alert(
          'Interaction limit reached',
          'Interaction limit reached. Upgrade to continue.',
        );
        return;
      }

      await unlockContactForProperty(property.id);
      setShowContactModal(true);
      console.log('[PropertyDetails] Contact unlocked for property:', property.id);
    } catch (error: any) {
      console.error('[PropertyDetails] Error in handleViewContact:', error);
      Alert.alert('Error', 'Failed to process contact view. Please try again.');
    } finally {
      setProcessingContact(false);
    }
  };

  const handlePhonePress = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(err => {
        console.error('Error opening phone:', err);
        Alert.alert('Error', 'Unable to open phone dialer.');
      });
    }
  };

  const handleEmailPress = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`).catch(err => {
        console.error('Error opening email:', err);
        Alert.alert('Error', 'Unable to open email client.');
      });
    }
  };

  if (loading || !property) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading property details...</Text>
      </View>
    );
  }

  // Get property images - already converted to objects in loadPropertyDetails (like website format)
  // Format: [{id: 1, url: "https://...", alt: "..."}, {id: 2, url: "https://...", alt: "..."}, ...]
  const propertyImages: PropertyImage[] = property.images && Array.isArray(property.images) && property.images.length > 0
    ? property.images.filter((img: any): img is PropertyImage => {
        // Ensure it's an object with url property (website format)
        return img && 
               typeof img === 'object' && 
               img.url && 
               typeof img.url === 'string' &&
               img.url.trim() !== '' &&
               img.url.startsWith('http');
      })
    : [];
  
  console.log('[PropertyDetails] Display images (Objects):', {
    count: propertyImages.length,
    images: propertyImages.map(img => ({id: img.id, url: img.url})),
    allHaveUrl: propertyImages.every(img => img && img.url),
  });
  
  const formattedPrice = property.price 
    ? `₹${parseFloat(property.price).toLocaleString('en-IN')}`
    : 'Price not available';
  
  const amenities = property.amenities || [];

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onLogoutPress={isLoggedIn ? logout : undefined}
        onSignInPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', {screen: 'Login'})
            : undefined
        }
        onSignUpPress={
          isGuest
            ? () => (navigation as any).navigate('Auth', {screen: 'Register'})
            : undefined
        }
        showLogout={isLoggedIn}
        showProfile={isLoggedIn}
        showSignIn={isGuest}
        showSignUp={isGuest}
      />

      {/* Favorite and Share Buttons - Positioned below header */}
      <View style={[styles.actionButtonsTop, {top: (insets.top + 60)}]}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            handleToggleFavorite();
          }}
          disabled={togglingFavorite}
          activeOpacity={0.7}>
          <View style={styles.favoriteButtonInner}>
            <Text style={styles.favoriteIcon}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.shareButtonTop}
          onPress={(e) => {
            e.stopPropagation();
            handleShareProperty();
          }}
          activeOpacity={0.7}>
          <View style={styles.favoriteButtonInner}>
            <Text style={styles.shareIcon}>🔗</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Scrollable Content with Image */}
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}>
        {/* Image Slider/Carousel - Display ALL property images */}
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
                  width: SCREEN_WIDTH * propertyImages.length,  // ✅ CRITICAL: Total width = screen width × image count
                }}
                decelerationRate="fast"
                snapToInterval={SCREEN_WIDTH}
                snapToAlignment="center">
                {/* ✅ CRITICAL: Map through ALL images using object format (like website) */}
                {propertyImages.map((image: PropertyImage, index: number) => (
                <TouchableOpacity
                    key={image.id}  // Use image.id (not index) for React key (like website)
                  style={styles.imageContainer}
                  onPress={() => {
                    setCurrentImageIndex(index);
                    setShowImageGallery(true);
                  }}
                  activeOpacity={0.9}>
                  <Image
                      source={{uri: image.url}}  // ✅ Use image.url (object property, not string directly)
                    style={styles.image}
                    resizeMode="cover"
                    defaultSource={require('../../assets/logo.jpeg')}
                      onError={(error) => {
                        console.error(`[PropertyDetails] Image ${index} (id: ${image.id}) failed to load:`, image.url);
                        console.error('[PropertyDetails] Error details:', {
                          id: image.id,
                          uri: image.url,
                          error: error.nativeEvent?.error || error,
                          index: index,
                          timestamp: new Date().toISOString(),
                        });
                      }}
                      onLoad={() => {
                        console.log(`[PropertyDetails] Image ${index} (id: ${image.id}) loaded:`, image.url);
                      }}
                      onLoadStart={() => {
                        console.log(`[PropertyDetails] Image ${index} (id: ${image.id}) loading started:`, image.url);
                      }}
                  />
                </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Image Counter - Show current image number */}
              {propertyImages.length > 1 && (
                <View style={styles.imageCounter}>
                  <Text style={styles.imageCounterText}>
                    {currentImageIndex + 1} / {propertyImages.length}
                  </Text>
              </View>
            )}
          
          {/* Navigation Arrows - Only show if more than 1 image */}
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

              {/* Image Indicators/Dots - Positioned at bottom */}
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
              <Text style={styles.amenityText}>No amenities listed</Text>
            )}
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.address}>
            {property.address || property.fullAddress || property.location || 'Address not available'}
          </Text>
          <TouchableOpacity 
            style={styles.mapButton}
            onPress={() => {
              // Navigate to map with current property pinned
              navigation.navigate('PropertyMap', {
                propertyId: property.id,
                listingType: property.status === 'rent' ? 'rent' : property.status === 'pg' ? 'pg-hostel' : 'buy',
              });
            }}>
            <Text style={styles.mapButtonText}>View on Map</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Fixed Action Buttons */}
      <View style={[styles.actionButtons, {paddingBottom: insets.bottom}]}>
        <TouchableOpacity
          style={[
            styles.contactButton,
            (processingContact || interactionLoading) && styles.contactButtonDisabled,
          ]}
          onPress={handleViewContact}
          disabled={processingContact || interactionLoading}>
          <Text style={styles.contactButtonText}>
            {showContactModal ? 'Hide Contact' : 'View Contact'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.chatButton,
            (processingChat || interactionLoading) && styles.contactButtonDisabled,
          ]}
          onPress={handleChatWithOwner}
          disabled={processingChat || interactionLoading}>
          <Text style={styles.chatButtonText}>💬 Chat with Owner</Text>
        </TouchableOpacity>
      </View>
      
      {/* Interaction Limit Display */}
      {user && user.user_type === 'buyer' && !interactionLoading && (
        <View style={styles.limitContainer}>
          <Text style={[
            styles.limitText,
            interactionState.remaining <= 0 && styles.limitTextError,
          ]}>
            Interactions Left: {interactionState.remaining} / {interactionState.max}
          </Text>
        </View>
      )}

      {/* Contact Modal */}
      <Modal
        visible={showContactModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          console.log('[PropertyDetails] Modal close requested');
          setShowContactModal(false);
        }}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Owner Contact Details</Text>
              <TouchableOpacity onPress={() => {
                console.log('[PropertyDetails] Close button pressed');
                setShowContactModal(false);
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {/* Interaction Limit Info */}
            {user && user.user_type === 'buyer' && !interactionLoading && (
              <View style={styles.modalLimitInfo}>
                <Text style={[
                  styles.modalLimitText,
                  interactionState.remaining <= 0 && styles.modalLimitTextError,
                ]}>
                  Interactions Left: {interactionState.remaining} / {interactionState.max}
                </Text>
              </View>
            )}
            
            {property ? (
            <View style={styles.contactDetails}>
                {/* Owner Name - Always show */}
              <View style={styles.contactItem}>
                <Text style={styles.contactLabel}>Name</Text>
                <Text style={styles.contactValue}>
                    {property.seller?.name || 
                     property.seller_name || 
                     property.owner?.name || 
                     property.owner?.full_name || 
                     'Property Owner'}
                </Text>
              </View>
                
                {/* Phone - Always show (with "Not available" if missing) */}
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Phone</Text>
                  {(property.seller?.phone || property.seller_phone || property.owner?.phone) ? (
                    <TouchableOpacity 
                      onPress={() => handlePhonePress(
                        property.seller?.phone || 
                        property.seller_phone || 
                        property.owner?.phone || 
                        ''
                      )}>
                    <Text style={[styles.contactValue, styles.contactLink]}>
                        {property.seller?.phone || property.seller_phone || property.owner?.phone}
                    </Text>
                  </TouchableOpacity>
                  ) : (
                    <Text style={styles.contactValue}>Not available</Text>
              )}
                </View>
                
                {/* Email - Always show (with "Not available" if missing) */}
                <View style={styles.contactItem}>
                  <Text style={styles.contactLabel}>Email</Text>
                  {(property.seller?.email || property.seller_email || property.owner?.email) ? (
                    <TouchableOpacity 
                      onPress={() => handleEmailPress(
                        property.seller?.email || 
                        property.seller_email || 
                        property.owner?.email || 
                        ''
                      )}>
                    <Text style={[styles.contactValue, styles.contactLink]}>
                        {property.seller?.email || property.seller_email || property.owner?.email}
                    </Text>
                  </TouchableOpacity>
                  ) : (
                    <Text style={styles.contactValue}>Not available</Text>
              )}
                </View>
            </View>
            ) : (
              <View style={styles.contactDetails}>
                <Text style={styles.contactValue}>Property information not available</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={styles.modalChatButton}
              onPress={() => {
                setShowContactModal(false);
                // Small delay to ensure modal closes before navigation
                setTimeout(() => {
                  handleChatWithOwner();
                }, 300);
              }}>
              <Text style={styles.modalChatButtonText}>💬 Start Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Image Gallery Modal */}
      <ImageGallery
        visible={showImageGallery}
        images={propertyImages.map(img => img.url)}  // Convert objects back to URLs for gallery
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
    paddingBottom: 100, // Space for sticky buttons
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
    // Width will be set dynamically: SCREEN_WIDTH * propertyImages.length
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
  actionButtonsTop: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 100,
    flexDirection: 'row',
    gap: spacing.sm,
    elevation: 10,
  },
  favoriteButton: {
    // Position handled by parent
    zIndex: 101,
    elevation: 10,
  },
  shareButtonTop: {
    // Position handled by parent
    zIndex: 101,
    elevation: 10,
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
  shareIcon: {
    fontSize: 18,
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
  contactButtonDisabled: {
    opacity: 0.5,
    backgroundColor: colors.border,
  },
  limitContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  limitText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  limitTextError: {
    color: '#DC2626',
    borderColor: '#FCA5A5',
    backgroundColor: '#FEE2E2',
  },
  modalLimitInfo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalLimitText: {
    ...typography.caption,
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  modalLimitTextError: {
    color: '#DC2626',
  },
});

export default PropertyDetailsScreen;

