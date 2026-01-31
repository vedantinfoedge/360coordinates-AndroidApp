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
  Share,
  Animated,
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
import CustomAlert from '../../utils/alertHelper';
import {buyerService} from '../../services/buyer.service';
import {fixImageUrl, isValidImageUrl, validateAndProcessPropertyImages, PropertyImage} from '../../utils/imageHelper';
import BuyerHeader from '../../components/BuyerHeader';
import {useAuth} from '../../context/AuthContext';
import ImageGallery from '../../components/common/ImageGallery';
import {Linking} from 'react-native';
import {
  viewedPropertiesService,
  isPropertyUnlocked,
  markPropertyUnlocked,
  addViewedProperty,
  ViewedProperty,
} from '../../services/viewedProperties.service';
import {capitalize, capitalizeAmenity} from '../../utils/formatters';

// Import WebView with error handling
let WebView: any = null;
try {
  WebView = require('react-native-webview').WebView;
} catch (error) {
  console.warn('[PropertyDetails] WebView not available:', error);
}

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
// Calculate image carousel width accounting for container margins
const IMAGE_CAROUSEL_WIDTH = SCREEN_WIDTH - (spacing.md * 2);

// PropertyImage type is imported from imageHelper

const TOTAL_INTERACTION_LIMIT = 5;
const INTERACTION_STORAGE_KEY = 'interaction_remaining';

const PropertyDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const headerHeight = insets.top + 70;
  const scrollY = useRef(new Animated.Value(0)).current;
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
  const [showVideoModal, setShowVideoModal] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageScrollViewRef = useRef<any>(null);

  const [interactionState, setInteractionState] = useState({
    remaining: TOTAL_INTERACTION_LIMIT,
    max: TOTAL_INTERACTION_LIMIT,
  });
  const [interactionLoading, setInteractionLoading] = useState(true);
  // Single unlock flag - one credit unlocks both chat and contact for this property
  const [propertyUnlocked, setPropertyUnlocked] = useState(false);
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
      setPropertyUnlocked(false);
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
        
        // ✅ Use helper function to validate and process images (EXACTLY like website)
        let propertyImages: PropertyImage[] = validateAndProcessPropertyImages(
          propData.images,
          propData.title || 'Property',
          propData.cover_image
        );
        
        console.log(`[PropertyDetails] Processed ${propertyImages.length} valid images from ${propData.images?.length || 0} total`);
        
        // Final fallback: Placeholder (only if absolutely no images - mobile app needs to show something)
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
      // Check if property is already unlocked (single credit for both chat and contact)
      const unlocked = await isPropertyUnlocked(propertyId);
      setPropertyUnlocked(unlocked);
      console.log('[PropertyDetails] Property unlock state:', {propertyId, unlocked});
    } catch (error) {
      console.error('[PropertyDetails] Error loading unlock state:', error);
      setPropertyUnlocked(false);
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

  /**
   * Unlock property and save to viewed history
   * Single credit consumption - unlocks both chat and contact for this property
   */
  const unlockPropertyAndSaveHistory = async (action: 'chat' | 'contact') => {
    if (!property) return;
    
    try {
      const propId = property.id || property.property_id;
      
      // Mark property as unlocked
      await markPropertyUnlocked(propId);
      setPropertyUnlocked(true);
      
      // Get owner details for history
      const ownerName = property.seller?.name || 
                       property.seller_name || 
                       property.owner?.name || 
                       property.owner?.full_name || 
                       'Property Owner';
      const ownerPhone = property.seller?.phone || 
                        property.seller_phone || 
                        property.owner?.phone || 
                        '';
      const ownerEmail = property.seller?.email || 
                        property.seller_email || 
                        property.owner?.email || 
                        '';
      
      // Save to viewed properties history
      const viewedProperty: ViewedProperty = {
        propertyId: propId,
        propertyTitle: property.title || property.property_title || 'Property',
        propertyLocation: property.location || property.city || '',
        propertyPrice: property.price ? `₹${parseFloat(property.price).toLocaleString('en-IN')}` : '',
        ownerName,
        ownerPhone,
        ownerEmail,
        viewedAt: new Date().toISOString(),
        action,
      };
      
      await addViewedProperty(viewedProperty);
      console.log('[PropertyDetails] Property unlocked and saved to history:', propId);
    } catch (error) {
      console.error('[PropertyDetails] Error unlocking property:', error);
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
        CustomAlert.alert('Error', response?.message || 'Failed to update favorite');
      }
    } catch (error: any) {
      console.error('Error toggling favorite:', error);
      CustomAlert.alert('Error', error.message || 'Failed to update favorite');
    } finally {
      setTogglingFavorite(false);
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

  const handleChatWithOwner = async () => {
    if (processingChat) {
      return;
    }

    // Check if user is logged in
    if (!user) {
      CustomAlert.alert(
        'Login Required',
        'Please login to chat with the owner.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Login',
            onPress: () => {
              // Navigate to auth, then return to this screen after login
              (navigation as any).navigate('Auth', {
                screen: 'Login',
                params: {returnTo: 'PropertyDetails', propertyId: route.params.propertyId},
              });
            },
          },
        ]
      );
      return;
    }
    if (!property) {
      CustomAlert.alert('Error', 'Property information not available');
      return;
    }

    // Check if user is buyer
    if (user.user_type !== 'buyer') {
      CustomAlert.alert('Access Denied', 'Only buyers can chat with owners.');
      return;
    }

    if (interactionLoading) {
      CustomAlert.alert('Please wait', 'Loading your interaction balance...');
      return;
    }
    
    const sellerId = property.seller_id || property.owner?.id || property.owner?.user_id || property.user_id;
    const propId = property.id || property.property_id;
    const propTitle = property.title || property.property_title || 'Property';
    
    if (!sellerId) {
      CustomAlert.alert('Error', 'Owner information not available');
      return;
    }

    try {
      setProcessingChat(true);

      // If property not unlocked yet, consume a credit
      if (!propertyUnlocked) {
        if (interactionState.remaining <= 0) {
          CustomAlert.alert(
            'Interaction limit reached',
            'Interaction limit reached. Upgrade to continue.',
          );
          return;
        }
        
        const result = await consumeInteraction();
        if (!result.success) {
          CustomAlert.alert(
            'Interaction limit reached',
            'Interaction limit reached. Upgrade to continue.',
          );
          return;
        }
        
        // Unlock property and save to history (single credit for both chat and contact)
        await unlockPropertyAndSaveHistory('chat');
      }
    
      console.log('[PropertyDetails] Navigating to chat (without showing owner details):', {
        userId: sellerId,
        propertyId: propId,
        propertyTitle: propTitle,
      });
      
      // Navigate to chat WITHOUT passing owner name/contact details
      // Owner details should only be visible via "Show Owner Details" action
      (navigation as any).navigate('Chat', {
        screen: 'ChatConversation',
        params: {
          userId: Number(sellerId),
          userName: '', // Don't pass owner name - will show as "Property Owner"
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
      propertyUnlocked,
    });
    
    if (processingContact) {
      return;
    }

    if (!property || !property.id) {
      CustomAlert.alert('Error', 'Property information not available');
      return;
    }
    
    // Check if user is logged in
    if (!user) {
      CustomAlert.alert(
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
      CustomAlert.alert('Access Denied', 'Only buyers can view owner contact details.');
      return;
    }

    // If already showing, just hide (no interaction deduction)
    if (showContactModal) {
      console.log('[PropertyDetails] Hiding contact modal');
      setShowContactModal(false);
      return;
    }

    // If property already unlocked (via chat or previous contact view), show immediately
    if (propertyUnlocked) {
      setShowContactModal(true);
      return;
    }

    if (interactionLoading) {
      CustomAlert.alert('Please wait', 'Loading your interaction balance...');
      return;
    }

    if (interactionState.remaining <= 0) {
      CustomAlert.alert(
        'Interaction limit reached',
        'Interaction limit reached. Upgrade to continue.',
      );
      return;
    }

    try {
      setProcessingContact(true);
      const result = await consumeInteraction();

      if (!result.success) {
        CustomAlert.alert(
          'Interaction limit reached',
          'Interaction limit reached. Upgrade to continue.',
        );
        return;
      }

      // Unlock property and save to history (single credit for both chat and contact)
      await unlockPropertyAndSaveHistory('contact');
      setShowContactModal(true);
      console.log('[PropertyDetails] Property unlocked for contact view:', property.id);
    } catch (error: any) {
      console.error('[PropertyDetails] Error in handleViewContact:', error);
      CustomAlert.alert('Error', 'Failed to process contact view. Please try again.');
    } finally {
      setProcessingContact(false);
    }
  };

  const handlePhonePress = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch((err: any) => {
        console.error('Error opening phone:', err);
        CustomAlert.alert('Error', 'Unable to open phone dialer.');
      });
    }
  };

  const handleEmailPress = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`).catch((err: any) => {
        console.error('Error opening email:', err);
        CustomAlert.alert('Error', 'Unable to open email client.');
      });
    }
  };

  // Check if video URL is valid
  const isValidVideoUrl = (url: string | null | undefined): boolean => {
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return false;
    }
    const trimmedUrl = url.trim();
    // Check for YouTube, Vimeo, or direct video URLs
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
  const getVideoEmbedUrl = (url: string): string => {
    const trimmedUrl = url.trim();
    
    // YouTube URL conversion
    if (trimmedUrl.includes('youtube.com/watch?v=')) {
      const videoId = trimmedUrl.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (trimmedUrl.includes('youtu.be/')) {
      const videoId = trimmedUrl.split('youtu.be/')[1]?.split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Vimeo URL conversion
    if (trimmedUrl.includes('vimeo.com/')) {
      const videoId = trimmedUrl.split('vimeo.com/')[1]?.split('?')[0];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    // Direct video URL - return as is
    return trimmedUrl;
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
  // Use all images that have a valid URL (don't filter out - they're already processed)
  const propertyImages: PropertyImage[] = property.images && Array.isArray(property.images) && property.images.length > 0
    ? property.images.filter((img: any): img is PropertyImage => {
        // Only filter out null/undefined or empty URLs (images are already processed in loadPropertyDetails)
        return img && 
               typeof img === 'object' && 
               img.url && 
               typeof img.url === 'string' &&
               img.url.trim() !== '';
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
        scrollY={scrollY}
        headerHeight={headerHeight}
      />

      {/* Favorite and Share Buttons - Positioned below header */}
      <View style={[styles.actionButtonsTop, {top: (insets.top + 60)}]}>
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={(e: any) => {
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
          onPress={(e: any) => {
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
      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, {paddingTop: insets.top + spacing.md}]}
        onScroll={Animated.event(
          [{nativeEvent: {contentOffset: {y: scrollY}}}],
          {useNativeDriver: true},
        )}
        scrollEventThrottle={16}>
        {/* Image Slider/Carousel - Display ALL property images */}
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
                  width: IMAGE_CAROUSEL_WIDTH * propertyImages.length,  // ✅ Account for container margins
                }}
                decelerationRate="fast"
                snapToInterval={IMAGE_CAROUSEL_WIDTH}
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
                    defaultSource={require('../../assets/logo.png')}
                      onError={(error: any) => {
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

              {/* Image Indicators/Dots - Positioned at bottom */}
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

        {/* Video Section - Display if video is available */}
        {property.video_url && isValidVideoUrl(property.video_url) && (
          <View style={styles.videoSection}>
            <Text style={styles.sectionTitle}>Property Video</Text>
            <TouchableOpacity
              style={styles.videoContainer}
              onPress={() => setShowVideoModal(true)}
              activeOpacity={0.9}>
              <View style={styles.videoThumbnail}>
                <Image
                  source={
                    property.cover_image
                      ? {uri: fixImageUrl(property.cover_image)}
                      : propertyImages.length > 0
                      ? {uri: propertyImages[0].url}
                      : require('../../assets/logo.png')
                  }
                  style={styles.videoThumbnailImage}
                  resizeMode="cover"
                />
                <View style={styles.videoPlayButton}>
                  <Text style={styles.videoPlayIcon}>▶</Text>
                </View>
              </View>
            </TouchableOpacity>
            <Text style={styles.videoHint}>Tap to play video</Text>
          </View>
        )}

        {/* Content Sections */}
        {/* Title and Price */}
        <View style={styles.headerSection}>
          <Text style={styles.title}>{capitalize(property.title || 'Property Title')}</Text>
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.location}>{property.location || property.city || 'Location not specified'}</Text>
          </View>
          <Text style={styles.price}>{formattedPrice}</Text>
        </View>

        {/* Quick Info */}
        <View style={styles.quickInfo}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🛏</Text>
            </View>
            <Text style={styles.infoText}>{property.bedrooms} Beds</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🚿</Text>
            </View>
            <Text style={styles.infoText}>{property.bathrooms} Baths</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>📐</Text>
            </View>
            <Text style={styles.infoText}>{property.area}</Text>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Text style={styles.infoIcon}>🏢</Text>
            </View>
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
                  <Text style={styles.amenityText}>{capitalizeAmenity(amenity)}</Text>
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
      </Animated.ScrollView>

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
                  <View style={styles.contactLabelContainer}>
                    <Text style={styles.contactLabelIcon}>📞</Text>
                    <Text style={styles.contactLabel}>Phone</Text>
                  </View>
                  {(property.seller?.phone || property.seller_phone || property.owner?.phone) ? (
                    <TouchableOpacity 
                      style={styles.contactValueContainer}
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
                  <View style={styles.contactLabelContainer}>
                    <Text style={styles.contactLabelIcon}>✉</Text>
                    <Text style={styles.contactLabel}>Email</Text>
                  </View>
                  {(property.seller?.email || property.seller_email || property.owner?.email) ? (
                    <TouchableOpacity 
                      style={styles.contactValueContainer}
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

      {/* Video Modal */}
      {property.video_url && isValidVideoUrl(property.video_url) && (
        <Modal
          visible={showVideoModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowVideoModal(false)}>
          <View style={styles.videoModalOverlay}>
            <View style={styles.videoModalContent}>
              <View style={styles.videoModalHeader}>
                <Text style={styles.videoModalTitle}>Property Video</Text>
                <TouchableOpacity
                  onPress={() => setShowVideoModal(false)}
                  style={styles.videoModalCloseButton}>
                  <Text style={styles.videoModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.videoPlayerContainer}>
                {WebView ? (
                  <WebView
                    source={{uri: getVideoEmbedUrl(property.video_url)}}
                    style={styles.videoPlayer}
                    allowsFullscreenVideo={true}
                    mediaPlaybackRequiresUserAction={false}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    scalesPageToFit={true}
                    onError={(syntheticEvent: any) => {
                      const {nativeEvent} = syntheticEvent;
                      console.error('[PropertyDetails] Video error:', nativeEvent);
                      CustomAlert.alert(
                        'Video Error',
                        'Unable to load video. Please check your internet connection.',
                        [{text: 'OK', onPress: () => setShowVideoModal(false)}]
                      );
                    }}
                  />
                ) : (
                  <View style={styles.videoErrorContainer}>
                    <Text style={styles.videoErrorText}>
                      Video player not available. Please update the app.
                    </Text>
                    <TouchableOpacity
                      style={styles.videoErrorButton}
                      onPress={() => {
                        if (property.video_url) {
                          Linking.openURL(property.video_url).catch((err: any) => {
                            console.error('Error opening video URL:', err);
                          });
                        }
                      }}>
                      <Text style={styles.videoErrorButtonText}>Open in Browser</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
    paddingBottom: 100, // Space for sticky buttons
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
    // Width will be set dynamically: SCREEN_WIDTH * propertyImages.length
  },
  imageContainer: {
    width: IMAGE_CAROUSEL_WIDTH, // Account for container margins
    height: 410,
    borderRadius: borderRadius.xl,
    paddingTop: spacing.md,
    overflow: 'hidden',
  },
  carouselNavButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontSize: 28,
    color: colors.primary, // Purple arrows
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
    top: spacing.lg,
    right: spacing.lg,
    backgroundColor: 'rgba(2, 43, 95, 0.85)', // Navy with opacity
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
    paddingTop: spacing.xl,
    paddingRight: spacing.xs,
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
    fontSize: 22,
    color: colors.primary, // Purple for favorite
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
    padding: spacing.xl,
    paddingTop: spacing.xl + spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.secondary, // Dark Charcoal #1D242B
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
    marginBottom: spacing.md,
  },
  mapButton: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '40', // Purple border with opacity
    marginTop: spacing.md,
  },
  mapButtonText: {
    ...typography.body,
    color: colors.primary, // Purple text
    fontWeight: '700',
    fontSize: 16,
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
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary, // Purple border
    minHeight: 52,
  },
  contactButtonText: {
    ...typography.body,
    color: colors.primary, // Purple text
    fontWeight: '700',
    fontSize: 16,
  },
  chatButton: {
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
  chatButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
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
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary, // Navy
  },
  modalClose: {
    fontSize: 28,
    color: colors.textSecondary,
    fontWeight: '300',
  },
  contactDetails: {
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  contactItem: {
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contactLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  contactLabelIcon: {
    fontSize: 18,
  },
  contactLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactValueContainer: {
    marginTop: spacing.xs,
  },
  contactValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  contactLink: {
    color: colors.primary, // Purple for links
    textDecorationLine: 'underline',
  },
  modalChatButton: {
    backgroundColor: colors.primary, // Purple
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
  modalChatButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
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
    fontSize: 12,
    color: colors.textSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    fontWeight: '600',
  },
  limitTextError: {
    color: colors.error,
    borderColor: colors.error + '40',
    backgroundColor: '#FEE2E2',
    fontWeight: '700',
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
  videoSection: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  videoContainer: {
    width: '100%',
    marginTop: spacing.sm,
  },
  videoThumbnail: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: colors.surfaceSecondary,
  },
  videoThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -30,
    marginLeft: -30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.surface,
  },
  videoPlayIcon: {
    fontSize: 24,
    color: colors.surface,
    marginLeft: 4, // Slight offset for play icon
  },
  videoHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontSize: 12,
  },
  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContent: {
    width: SCREEN_WIDTH,
    height: '100%',
    backgroundColor: colors.background,
  },
  videoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'ios' ? spacing.xl : spacing.lg,
  },
  videoModalTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  videoModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalCloseText: {
    fontSize: 24,
    color: colors.text,
    fontWeight: 'bold',
  },
  videoPlayerContainer: {
    flex: 1,
    width: '100%',
  },
  videoPlayer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  videoErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  videoErrorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  videoErrorButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  videoErrorButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default PropertyDetailsScreen;

