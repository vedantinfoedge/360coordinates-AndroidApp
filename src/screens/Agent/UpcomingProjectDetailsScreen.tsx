import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Share,
  Platform,
  Linking,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { AgentStackParamList } from '../../navigation/AgentNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon } from '../../components/navigation/TabIcons';
import { propertyService } from '../../services/property.service';
import { validateAndProcessPropertyImages, PropertyImage } from '../../utils/imageHelper';
import { useAuth } from '../../context/AuthContext';
import ImageGallery from '../../components/common/ImageGallery';
import { formatters, capitalize, capitalizeAmenity } from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';
import LoadingScreen from '../../components/common/LoadingScreen';
import { AMENITIES_LIST } from '../../utils/propertyTypeConfig';
import PropertyDetailsHeader from '../../components/PropertyDetailsHeader';
import { buyerService } from '../../services/buyer.service';
import { createLead } from '../../services/leadsService';
import {
  isPropertyUnlocked,
  markPropertyUnlocked,
  addViewedProperty,
  ViewedProperty,
} from '../../services/viewedProperties.service';

type UpcomingProjectDetailsScreenNavigationProp = NativeStackNavigationProp<
  AgentStackParamList,
  'UpcomingProjectDetails'
>;

type UpcomingProjectDetailsScreenRouteProp = RouteProp<AgentStackParamList, 'UpcomingProjectDetails'>;

type Props = {
  navigation: UpcomingProjectDetailsScreenNavigationProp;
  route: UpcomingProjectDetailsScreenRouteProp;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
// Carousel width with horizontal margins (same as property details screen)
const IMAGE_CAROUSEL_WIDTH = SCREEN_WIDTH - (spacing.md * 2);

const TOTAL_INTERACTION_LIMIT = 5;
const INTERACTION_STORAGE_KEY = 'interaction_remaining';

// Helper: parse comma-separated string to array of labels (e.g. "1bhk,2bhk" -> ["1 BHK", "2 BHK"])
const formatConfigurations = (val: string | null | undefined): string[] => {
  if (!val || typeof val !== 'string') return [];
  return val.split(',').map(s => {
    const t = s.trim().toLowerCase();
    if (t === '1bhk') return '1 BHK';
    if (t === '2bhk') return '2 BHK';
    if (t === '3bhk') return '3 BHK';
    if (t === '4bhk') return '4 BHK';
    if (t === '5bhk') return '5+ BHK';
    if (t === 'villa') return 'Villa';
    if (t === 'plot') return 'Plot';
    return s.trim();
  }).filter(Boolean);
};

// Helper: parse amenities (array or comma-separated string)
const parseAmenities = (val: any): string[] => {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (val && typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// Helper: parse approved banks (comma-separated or array)
const parseBanks = (val: any): string[] => {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (val && typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// BHK text from configurations (website: formatBhkType)
const formatBhkType = (configurations: string | string[] | null | undefined): string => {
  const arr = formatConfigurations(
    Array.isArray(configurations) ? (configurations as string[]).join(',') : (configurations as string)
  );
  return arr.length ? arr.join(', ') : '';
};

/**
 * Extract sales contact from property (from upcoming_project_data).
 * Sales details only - no seller/owner fallback.
 */
const getSalesContactFromProperty = (prop: any): {
  name: string | null;
  phone: string | null;
  email: string | null;
  landline: string | null;
  whatsapp: string | null;
  alternative: string | null;
  officeAddress: string | null;
  salesPersons: Array<{ name: string; number: string; email: string; landlineNumber?: string; whatsappNumber?: string; alternativeNumber?: string }>;
} => {
  if (!prop) return { name: null, phone: null, email: null, landline: null, whatsapp: null, alternative: null, officeAddress: null, salesPersons: [] };
  const raw = prop.upcoming_project_data;
  let data: any = {};
  if (raw != null) {
    if (typeof raw === 'string') {
      try {
        data = JSON.parse(raw) || {};
      } catch (_) {
        data = {};
      }
    } else if (typeof raw === 'object' && !Array.isArray(raw)) {
      data = raw;
    }
  }
  const sp = data.salesPersons && Array.isArray(data.salesPersons) ? data.salesPersons : [];
  const firstSp = sp[0];
  const name = prop.sales_name ?? prop.salesName ?? data.sales_name ?? data.salesName ?? firstSp?.name ?? null;
  const phone = prop.sales_number ?? prop.salesNumber ?? data.sales_number ?? data.salesNumber ?? firstSp?.number ?? prop.mobile_number ?? data.mobile_number ?? null;
  const email = prop.email_id ?? prop.emailId ?? data.email_id ?? data.emailId ?? firstSp?.email ?? null;
  const landline = prop.landline_number ?? prop.landlineNumber ?? data.landline_number ?? data.landlineNumber ?? firstSp?.landlineNumber ?? null;
  const whatsapp = prop.whatsapp_number ?? prop.whatsappNumber ?? data.whatsapp_number ?? data.whatsappNumber ?? firstSp?.whatsappNumber ?? null;
  const alternative = prop.alternative_number ?? prop.alternativeNumber ?? data.alternative_number ?? data.alternativeNumber ?? firstSp?.alternativeNumber ?? null;
  const officeAddress = prop.office_address ?? data.office_address ?? prop.fullAddress ?? data.fullAddress ?? null;
  return {
    name: name && String(name).trim() ? String(name).trim() : null,
    phone: phone && String(phone).trim() ? String(phone).trim() : null,
    email: email && String(email).trim() ? String(email).trim() : null,
    landline: landline && String(landline).trim() ? String(landline).trim() : null,
    whatsapp: whatsapp && String(whatsapp).trim() ? String(whatsapp).trim() : null,
    alternative: alternative && String(alternative).trim() ? String(alternative).trim() : null,
    officeAddress: officeAddress && String(officeAddress).trim() ? String(officeAddress).trim() : null,
    salesPersons: sp.filter((p: any) => p && (p.name?.trim() || p.number?.trim() || p.email?.trim())),
  };
};

// Build a single formatted project object from API prop + upcoming_project_data (website parity)
const buildFormattedProject = (prop: any, propertyImages: PropertyImage[]): any => {
  let upcomingData: any = {};
  const raw = prop.upcoming_project_data;
  if (raw != null) {
    if (typeof raw === 'string') {
      try {
        upcomingData = JSON.parse(raw) || {};
      } catch (_) {
        upcomingData = {};
      }
    } else if (typeof raw === 'object' && !Array.isArray(raw)) {
      upcomingData = raw;
    }
  }
  const priceNum = typeof prop.price === 'number' ? prop.price : parseFloat(prop.price || '0');
  const priceRange = priceNum > 0 ? formatters.price(priceNum, false) : (prop.price_range || 'Price on request');
  const bhkType = formatBhkType(prop.configurations ?? upcomingData.configurations);
  return {
    id: prop.id,
    title: prop.title,
    location: prop.location || upcomingData.location,
    priceRange,
    bhkType,
    builder: prop.builder_name || prop.builder || upcomingData.builder_name || upcomingData.builder,
    builder_link: prop.builder_link || upcomingData.builder_link,
    description: prop.description,
    configurations: prop.configurations ?? upcomingData.configurations,
    amenities: prop.amenities ?? upcomingData.amenities,
    images: propertyImages,
    latitude: prop.latitude ?? upcomingData.latitude,
    longitude: prop.longitude ?? upcomingData.longitude,
    seller_id: prop.seller_id || prop.user_id,
    seller_name: prop.seller_name,
    seller_email: prop.seller_email,
    seller_phone: prop.seller_phone,
    property_type: prop.property_type || upcomingData.property_type,
    project_type: prop.project_type || upcomingData.project_type,
    project_status: prop.project_status ?? upcomingData.project_status,
    rera_number: prop.rera_number ?? upcomingData.rera_number,
    city: prop.city ?? upcomingData.city,
    area: prop.area ?? upcomingData.area,
    fullAddress: prop.fullAddress ?? prop.address ?? upcomingData.fullAddress ?? upcomingData.address,
    state: prop.state ?? upcomingData.state,
    pincode: prop.pincode ?? upcomingData.pincode,
    mapLink: prop.map_link ?? prop.mapLink ?? upcomingData.map_link ?? upcomingData.mapLink,
    carpet_area: prop.carpet_area ?? upcomingData.carpet_area,
    carpet_area_range: prop.carpet_area_range ?? upcomingData.carpet_area_range,
    number_of_towers: prop.number_of_towers ?? upcomingData.number_of_towers,
    total_units: prop.total_units ?? upcomingData.total_units,
    floors_count: prop.floors_count ?? upcomingData.floors_count,
    starting_price: prop.starting_price ?? prop.price ?? upcomingData.starting_price ?? upcomingData.price,
    price_per_sqft: prop.price_per_sqft ?? upcomingData.price_per_sqft,
    booking_amount: prop.booking_amount ?? upcomingData.booking_amount,
    launch_date: prop.launch_date ?? upcomingData.launch_date,
    possession_date: prop.possession_date ?? upcomingData.possession_date,
    rera_status: prop.rera_status ?? upcomingData.rera_status,
    land_ownership_type: prop.land_ownership_type ?? upcomingData.land_ownership_type,
    bank_approved: prop.bank_approved ?? upcomingData.bank_approved,
    approved_banks: prop.approved_banks ?? upcomingData.approved_banks,
    other_bank_names: prop.other_bank_names ?? upcomingData.other_bank_names,
    sales_name: prop.sales_name ?? upcomingData.sales_name,
    sales_number: prop.sales_number ?? upcomingData.sales_number,
    email_id: prop.email_id ?? upcomingData.email_id,
    mobile_number: prop.mobile_number ?? upcomingData.mobile_number,
    whatsapp_number: prop.whatsapp_number ?? upcomingData.whatsapp_number,
    alternative_number: prop.alternative_number ?? upcomingData.alternative_number,
    office_address: prop.office_address ?? upcomingData.office_address,
    project_highlights: prop.project_highlights ?? upcomingData.project_highlights,
    usp: prop.usp ?? upcomingData.usp,
    brochure: prop.brochure ?? upcomingData.brochure,
    brochure_url: prop.brochure_url ?? upcomingData.brochure_url,
    additional_address: prop.additional_address,
    cover_image: prop.cover_image,
    price: prop.price,
    upcoming_project_data: prop.upcoming_project_data ?? upcomingData,
  };
};

const UpcomingProjectDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const isBuyer = (user?.user_type || '').toLowerCase() === 'buyer';
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const imageScrollViewRef = useRef<any>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // Buyer: View Contact / Chat with Builder (same credit flow as property details)
  const [showContactModal, setShowContactModal] = useState(false);
  const [interactionState, setInteractionState] = useState({ remaining: TOTAL_INTERACTION_LIMIT, max: TOTAL_INTERACTION_LIMIT });
  const [interactionLoading, setInteractionLoading] = useState(true);
  const [propertyUnlocked, setPropertyUnlocked] = useState(false);
  const [processingContact, setProcessingContact] = useState(false);
  const [processingChat, setProcessingChat] = useState(false);

  useEffect(() => {
    loadProjectDetails();
  }, [route.params.propertyId]);

  useEffect(() => {
    const recordProjectView = async () => {
      if (!user?.id || !route.params.propertyId) return;
      try {
        await buyerService.recordInteraction(route.params.propertyId, 'view');
      } catch (_) {
        // View tracking is non-critical
      }
    };
    const timer = setTimeout(recordProjectView, 1000);
    return () => clearTimeout(timer);
  }, [route.params.propertyId, user?.id]);

  useEffect(() => {
    if (isBuyer) initializeInteractionState();
  }, [isBuyer]);

  useEffect(() => {
    if (isBuyer && property?.id) loadPropertyUnlockState(property.id);
    else if (!property?.id) setPropertyUnlocked(false);
  }, [isBuyer, property?.id]);

  useEffect(() => {
    if (property && property.images && property.images.length > 0) {
      setCurrentImageIndex(0);
      setFailedImages(new Set());
      setTimeout(() => {
        imageScrollViewRef.current?.scrollTo({ x: 0, animated: false });
      }, 100);
    }
  }, [property?.id]);

  const loadProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getPropertyDetails(route.params.propertyId);
      const responseData = response as any;

      if (!responseData?.success || !responseData?.data || !responseData.data.property) {
        CustomAlert.alert('Error', 'Project not found');
        navigation.goBack();
        return;
      }

      const propData = responseData.data.property;

      let propertyImages: PropertyImage[] = validateAndProcessPropertyImages(
        propData.images,
        propData.title || 'Project',
        propData.cover_image
      );

      if (propertyImages.length === 0) {
        propertyImages = [{
          id: 1,
          url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
          alt: propData.title || 'Project image',
        }];
      }

      const formattedProject = buildFormattedProject(propData, propertyImages);
      formattedProject.images = propertyImages;
      setProperty(formattedProject);
      setCurrentImageIndex(0);
    } catch (error: any) {
      console.error('[UpcomingProjectDetails] Error loading project:', error);
      CustomAlert.alert('Error', error.message || 'Failed to load project details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!property) return;
    try {
      const priceText = property.price
        ? formatters.price(parseFloat(property.price), false)
        : 'Price on request';
      const shareMessage = `Check out this project!\n\n${property.title || 'Project'}\n📍 ${property.location || property.city || 'Location not specified'}\n💰 ${priceText}\n\n${property.description ? property.description.substring(0, 100) + '...' : ''}\n\nVisit us: https://360coordinates.com`;
      await Share.share({ message: shareMessage, title: property.title || 'Project' });
    } catch (e: any) {
      if (e.message !== 'User did not share') {
        CustomAlert.alert('Error', 'Failed to share. Please try again.');
      }
    }
  };

  const initializeInteractionState = async () => {
    try {
      setInteractionLoading(true);
      const stored = await AsyncStorage.getItem(INTERACTION_STORAGE_KEY);
      let remaining = TOTAL_INTERACTION_LIMIT;
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) remaining = Math.min(parsed, TOTAL_INTERACTION_LIMIT);
      } else {
        await AsyncStorage.setItem(INTERACTION_STORAGE_KEY, TOTAL_INTERACTION_LIMIT.toString());
      }
      setInteractionState({ remaining, max: TOTAL_INTERACTION_LIMIT });
    } catch (_) {
      setInteractionState({ remaining: TOTAL_INTERACTION_LIMIT, max: TOTAL_INTERACTION_LIMIT });
    } finally {
      setInteractionLoading(false);
    }
  };

  const loadPropertyUnlockState = async (propertyId: string | number) => {
    try {
      const unlocked = await isPropertyUnlocked(propertyId);
      setPropertyUnlocked(unlocked);
    } catch (_) {
      setPropertyUnlocked(false);
    }
  };

  const consumeInteraction = async (): Promise<{ success: boolean; remaining: number }> => {
    try {
      const stored = await AsyncStorage.getItem(INTERACTION_STORAGE_KEY);
      let remaining = TOTAL_INTERACTION_LIMIT;
      if (stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0) remaining = Math.min(parsed, TOTAL_INTERACTION_LIMIT);
      }
      if (remaining <= 0) {
        setInteractionState({ remaining: 0, max: TOTAL_INTERACTION_LIMIT });
        return { success: false, remaining: 0 };
      }
      const newRemaining = remaining - 1;
      await AsyncStorage.setItem(INTERACTION_STORAGE_KEY, newRemaining.toString());
      setInteractionState({ remaining: newRemaining, max: TOTAL_INTERACTION_LIMIT });
      return { success: true, remaining: newRemaining };
    } catch (_) {
      return { success: false, remaining: interactionState.remaining };
    }
  };

  const unlockPropertyAndSaveHistory = async (action: 'chat' | 'contact') => {
    if (!property || !isBuyer) return;
    try {
      const propId = property.id || property.property_id;
      await markPropertyUnlocked(propId);
      setPropertyUnlocked(true);
      const contactName = property.sales_name || property.seller_name || 'Sales Contact';
      const contactPhone = property.sales_number || property.mobile_number || property.seller_phone || '';
      const contactEmail = property.email_id || property.seller_email || '';
      const viewedProperty: ViewedProperty = {
        propertyId: propId,
        propertyTitle: property.title || 'Project',
        propertyLocation: property.location || property.city || '',
        propertyPrice: property.priceRange || (property.price ? formatters.price(Number(property.price), false) : ''),
        ownerName: contactName,
        ownerPhone: contactPhone,
        ownerEmail: contactEmail,
        viewedAt: new Date().toISOString(),
        action,
      };
      await addViewedProperty(viewedProperty);
      if (user?.user_type === 'buyer') {
        try {
          const historyAction = action === 'chat' ? 'chat_with_owner' : 'viewed_owner_details';
          await buyerService.addHistory(propId, historyAction);
        } catch (_) { }
      }
    } catch (_) { }
  };

  const handlePhonePress = (phone: string) => {
    if (phone) Linking.openURL(`tel:${phone}`).catch(() => CustomAlert.alert('Error', 'Unable to open phone dialer.'));
  };

  const handleEmailPress = (email: string) => {
    if (email) Linking.openURL(`mailto:${email}`).catch(() => CustomAlert.alert('Error', 'Unable to open email client.'));
  };

  const handleViewContact = async () => {
    if (processingContact || !property?.id) return;
    if (!user) {
      CustomAlert.alert('Login Required', 'Please login to view contact details.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => (navigation as any).navigate('Auth', { screen: 'Login', params: { returnTo: 'UpcomingProjectDetails', propertyId: route.params.propertyId } }) },
      ]);
      return;
    }
    if (user.user_type !== 'buyer') return;
    if (showContactModal) {
      setShowContactModal(false);
      return;
    }
    if (propertyUnlocked) {
      setShowContactModal(true);
      try { await buyerService.recordInteraction(property.id, 'view_owner'); } catch (_) { }
      const sellerId = property.seller_id || property.user_id;
      if (sellerId != null && user?.id != null) {
        try { await createLead({ property_id: property.id, seller_id: sellerId, buyer_id: user.id, buyer_name: user.full_name ?? '', buyer_phone: user.phone ?? '', buyer_email: user.email ?? '' }); } catch (_) { }
      }
      return;
    }
    if (interactionLoading) {
      CustomAlert.alert('Please wait', 'Loading your interaction balance...');
      return;
    }
    if (interactionState.remaining <= 0) {
      CustomAlert.alert('Credit limit reached', 'Credit limit reached. Upgrade to continue.');
      return;
    }
    try {
      setProcessingContact(true);
      const result = await consumeInteraction();
      if (!result.success) {
        CustomAlert.alert('Interaction limit reached', 'Interaction limit reached. Upgrade to continue.');
        return;
      }
      await unlockPropertyAndSaveHistory('contact');
      setShowContactModal(true);
      try { await buyerService.recordInteraction(property.id, 'view_owner'); } catch (_) { }
      const sellerId = property.seller_id || property.user_id;
      if (sellerId != null && user?.id != null) {
        try { await createLead({ property_id: property.id, seller_id: sellerId, buyer_id: user.id, buyer_name: user.full_name ?? '', buyer_phone: user.phone ?? '', buyer_email: user.email ?? '' }); } catch (_) { }
      }
    } catch (_) {
      CustomAlert.alert('Error', 'Failed to process contact view. Please try again.');
    } finally {
      setProcessingContact(false);
    }
  };

  const handleChatWithBuilder = async () => {
    if (processingChat || !property) return;
    if (!user) {
      CustomAlert.alert('Login Required', 'Please login to chat with the builder.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => (navigation as any).navigate('Auth', { screen: 'Login', params: { returnTo: 'UpcomingProjectDetails', propertyId: route.params.propertyId } }) },
      ]);
      return;
    }
    if (user.user_type !== 'buyer') return;
    if (interactionLoading) {
      CustomAlert.alert('Please wait', 'Loading your interaction balance...');
      return;
    }
    const sellerId = property.seller_id || property.owner?.id || property.owner?.user_id || property.user_id;
    const propId = property.id || property.property_id;
    const propTitle = property.title || 'Project';
    if (!sellerId) {
      CustomAlert.alert('Error', 'Builder/agent information not available');
      return;
    }
    try {
      setProcessingChat(true);
      if (!propertyUnlocked) {
        if (interactionState.remaining <= 0) {
          CustomAlert.alert('Credit limit reached', 'Credit limit reached. Upgrade to continue.');
          return;
        }
        const result = await consumeInteraction();
        if (!result.success) {
          CustomAlert.alert('Credit limit reached', 'Credit limit reached. Upgrade to continue.');
          return;
        }
        await unlockPropertyAndSaveHistory('chat');
      }
      (navigation as any).navigate('Chats', {
        screen: 'ChatConversation',
        params: {
          userId: Number(sellerId),
          userName: '',
          propertyId: Number(propId),
          propertyTitle: propTitle,
          receiverRole: property.owner?.user_type === 'agent' ? 'agent' : 'seller',
        },
      });
    } finally {
      setProcessingChat(false);
    }
  };

  if (loading || !property) {
    return <LoadingScreen variant="property" message="Loading project details…" />;
  }

  const propertyImages: PropertyImage[] = property.images && Array.isArray(property.images) && property.images.length > 0
    ? property.images.filter((img: any): img is PropertyImage => img && typeof img === 'object' && img.url && typeof img.url === 'string' && img.url.trim() !== '')
    : [];

  const priceRangeText = property.priceRange || (property.price ? formatters.price(parseFloat(String(property.price)), false) : 'Price on request');
  const pricePerSqft = property.price_per_sqft != null && property.price_per_sqft !== ''
    ? formatters.price(Number(property.price_per_sqft), false) + ' / sq ft'
    : null;
  const bookingAmount = property.booking_amount != null && property.booking_amount !== ''
    ? formatters.price(Number(property.booking_amount), false)
    : null;

  const amenities = parseAmenities(property.amenities);
  const configurations = formatConfigurations(property.configurations);
  const approvedBanks = parseBanks(property.approved_banks);
  const bhkTypeText = property.bhkType ?? formatBhkType(property.configurations);

  const renderDetail = (label: string, value: string | number | null | undefined) => {
    if (value == null || value === '') return null;
    return (
      <View style={styles.detailItem} key={label}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{String(value)}</Text>
      </View>
    );
  };

  // Only show area when it's a meaningful value (backend may return 0 or 1 as placeholder)
  const hasValidArea = property.area != null && property.area !== '' && Number(property.area) > 1;
  // Only show carpet area range when it's meaningful (hide 0 or "0")
  const carpetDisplay = property.carpet_area_range || property.carpet_area;
  const hasValidCarpetArea =
    carpetDisplay != null &&
    carpetDisplay !== '' &&
    String(carpetDisplay).trim() !== '0';

  const formatDate = (d: any) => {
    if (!d) return null;
    if (typeof d === 'string') {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return null;
  };

  const isLoggedIn = Boolean(user);
  const isGuest = !isLoggedIn;

  return (
    <View style={styles.container}>
      <PropertyDetailsHeader
        onProfilePress={() => (navigation as any).navigate('AgentTabs')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={user ? logout : undefined}
        onSignInPress={isGuest ? () => (navigation as any).navigate('Auth', { screen: 'Login', params: { returnTo: 'UpcomingProjectDetails', propertyId: route.params.propertyId } }) : undefined}
        onSignUpPress={isGuest ? () => (navigation as any).navigate('Auth', { screen: 'Register' }) : undefined}
        showLogout={isLoggedIn}
        showProfile={isLoggedIn}
        showSignIn={isGuest}
        showSignUp={isGuest}
      />

      <View style={styles.contentSheet}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, isBuyer && { paddingBottom: 160 }]}>
          {/* Image carousel */}
          <View style={styles.imageCarouselContainer}>
          {/* Back button - top left */}
          <TouchableOpacity style={styles.imageBackButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <View style={styles.imageBackButtonInner}>
              <TabIcon name="chevron-left" color={colors.text} size={22} />
            </View>
          </TouchableOpacity>
          {/* Share - top right */}
          <View style={styles.imageActionButtons}>
            <TouchableOpacity style={styles.imageActionBtn} onPress={handleShare} activeOpacity={0.7}>
              <View style={styles.imageActionBtnInner}>
                <TabIcon name="link" color={colors.text} size={20} />
              </View>
            </TouchableOpacity>
          </View>
          {propertyImages.length > 0 ? (
            <>
              <ScrollView
                ref={imageScrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e: any) => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / IMAGE_CAROUSEL_WIDTH);
                  if (index >= 0 && index < propertyImages.length) setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
                style={styles.imageCarousel}
                contentContainerStyle={{ ...styles.imageCarouselContent, width: IMAGE_CAROUSEL_WIDTH * propertyImages.length }}
                snapToInterval={IMAGE_CAROUSEL_WIDTH}
                snapToAlignment="center">
                {propertyImages.map((image: PropertyImage, index: number) => (
                  <TouchableOpacity
                    key={image.id}
                    style={styles.imageContainer}
                    onPress={() => { setCurrentImageIndex(index); setShowImageGallery(true); }}
                    activeOpacity={0.9}>
                    {failedImages.has(image.id) ? (
                      <View style={[styles.image, styles.imagePlaceholder]}>
                        <View style={styles.imagePlaceholderIconWrap}>
                          <TabIcon name="building" color="#9CA3AF" size={44} />
                        </View>
                        <Text style={styles.imagePlaceholderSubtext}>Image unavailable</Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri: image.url }}
                        style={styles.image}
                        resizeMode="cover"
                        onError={() => setFailedImages(prev => new Set(prev).add(image.id))}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {propertyImages.length > 1 && (
                <View style={styles.imageIndicators}>
                  {propertyImages.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setCurrentImageIndex(index);
                        imageScrollViewRef.current?.scrollTo({ x: index * IMAGE_CAROUSEL_WIDTH, animated: true });
                      }}
                      activeOpacity={0.7}>
                      <View style={[styles.indicator, index === currentImageIndex && styles.indicatorActive]} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={[styles.imageContainer, { width: IMAGE_CAROUSEL_WIDTH }]}>
              <View style={[styles.image, styles.imagePlaceholder]}>
                <View style={styles.imagePlaceholderIconWrap}>
                  <TabIcon name="building" color="#9CA3AF" size={44} />
                </View>
                <Text style={styles.imagePlaceholderSubtext}>No images</Text>
              </View>
            </View>
          )}
        </View>

        {/* Header: Title, badge, location, price */}
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{(property.title || 'Project').toUpperCase()}</Text>
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingBadgeText}>Upcoming Project</Text>
            </View>
          </View>
          <View style={styles.locationContainer}>
            <TabIcon name="location" color="#E53935" size={16} />
            <Text style={styles.location}>{property.location || property.city || property.fullAddress || property.address || 'Location not specified'}</Text>
          </View>
          <Text style={styles.priceLabel}>Price Range</Text>
          <Text style={styles.price}>{priceRangeText}</Text>
          {pricePerSqft && <Text style={styles.priceSub}>{pricePerSqft}</Text>}
          {bookingAmount && <Text style={styles.bookingLabel}>Booking amount: {bookingAmount}</Text>}
        </View>

        {/* Quick info: Configuration (BHK), Status Upcoming, area, towers, units, floors, carpet area */}
        <View style={styles.quickInfo}>
          {bhkTypeText ? (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <TabIcon name="home" color={colors.primary} size={20} />
              </View>
              <Text style={styles.infoText}>{bhkTypeText}</Text>
            </View>
          ) : null}
          <View style={styles.infoCard}>
            <View style={styles.infoIconWrap}>
              <TabIcon name="clipboard" color={colors.primary} size={20} />
            </View>
            <Text style={styles.infoText}>Upcoming</Text>
          </View>
          {(property.property_type || property.project_type) && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <TabIcon name="building" color={colors.primary} size={20} />
              </View>
              <Text style={styles.infoText}>{capitalize(String(property.property_type || property.project_type))}</Text>
            </View>
          )}
          {property.project_status && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <TabIcon name="clipboard" color={colors.primary} size={20} />
              </View>
              <Text style={styles.infoText}>{String(property.project_status)}</Text>
            </View>
          )}
          {hasValidArea && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <TabIcon name="square" color={colors.primary} size={20} />
              </View>
              <Text style={styles.infoText}>{property.area} sq ft</Text>
            </View>
          )}
          {property.number_of_towers != null && property.number_of_towers !== '' && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <TabIcon name="building" color={colors.primary} size={20} />
              </View>
              <Text style={styles.infoText}>{property.number_of_towers} Tower{Number(property.number_of_towers) !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {property.total_units != null && property.total_units !== '' && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <TabIcon name="home" color={colors.primary} size={20} />
              </View>
              <Text style={styles.infoText}>{property.total_units} Units</Text>
            </View>
          )}
          {property.floors_count != null && property.floors_count !== '' && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <TabIcon name="layers" color={colors.primary} size={20} />
              </View>
              <Text style={styles.infoText}>{property.floors_count} Floors</Text>
            </View>
          )}
          {hasValidCarpetArea && (
            <View style={styles.infoCard}>
              <View style={styles.infoIconWrap}>
                <TabIcon name="square" color={colors.primary} size={20} />
              </View>
              <Text style={styles.infoText}>{carpetDisplay}</Text>
            </View>
          )}
        </View>

        {/* Configurations */}
        {configurations.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>Configurations</Text>
            </View>
            <View style={styles.sectionDivider} />
            <View style={styles.chipRow}>
              {configurations.map((c, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleBar} />
            <Text style={styles.sectionTitle}>About this Project</Text>
          </View>
          <View style={styles.sectionDivider} />
          <Text style={styles.description}>{property.description || 'No description available'}</Text>
        </View>

        {/* Project details grid: only show fields that have data from API */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleBar} />
            <Text style={styles.sectionTitle}>Project Details</Text>
          </View>
          <View style={styles.sectionDivider} />
          <View style={styles.detailsGrid}>
            {renderDetail('Builder / Developer', property.builder)}
            {renderDetail('Project Type', property.property_type || property.project_type)}
            {renderDetail('Project Status', property.project_status)}
            {renderDetail('RERA Number', property.rera_number)}
            {bhkTypeText && renderDetail('Configuration', bhkTypeText)}
            {hasValidArea && renderDetail('Area (sq ft)', String(property.area))}
            {hasValidCarpetArea && renderDetail('Carpet Area Range', carpetDisplay)}
            {renderDetail('Number of Towers', property.number_of_towers)}
            {renderDetail('Total Units', property.total_units)}
            {renderDetail('Floors', property.floors_count)}
            {renderDetail('Location', property.location)}
            {renderDetail('City', property.city)}
            {renderDetail('State', property.state)}
            {renderDetail('Address', property.fullAddress || property.address || property.additional_address)}
            {property.additional_address && renderDetail('Additional Address', property.additional_address)}
            {renderDetail('Pincode', property.pincode)}
            {((property.starting_price != null && property.starting_price !== '') || (property.price != null && property.price !== '')) &&
              renderDetail('Starting Price', formatters.price(Number(property.starting_price ?? property.price), false))}
            {pricePerSqft && renderDetail('Price per Sqft', pricePerSqft)}
            {bookingAmount && renderDetail('Booking Amount', bookingAmount)}
            {renderDetail('Expected Launch', formatDate(property.launch_date))}
            {renderDetail('Expected Possession', formatDate(property.possession_date))}
            {renderDetail('RERA Status', property.rera_status)}
            {renderDetail('Land Ownership', property.land_ownership_type)}
            {renderDetail('Bank Approved', property.bank_approved)}
            {approvedBanks.length > 0 && (
              <View style={styles.detailItemFull}>
                <Text style={styles.detailLabel}>Approved Banks</Text>
                <Text style={styles.detailValue}>{approvedBanks.join(', ')}</Text>
              </View>
            )}
            {property.other_bank_names && renderDetail('Other Banks', property.other_bank_names)}
            {property.mapLink ? (
              <View style={styles.detailItemFull}>
                <Text style={styles.detailLabel}>Map Link</Text>
                <TouchableOpacity onPress={() => {
                  const url = String(property.mapLink).startsWith('http') ? property.mapLink : `https://${property.mapLink}`;
                  Linking.openURL(url).catch(() => CustomAlert.alert('Error', 'Could not open map link'));
                }}>
                  <Text style={[styles.detailValue, styles.linkText]}>View on Map</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Amenities - What this place offers (with icons from AMENITIES_LIST) */}
        {amenities.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>Amenities</Text>
            </View>
            <View style={styles.sectionDivider} />
            <View style={styles.amenitiesGrid}>
              {amenities.map((a: string, i: number) => {
                const id = String(a).trim().toLowerCase().replace(/\s+/g, '_');
                const matched = AMENITIES_LIST.find(
                  x => x.id === id || x.id === a || x.label.toLowerCase() === String(a).toLowerCase()
                );
                const icon = matched?.icon ?? '✓';
                return (
                  <View key={i} style={styles.amenityItem}>
                    <Text style={styles.amenityIcon}>{icon}</Text>
                    <Text style={styles.amenityText}>{capitalizeAmenity(matched?.label ?? a)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Location / Address - same as property details: address + View on Map button */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleBar} />
            <Text style={styles.sectionTitle}>Location</Text>
          </View>
          <View style={styles.sectionDivider} />
          <Text style={styles.address}>
            {[property.location, hasValidArea ? property.area : null, property.city, property.state].filter(Boolean).join(', ') || property.address || property.fullAddress || 'Address not available'}
          </Text>
          {property.additional_address && <Text style={styles.addressSub}>{property.additional_address}</Text>}
          {property.pincode && <Text style={styles.addressSub}>Pincode: {property.pincode}</Text>}
          {property.latitude != null && property.longitude != null && (
            <Text style={styles.coordinates}>Coordinates: {property.latitude}, {property.longitude}</Text>
          )}
          <View style={styles.mapPlaceholder}>
            <TabIcon name="map" color={colors.textSecondary} size={40} />
            <Text style={styles.mapPlaceholderText}>{property.location || property.city || 'Location'}</Text>
          </View>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => {
              (navigation as any).navigate('PropertyMap', {
                propertyId: property.id,
                listingType: 'buy',
              });
            }}>
            <TabIcon name="location" color="#E53935" size={18} />
            <Text style={styles.mapButtonText}>View on Map</Text>
          </TouchableOpacity>
        </View>

        {/* Contact & Sales - only show fields that have data from API */}
        {(property.sales_name || property.sales_number || property.mobile_number || property.email_id || property.whatsapp_number || property.alternative_number || property.office_address) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>Contact & Sales</Text>
            </View>
            <View style={styles.sectionDivider} />
            <View style={styles.detailsGrid}>
              {renderDetail('Sales Person Name', property.sales_name)}
              {renderDetail('Phone', property.sales_number)}
              {renderDetail('Mobile', property.mobile_number)}
              {renderDetail('Email', property.email_id)}
              {renderDetail('WhatsApp', property.whatsapp_number)}
              {renderDetail('Alternative Number', property.alternative_number)}
              {renderDetail('Office Address', property.office_address)}
            </View>
          </View>
        )}

        {/* Project Highlights */}
        {property.project_highlights && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>Project Highlights</Text>
            </View>
            <View style={styles.sectionDivider} />
            <Text style={styles.description}>{property.project_highlights}</Text>
          </View>
        )}

        {/* Unique Selling Points */}
        {property.usp && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>Unique Selling Points</Text>
            </View>
            <View style={styles.sectionDivider} />
            <Text style={styles.description}>{property.usp}</Text>
          </View>
        )}

        {/* Project Brochure */}
        {(property.brochure_url || property.brochure) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleBar} />
              <Text style={styles.sectionTitle}>Project Brochure</Text>
            </View>
            <View style={styles.sectionDivider} />
            <TouchableOpacity
              style={styles.brochureButton}
              onPress={() => {
                const url = property.brochure_url || property.brochure;
                const href = String(url).startsWith('http') ? url : `https://${url}`;
                Linking.openURL(href).catch(() => CustomAlert.alert('Error', 'Could not open brochure'));
              }}>
              <Text style={styles.brochureButtonText}>📑 Download Brochure</Text>
            </TouchableOpacity>
          </View>
        )}

        </ScrollView>

        {(isBuyer || isGuest) && (
          <>
            {!interactionLoading && !isGuest && (
              <View style={styles.creditsRow}>
                <View style={styles.creditsDot} />
                <Text style={[styles.creditsText, interactionState.remaining <= 0 && styles.creditsTextError]}>
                  Credits Left: {interactionState.remaining}/{interactionState.max}
                </Text>
              </View>
            )}
            <View style={[styles.buyerActionButtons, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity
              style={[styles.contactButton, (processingContact || interactionLoading) && !isGuest && styles.contactButtonDisabled]}
              onPress={handleViewContact}
              disabled={!isGuest && (processingContact || interactionLoading)}>
              <Text style={styles.contactButtonText}>{showContactModal ? 'Hide Contact' : 'Show Contacts'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.chatButton, (processingChat || interactionLoading) && !isGuest && styles.contactButtonDisabled]}
              onPress={handleChatWithBuilder}
              disabled={!isGuest && (processingChat || interactionLoading)}>
              <>
                <TabIcon name="chats" color={colors.surface} size={18} />
                <Text style={styles.chatButtonText}>Chat with Builder</Text>
              </>
            </TouchableOpacity>
          </View>
        </>
        )}

      {!isBuyer && !isGuest && (
        <View style={[styles.actionButtons, { paddingBottom: insets.bottom }]}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('EditProperty', { propertyId: property.id })}>
            <>
              <TabIcon name="edit" color={colors.surface} size={18} />
              <Text style={styles.editButtonText}>Edit Project</Text>
            </>
          </TouchableOpacity>
        </View>
        )}
      </View>

      {/* Contact Modal - Buyer only (Sales details only from upcoming_project_data) */}
      {isBuyer && (
        <Modal visible={showContactModal} transparent animationType="slide" onRequestClose={() => setShowContactModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Sales Contact Details</Text>
                <TouchableOpacity onPress={() => setShowContactModal(false)}>
                  <TabIcon name="close" color={colors.textSecondary} size={20} />
                </TouchableOpacity>
              </View>
              {!interactionLoading && (
                <View style={styles.modalLimitInfo}>
                  <Text style={[styles.limitText, interactionState.remaining <= 0 && styles.limitTextError]}>
                    Credits Left: {interactionState.remaining} / {interactionState.max}
                  </Text>
                </View>
              )}
              <ScrollView style={styles.contactDetailsScroll} showsVerticalScrollIndicator={false}>
                <View style={styles.contactDetails}>
                  {(() => {
                    const sales = getSalesContactFromProperty(property);
                    const hasAny = sales.name || sales.phone || sales.email || sales.landline || sales.whatsapp || sales.alternative || sales.officeAddress || sales.salesPersons.length > 0;
                    if (!hasAny) {
                      return <Text style={styles.contactValue}>No sales contact details available for this project.</Text>;
                    }
                    return (
                      <>
                        {sales.name && (
                          <View style={styles.contactItem}>
                            <Text style={styles.contactLabel}>Sales Person</Text>
                            <Text style={styles.contactValue}>{sales.name}</Text>
                          </View>
                        )}
                        {sales.phone && (
                          <View style={styles.contactItem}>
                            <Text style={styles.contactLabel}>Phone</Text>
                            <TouchableOpacity onPress={() => handlePhonePress(sales.phone || '')}>
                              <Text style={[styles.contactValue, styles.contactLink]}>{sales.phone}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {sales.landline && (
                          <View style={styles.contactItem}>
                            <Text style={styles.contactLabel}>Landline</Text>
                            <TouchableOpacity onPress={() => handlePhonePress(sales.landline || '')}>
                              <Text style={[styles.contactValue, styles.contactLink]}>{sales.landline}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {sales.email && (
                          <View style={styles.contactItem}>
                            <Text style={styles.contactLabel}>Email</Text>
                            <TouchableOpacity onPress={() => handleEmailPress(sales.email || '')}>
                              <Text style={[styles.contactValue, styles.contactLink]}>{sales.email}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {sales.whatsapp && (
                          <View style={styles.contactItem}>
                            <Text style={styles.contactLabel}>WhatsApp</Text>
                            <TouchableOpacity onPress={() => Linking.openURL(`https://wa.me/${(sales.whatsapp || '').replace(/\D/g, '')}`).catch(() => CustomAlert.alert('Error', 'Unable to open WhatsApp'))}>
                              <Text style={[styles.contactValue, styles.contactLink]}>{sales.whatsapp}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {sales.alternative && (
                          <View style={styles.contactItem}>
                            <Text style={styles.contactLabel}>Alternative Number</Text>
                            <TouchableOpacity onPress={() => handlePhonePress(sales.alternative || '')}>
                              <Text style={[styles.contactValue, styles.contactLink]}>{sales.alternative}</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {sales.officeAddress && (
                          <View style={styles.contactItem}>
                            <Text style={styles.contactLabel}>Office Address</Text>
                            <Text style={styles.contactValue}>{sales.officeAddress}</Text>
                          </View>
                        )}
                        {sales.salesPersons.length > 1 && (
                          <View style={styles.contactItem}>
                            <Text style={styles.contactLabel}>Other Sales Contacts</Text>
                            {sales.salesPersons.slice(1, 5).map((sp: any, idx: number) => (
                              <View key={idx} style={styles.contactSubItem}>
                                <Text style={styles.contactSubValue}>
                                  {sp.name}{sp.number ? ` • ${sp.number}` : ''}{sp.email ? ` • ${sp.email}` : ''}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </>
                    );
                  })()}
                </View>
              </ScrollView>
              <TouchableOpacity
                style={styles.modalChatButton}
                onPress={() => {
                  setShowContactModal(false);
                  setTimeout(() => handleChatWithBuilder(), 300);
                }}>
                <>
                  <TabIcon name="chats" color={colors.surface} size={18} />
                  <Text style={styles.modalChatButtonText}>Start Chat</Text>
                </>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      <ImageGallery
        visible={showImageGallery}
        images={propertyImages.map(img => img.url)}
        initialIndex={currentImageIndex}
        onClose={() => setShowImageGallery(false)}
      />
    </View>
  );
};

const REFERENCE_BG = '#0D1B2A';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: REFERENCE_BG },
  contentSheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xxl,
    borderTopRightRadius: borderRadius.xxl,
    overflow: 'hidden',
    marginTop: -borderRadius.xxl,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  imageCarouselContainer: { height: 300, position: 'relative', marginHorizontal: spacing.md, marginTop: spacing.lg, borderRadius: borderRadius.xl, overflow: 'hidden', backgroundColor: '#D4E4D4' },
  imageBackButton: { position: 'absolute', top: spacing.md, left: spacing.md, zIndex: 10 },
  imageBackButtonInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', ...Platform.select({ android: { elevation: 4 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 } }) },
  imageActionButtons: { position: 'absolute', top: spacing.md, right: spacing.md, flexDirection: 'row', gap: spacing.sm, zIndex: 10 },
  imageActionBtn: { zIndex: 11 },
  imageActionBtnInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.95)', justifyContent: 'center', alignItems: 'center', ...Platform.select({ android: { elevation: 4 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 } }) },
  imageCarousel: { height: 300, borderRadius: borderRadius.lg },
  imageCarouselContent: { alignItems: 'center' },
  imageContainer: { width: IMAGE_CAROUSEL_WIDTH, height: 300, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderIconWrap: { marginBottom: spacing.xs },
  imagePlaceholderSubtext: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  imageIndicators: { position: 'absolute', bottom: spacing.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, zIndex: 3 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  indicatorActive: { backgroundColor: colors.surface, width: 24 },
  shareIcon: { fontSize: 18 },
  headerSection: { backgroundColor: colors.surface, padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, flex: 1, lineHeight: 32 },
  upcomingBadge: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  upcomingBadgeText: { ...typography.caption, color: colors.surface, fontWeight: '600', fontSize: 11 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.xs },
  locationIconWrap: {},
  location: { fontSize: 16, color: colors.textSecondary, flex: 1 },
  priceLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textTransform: 'uppercase', fontWeight: '600' },
  price: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  priceSub: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  bookingLabel: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  linkText: { color: colors.primary, textDecorationLine: 'underline', fontWeight: '600' },
  brochureButton: { backgroundColor: colors.surfaceSecondary, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  brochureButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  mapButton: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 2, borderColor: colors.primary, marginTop: spacing.sm },
  mapButtonText: { ...typography.body, color: colors.primary, fontWeight: '700', fontSize: 16 },
  quickInfo: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  infoCard: { flex: 1, minWidth: '30%', alignItems: 'center', backgroundColor: colors.surfaceSecondary, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  infoIconWrap: { marginBottom: spacing.xs },
  infoText: { ...typography.caption, color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  section: { backgroundColor: colors.surface, padding: spacing.xl, marginTop: 0, paddingTop: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center' },
  sectionTitleBar: { width: 4, height: 20, borderRadius: 2, backgroundColor: colors.primary, marginRight: spacing.sm },
  sectionDivider: { height: 1, backgroundColor: 'rgba(29, 36, 43, 0.1)', marginTop: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.round },
  chipText: { ...typography.caption, color: colors.text, fontWeight: '600', fontSize: 13 },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 24, fontSize: 15 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detailItem: { width: '47%', padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  detailItemFull: { width: '100%', padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs },
  detailLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 12, fontWeight: '500', textTransform: 'uppercase' },
  detailValue: { ...typography.body, color: colors.text, fontWeight: '600', fontSize: 14 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amenityItem: { flexDirection: 'row', alignItems: 'center', width: '47%', backgroundColor: colors.surfaceSecondary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  amenityIcon: { fontSize: 16, color: colors.primary, fontWeight: 'bold' },
  amenityText: { ...typography.body, color: colors.text, fontSize: 14, fontWeight: '500' },
  address: { ...typography.body, color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.xs },
  mapPlaceholder: { height: 140, backgroundColor: colors.accentLighter, borderRadius: borderRadius.lg, marginTop: spacing.sm, marginBottom: spacing.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 119, 192, 0.15)' },
  mapPlaceholderText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  addressSub: { ...typography.body, color: colors.textSecondary, lineHeight: 22, fontSize: 14, marginTop: spacing.xs },
  coordinates: { ...typography.caption, color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: spacing.xs },
  actionButtons: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexDirection: 'row', gap: spacing.md },
  editButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.lg, minHeight: 52 },
  editButtonText: { ...typography.body, color: colors.surface, fontWeight: '700', fontSize: 16 },
  buyerActionButtons: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: colors.surface, padding: spacing.md, gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, ...Platform.select({ android: { elevation: 8 }, ios: { shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4 } }) },
  contactButton: { flex: 1, backgroundColor: colors.surface, borderRadius: borderRadius.lg, paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.primary },
  contactButtonText: { ...typography.body, color: colors.primary, fontWeight: '700', fontSize: 16 },
  chatButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.lg },
  chatButtonText: { ...typography.body, color: colors.surface, fontWeight: '700', fontSize: 16 },
  contactButtonDisabled: { opacity: 0.5 },
  creditsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  creditsDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  creditsText: { ...typography.caption, fontSize: 14, color: colors.primary, fontWeight: '600' },
  creditsTextError: { color: colors.error || '#c62828' },
  limitText: { ...typography.caption, fontSize: 14, color: colors.text, fontWeight: '600' },
  limitTextError: { color: colors.error || '#c62828' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.surface, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 24, fontWeight: '700', color: colors.text },
  modalClose: { fontSize: 28, color: colors.textSecondary, fontWeight: '300' },
  modalLimitInfo: { marginBottom: spacing.md },
  contactDetailsScroll: { maxHeight: 320 },
  contactDetails: { gap: spacing.sm, marginBottom: spacing.lg },
  contactItem: { paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  contactLabel: { ...typography.caption, color: colors.textSecondary, fontSize: 13, fontWeight: '600', textTransform: 'uppercase', marginBottom: spacing.xs },
  contactValue: { ...typography.body, color: colors.text, fontSize: 16, fontWeight: '600' },
  contactLink: { color: colors.primary, textDecorationLine: 'underline' },
  contactSubItem: { paddingTop: spacing.xs },
  contactSubValue: { ...typography.body, color: colors.textSecondary, fontSize: 14 },
  modalChatButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.lg, minHeight: 52 },
  modalChatButtonText: { ...typography.body, color: colors.surface, fontWeight: '700', fontSize: 16 },
});

export default UpcomingProjectDetailsScreen;
