import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Image,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AgentStackParamList } from '../../navigation/AgentNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon, TabIconName } from '../../components/navigation/TabIcons';
import Dropdown from '../../components/common/Dropdown';
import { propertyService } from '../../services/property.service';
import { uploadPropertyImageWithModeration, moderateFirebaseUrlForProperty } from '../../services/imageUpload.service';
import { USE_FIREBASE_STORAGE } from '../../config/firebaseStorage.config';
import { isFirebaseStorageAvailable } from '../../services/firebaseStorageProperty.service';
import LocationPicker from '../../components/map/LocationPicker';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import { extractStateFromContext } from '../../utils/geocoding';
import { useAuth } from '../../context/AuthContext';
import { formatters } from '../../utils/formatters';
import { Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import CustomAlert from '../../utils/alertHelper';
import DocumentPicker from 'react-native-document-picker';

type AddProjectScreenNavigationProp = NativeStackNavigationProp<
  AgentStackParamList,
  'AddProject'
>;

type Props = {
  navigation: AddProjectScreenNavigationProp;
};

const PROJECT_TYPE_ICONS: Record<string, TabIconName> = {
  apartment: 'building', villa: 'home', independent_house: 'home', row_house: 'home',
  penthouse: 'building', studio_apartment: 'bed', plot: 'square',
  commercial_office: 'building', commercial_shop: 'building', pg_hostel: 'bed', warehouse: 'building',
};

const PROJECT_TYPES = [
  { id: 'apartment', label: 'Apartment' },
  { id: 'villa', label: 'Villa / Banglow' },
  { id: 'independent_house', label: 'Independent House' },
  { id: 'row_house', label: 'Row House/ Farm House' },
  { id: 'penthouse', label: 'Penthouse' },
  { id: 'studio_apartment', label: 'Studio Apartment' },
  { id: 'plot', label: 'Plot / Land / Industrial Property' },
  { id: 'commercial_office', label: 'Commercial Office' },
  { id: 'commercial_shop', label: 'Commercial Shop' },
  { id: 'pg_hostel', label: 'PG / Hostel' },
  { id: 'warehouse', label: 'Warehouse / Godown' },
];

// Project Status Options
const PROJECT_STATUSES = [
  { label: 'UNDER CONSTRUCTION', value: 'UNDER CONSTRUCTION' },
  { label: 'PRE-LAUNCH', value: 'PRE-LAUNCH' },
  { label: 'COMPLETED', value: 'COMPLETED' },
];

// Configuration Options (per project type - per Upcoming Project Form spec)
const CONFIGURATIONS: Array<{ id: string; label: string }> = [
  // Apartment
  { id: 'studio_apt', label: 'Studio Apartment' },
  { id: '1bhk', label: '1BHK' },
  { id: '2bhk', label: '2BHK' },
  { id: '3bhk', label: '3BHK' },
  { id: '4bhk', label: '4BHK' },
  { id: '5bhk', label: '5+BHK' },
  { id: 'duplex_apt', label: 'Duplex Apartment' },
  { id: 'penthouse_apt', label: 'Penthouse' },
  // Villa / Banglow
  { id: '2bhk_villa', label: '2BHK Villa' },
  { id: '3bhk_villa', label: '3BHK Villa' },
  { id: '4bhk_villa', label: '4BHK Villa' },
  { id: '5bhk_villa', label: '5+BHK Villa' },
  { id: 'luxury_villa', label: 'Luxury Villa' },
  // Independent House
  { id: '1bhk_ind', label: '1BHK Independent House' },
  { id: '2bhk_ind', label: '2BHK Independent House' },
  { id: '3bhk_ind', label: '3BHK Independent House' },
  { id: '4bhk_ind', label: '4+BHK Independent House' },
  // Row House / Farm House
  { id: '2bhk_row', label: '2BHK Row House' },
  { id: '3bhk_row', label: '3BHK Row House' },
  { id: '4bhk_row', label: '4BHK Row House' },
  { id: 'farm_plot', label: 'Farm House Plot' },
  { id: 'luxury_farm', label: 'Luxury Farm House' },
  // Penthouse
  { id: '3bhk_ph', label: '3BHK Penthouse' },
  { id: '4bhk_ph', label: '4BHK Penthouse' },
  { id: '5bhk_ph', label: '5+BHK Penthouse' },
  // Studio Apartment
  { id: 'studio_unit', label: 'Studio Unit' },
  { id: 'studio_balcony', label: 'Studio + Balcony' },
  { id: 'studio_deluxe', label: 'Studio Deluxe' },
  // Plot / Land / Industrial
  { id: 'res_plot', label: 'Residential Plot' },
  { id: 'com_plot', label: 'Commercial Plot' },
  { id: 'ind_plot', label: 'Industrial Plot' },
  { id: 'na_plot', label: 'NA Plot' },
  { id: 'agri_land', label: 'Agricultural Land' },
  // Commercial Office
  { id: 'office_bare', label: 'Office Space (Bare Shell)' },
  { id: 'office_furnished', label: 'Furnished Office' },
  { id: 'coworking', label: 'Co-working Space' },
  { id: 'it_park', label: 'IT / Tech Park Office' },
  { id: 'business_center', label: 'Business Center Office' },
  // Commercial Shop
  { id: 'retail_shop', label: 'Retail Shop' },
  { id: 'showroom', label: 'Showroom' },
  { id: 'foodcourt_shop', label: 'Food Court Shop' },
  { id: 'kiosk', label: 'Kiosk' },
  { id: 'mall_shop', label: 'Mall Shop' },
  // PG / Hostel
  { id: 'single_sharing', label: 'Single Sharing' },
  { id: 'double_sharing', label: 'Double Sharing' },
  { id: 'triple_sharing', label: 'Triple Sharing' },
  { id: 'dormitory', label: 'Dormitory' },
  { id: 'hostel_gb', label: 'Girls Hostel / Boys Hostel' },
  // Warehouse / Godown
  { id: 'wh_small', label: 'Small Warehouse' },
  { id: 'wh_medium', label: 'Medium Warehouse' },
  { id: 'wh_large', label: 'Large Warehouse' },
  { id: 'cold_storage', label: 'Cold Storage' },
  { id: 'logistics_wh', label: 'Logistics Warehouse' },
];

const CONFIGURATIONS_BY_TYPE: Record<string, string[]> = {
  apartment: ['studio_apt', '1bhk', '2bhk', '3bhk', '4bhk', '5bhk', 'duplex_apt', 'penthouse_apt'],
  villa: ['2bhk_villa', '3bhk_villa', '4bhk_villa', '5bhk_villa', 'luxury_villa'],
  independent_house: ['1bhk_ind', '2bhk_ind', '3bhk_ind', '4bhk_ind'],
  row_house: ['2bhk_row', '3bhk_row', '4bhk_row', 'farm_plot', 'luxury_farm'],
  penthouse: ['3bhk_ph', '4bhk_ph', '5bhk_ph'],
  studio_apartment: ['studio_unit', 'studio_balcony', 'studio_deluxe'],
  plot: ['res_plot', 'com_plot', 'ind_plot', 'na_plot', 'agri_land'],
  commercial_office: ['office_bare', 'office_furnished', 'coworking', 'it_park', 'business_center'],
  commercial_shop: ['retail_shop', 'showroom', 'foodcourt_shop', 'kiosk', 'mall_shop'],
  pg_hostel: ['single_sharing', 'double_sharing', 'triple_sharing', 'dormitory', 'hostel_gb'],
  warehouse: ['wh_small', 'wh_medium', 'wh_large', 'cold_storage', 'logistics_wh'],
};

const AMENITY_ICONS: Record<string, TabIconName> = {
  parking: 'square', lift: 'layers', security: 'support', power_backup: 'sparkles',
  gym: 'square', swimming_pool: 'sparkles', garden: 'sparkles', clubhouse: 'building',
  playground: 'sparkles', cctv: 'camera', intercom: 'phone', fire_safety: 'alert',
  water_supply: 'bath', gas_pipeline: 'sparkles', wifi: 'sparkles', ac: 'sparkles',
  electricity: 'sparkles',
};

const AMENITIES = [
  { id: 'parking', label: 'Parking' },
  { id: 'lift', label: 'Lift' },
  { id: 'security', label: '24x7 Security' },
  { id: 'power_backup', label: 'Power Backup' },
  { id: 'gym', label: 'Gym' },
  { id: 'swimming_pool', label: 'Swimming Pool' },
  { id: 'garden', label: 'Garden' },
  { id: 'clubhouse', label: 'Club House' },
  { id: 'playground', label: "Children's Play Area" },
  { id: 'cctv', label: 'CCTV' },
  { id: 'intercom', label: 'Intercom' },
  { id: 'fire_safety', label: 'Fire Safety' },
  { id: 'water_supply', label: '24x7 Water' },
  { id: 'gas_pipeline', label: 'Gas Pipeline' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'ac', label: 'Air Conditioning' },
  { id: 'electricity', label: 'Electricity' },
];

// Bank Options
const BANKS = [
  { id: 'sbi', label: 'SBI' },
  { id: 'hdfc', label: 'HDFC Bank' },
  { id: 'kotak', label: 'Kotak Mahindra Bank' },
  { id: 'icici', label: 'ICICI Bank' },
  { id: 'axis', label: 'Axis Bank' },
  { id: 'bob', label: 'Bank of Baroda (BoB)' },
  { id: 'other', label: 'Other' },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const INDIAN_STATES_OPTIONS = INDIAN_STATES.map(s => ({ label: s, value: s }));

const AddProjectScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Basic Project Information
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('');
  const [projectStatus, setProjectStatus] = useState('UNDER CONSTRUCTION');
  const [reraNumber, setReraNumber] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Location Details
  const [location, setLocation] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [stateAutoFilled, setStateAutoFilled] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [additionalAddress, setAdditionalAddress] = useState('');
  const [pincode, setPincode] = useState('');

  // Step 3: Configuration & Inventory
  const [selectedConfigurations, setSelectedConfigurations] = useState<string[]>([]);
  const [carpetAreaRange, setCarpetAreaRange] = useState('');
  const [numberOfTowers, setNumberOfTowers] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [unitsPerFloor, setUnitsPerFloor] = useState('');
  const [numberOfVillas, setNumberOfVillas] = useState('');
  const [numberOfPlots, setNumberOfPlots] = useState('');
  const [numberOfFloorsOrTowers, setNumberOfFloorsOrTowers] = useState('');
  const [bedCapacity, setBedCapacity] = useState('');
  const [loadingDocks, setLoadingDocks] = useState('');

  // Step 4: Pricing & Timeline
  const [startingPrice, setStartingPrice] = useState('');
  const [pricePerSqft, setPricePerSqft] = useState('');
  const [bookingAmount, setBookingAmount] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [possessionDate, setPossessionDate] = useState('');
  const [showLaunchDatePicker, setShowLaunchDatePicker] = useState(false);
  const [showPossessionDatePicker, setShowPossessionDatePicker] = useState(false);

  // Step 5: Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Legal & Approval (sent in payload, no UI yet - for future expansion)
  const [reraStatus, setReraStatus] = useState('');
  const [landOwnershipType, setLandOwnershipType] = useState('');
  const [bankApproved, setBankApproved] = useState('');
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);

  // Step 7: Media Uploads
  const [coverImage, setCoverImage] = useState<{ uri: string; base64?: string } | null>(null);
  const [projectImages, setProjectImages] = useState<Array<{
    uri: string;
    base64?: string;
    moderationStatus?: 'checking' | 'APPROVED' | 'REJECTED' | 'PENDING';
    moderationReason?: string;
    imageUrl?: string;
  }>>([]);
  const [floorPlans, setFloorPlans] = useState<Array<{ uri: string; name: string }>>([]);
  const [brochure, setBrochure] = useState<{ uri: string; name: string } | null>(null);
  const [masterPlan, setMasterPlan] = useState<{ uri: string; base64?: string } | null>(null);

  // Step 5: Contact & Sales (at least one sales person, max 5)
  const [salesPersons, setSalesPersons] = useState<Array<{
    name: string;
    number: string;
    email: string;
    landlineNumber: string;
    whatsappNumber: string;
    alternativeNumber: string;
  }>>([
    { name: '', number: '', email: '', landlineNumber: '', whatsappNumber: '', alternativeNumber: '' },
  ]);

  const totalSteps = 5;
  const steps: Array<{ id: number; name: string; iconName: TabIconName }> = [
    { id: 1, name: 'Basic Details', iconName: 'file-text' },
    { id: 2, name: 'Location', iconName: 'location' },
    { id: 3, name: 'Configuration', iconName: 'building' },
    { id: 4, name: 'Pricing & Amenities', iconName: 'dollar' },
    { id: 5, name: 'Media & Contact', iconName: 'camera' },
  ];

  // Price formatting helper
  const formatPriceInput = (value: string): number => {
    // Remove all non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.-]/g, '');
    // Handle Lakhs/Crore format (e.g., "45 Lakhs" -> 4500000)
    if (value.toLowerCase().includes('lakh') || value.toLowerCase().includes('lac')) {
      const num = parseFloat(cleaned) || 0;
      return num * 100000;
    }
    if (value.toLowerCase().includes('crore') || value.toLowerCase().includes('cr')) {
      const num = parseFloat(cleaned) || 0;
      return num * 10000000;
    }
    return parseFloat(cleaned) || 0;
  };

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // When project type changes, clear configurations invalid for the new type
  useEffect(() => {
    if (!projectType) {
      setSelectedConfigurations([]);
      return;
    }
    const validIds = CONFIGURATIONS_BY_TYPE[projectType] || [];
    setSelectedConfigurations(prev => prev.filter(id => validIds.includes(id)));
  }, [projectType]);

  // Handle location selection from autosuggest
  const handleLocationSelect = (locationData: any) => {
    setLocation(locationData.placeName || locationData.name);
    setLocationQuery(locationData.placeName || locationData.name);
    setShowLocationSuggestions(false);
    clearFieldError('location');

    // Extract state from context
    const extractedState = extractStateFromContext(locationData.context);
    if (extractedState) {
      setState(extractedState);
      setStateAutoFilled(true);
      clearFieldError('state');
    }

    // Set coordinates if available
    if (locationData.coordinates) {
      setLongitude(locationData.coordinates[0]);
      setLatitude(locationData.coordinates[1]);
    }

    // Extract city/area
    const cityContext = locationData.context?.find((ctx: any) =>
      ctx.id?.startsWith('place')
    );
    if (cityContext) {
      setCity(cityContext.text || '');
      // IMPORTANT: don't overwrite numeric built-up area (sq ft) with city/locality text.
    }
  };

  // Image picker helper
  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Image Picker Permission',
            message: 'App needs access to your photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const requestCameraPermissionForCapture = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'App needs camera access to take photos',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Handle project images from camera (single photo, then same Firebase + moderation flow)
  const handleProjectImagesFromCamera = async () => {
    const hasPermission = await requestCameraPermissionForCapture();
    if (!hasPermission) {
      CustomAlert.alert('Permission Denied', 'Please grant camera permission to take photos');
      return;
    }
    if (projectImages.length >= 20) {
      CustomAlert.alert('Limit Reached', 'You can upload maximum 20 images');
      return;
    }
    const options = { mediaType: 'photo' as MediaType, quality: 0.8 as const, includeBase64: true };
    launchCamera(options, async (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorCode) {
        if (response.errorMessage) CustomAlert.alert('Error', response.errorMessage);
        return;
      }
      if (response.assets && response.assets[0]) {
        const asset = response.assets[0];
        const newImage = {
          uri: asset.uri || '',
          base64: asset.base64 ? `data:image/${asset.type || 'jpeg'};base64,${asset.base64}` : undefined,
          moderationStatus: 'checking' as const,
        };
        setProjectImages(prev => [...prev, newImage]);
        const firebaseEnabled = USE_FIREBASE_STORAGE && user?.id;
        const firebaseAvailable = firebaseEnabled && isFirebaseStorageAvailable();
        if (!firebaseEnabled || !firebaseAvailable) {
          CustomAlert.alert('Image Upload Unavailable', 'Firebase Storage is required for project images.');
          setProjectImages(prev => {
            const idx = prev.length - 1;
            const updated = [...prev];
            if (updated[idx]) updated[idx] = { ...updated[idx], moderationStatus: 'REJECTED' as const, moderationReason: 'Firebase unavailable' };
            return updated;
          });
          return;
        }
        const prevLen = projectImages.length;
        uploadPropertyImageWithModeration(newImage.uri, null, user!.id)
          .then(result => {
            setProjectImages(prev => {
              const updated = [...prev];
              const imgIndex = prevLen;
              if (updated[imgIndex]) {
                const status = String(result.moderationStatus || '').toUpperCase();
                const moderationStatus = (status === 'SAFE' || status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' || status === 'UNSAFE' ? 'REJECTED' : 'PENDING') as 'APPROVED' | 'REJECTED' | 'PENDING';
                updated[imgIndex] = {
                  ...updated[imgIndex],
                  moderationStatus,
                  moderationReason: result.moderationReason ?? undefined,
                  imageUrl: result.imageUrl || result.firebaseUrl || '',
                };
              }
              return updated;
            });
            if (result.moderationStatus === 'REJECTED' || result.moderationStatus === 'UNSAFE') {
              CustomAlert.alert('Image Rejected', result.moderationReason || 'Image does not meet our guidelines.');
            }
          })
          .catch(err => {
            setProjectImages(prev => {
              const updated = [...prev];
              if (updated[prevLen]) updated[prevLen] = { ...updated[prevLen], moderationStatus: 'REJECTED' as const, moderationReason: err.message };
              return updated;
            });
            CustomAlert.alert('Upload Failed', err.message || 'Failed to upload image.');
          });
      }
    });
  };

  // Handle project images upload with moderation (gallery)
  const handleProjectImagesUpload = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      CustomAlert.alert('Permission Denied', 'Please grant photo access permission');
      return;
    }

    if (projectImages.length >= 20) {
      CustomAlert.alert('Limit Reached', 'You can upload maximum 20 images');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      selectionLimit: 20 - projectImages.length,
      includeBase64: true,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        CustomAlert.alert('Error', response.errorMessage || 'Failed to pick image');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const remainingSlots = 20 - projectImages.length;
        const assetsToAdd = response.assets.slice(0, remainingSlots);

        // Add images with "checking" status
        const newImages = assetsToAdd.map(asset => ({
          uri: asset.uri || '',
          base64: asset.base64 ? `data:image/${asset.type || 'jpeg'};base64,${asset.base64}` : undefined,
          moderationStatus: 'checking' as const,
        }));

        setProjectImages(prev => [...prev, ...newImages]);

        // Storage workflow: Device → Firebase Storage → backend receives URL for moderation only; images stored in Firebase
        const firebaseEnabled = USE_FIREBASE_STORAGE && user?.id;
        const firebaseAvailable = firebaseEnabled && isFirebaseStorageAvailable();

        if (!firebaseEnabled || !firebaseAvailable) {
          const message = !user?.id
            ? 'You must be signed in to upload images.'
            : !firebaseAvailable
              ? 'Firebase Storage is not available. Please rebuild the app to enable image uploads.'
              : 'Firebase Storage is required for project images. Please enable it and rebuild the app.';
          CustomAlert.alert('Image Upload Unavailable', message, [{ text: 'OK' }]);
          setProjectImages(prev => {
            const updated = [...prev];
            newImages.forEach((_, index) => {
              const imgIndex = prev.length - newImages.length + index;
              if (updated[imgIndex]) {
                updated[imgIndex] = {
                  ...updated[imgIndex],
                  moderationStatus: 'REJECTED' as const,
                  moderationReason: message,
                };
              }
            });
            return updated;
          });
        } else {
          newImages.forEach((img, index) => {
            if (img.uri) {
              uploadPropertyImageWithModeration(img.uri, null, user!.id)
                .then(result => {
                  setProjectImages(prev => {
                    const updated = [...prev];
                    const imgIndex = prev.length - newImages.length + index;
                    if (updated[imgIndex]) {
                      const status = String(result.moderationStatus || '').toUpperCase();
                      const moderationStatus = (status === 'SAFE' || status === 'APPROVED' || status === 'PENDING' || status === 'NEEDS_REVIEW' ? 'APPROVED' : 'REJECTED') as 'APPROVED' | 'REJECTED' | 'PENDING';
                      const finalUrl = result.imageUrl || result.firebaseUrl || '';
                      updated[imgIndex] = {
                        ...updated[imgIndex],
                        moderationStatus: moderationStatus as 'APPROVED' | 'REJECTED' | 'PENDING',
                        moderationReason: result.moderationReason || undefined,
                        imageUrl: finalUrl,
                      };
                    }
                    return updated;
                  });
                  if (result.moderationStatus === 'REJECTED' || result.moderationStatus === 'UNSAFE') {
                    CustomAlert.alert('Image Rejected', result.moderationReason || 'Image does not meet our guidelines.', [{ text: 'OK' }]);
                  }
                })
                .catch(error => {
                  console.error('[AddProject] Firebase upload error:', error);
                  setProjectImages(prev => {
                    const updated = [...prev];
                    const imgIndex = prev.length - newImages.length + index;
                    if (updated[imgIndex]) {
                      updated[imgIndex] = {
                        ...updated[imgIndex],
                        moderationStatus: 'REJECTED' as const,
                        moderationReason: error.message || 'Failed to upload image',
                      };
                    }
                    return updated;
                  });
                  let errorMessage = error.message || 'Failed to upload image to Firebase.';
                  if (errorMessage.includes('not available') || errorMessage.includes('not installed')) {
                    errorMessage = 'Firebase Storage is not available. Please rebuild the app.';
                  }
                  CustomAlert.alert('Upload Failed', errorMessage, [{ text: 'OK' }]);
                });
            }
          });
        }
      }
    });
  };

  // Scroll to first field with error
  const scrollToFirstError = useCallback((firstErrorField: string) => {
    // Scroll to top so user sees error messages; ScrollView doesn't have findNodeHandle for field refs easily
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // Validation functions (per AddUpcomingProjectPopup spec)
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1: {
        // Basic Details: project name, type, status, description (min 100 chars)
        const nextErrors: Record<string, string> = {};
        if (!projectName.trim()) nextErrors.projectName = 'Project name is required';
        if (!projectType) nextErrors.projectType = 'Project type is required';
        if (!projectStatus || !['UNDER CONSTRUCTION', 'PRE-LAUNCH', 'COMPLETED'].includes(projectStatus)) {
          nextErrors.projectStatus = 'Project status is required';
        }
        if (!description.trim()) nextErrors.description = 'Project description is required';
        else if (description.trim().length < 100) {
          nextErrors.description = 'Project description must be at least 100 characters';
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
          scrollToFirstError(Object.keys(nextErrors)[0]);
          return false;
        }
        setFieldErrors({});
        return true;
      }
      case 2: {
        // Location: at least one of location or area, state, fullAddress, pincode 6 digits
        const nextErrors: Record<string, string> = {};
        if (!location.trim() && !area.trim()) {
          nextErrors.location = 'Location is required';
        }
        if (!state.trim()) nextErrors.state = 'State is required';
        if (!additionalAddress.trim()) nextErrors.additionalAddress = 'Additional address is required';
        if (!pincode.trim()) nextErrors.pincode = 'Pincode is required';
        else if (!/^\d{6}$/.test(pincode)) {
          nextErrors.pincode = 'Pincode must be 6 digits';
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
          scrollToFirstError(Object.keys(nextErrors)[0]);
          return false;
        }
        setFieldErrors({});
        return true;
      }
      case 3: {
        // Configuration: at least one config (from options for project type), area range
        const nextErrors: Record<string, string> = {};
        if (!projectType) {
          nextErrors.configurations = 'Select a project type in Step 1 first';
        } else if (selectedConfigurations.length === 0) {
          nextErrors.configurations = 'At least one configuration is required';
        }
        if (!carpetAreaRange.trim()) {
          nextErrors.carpetAreaRange = 'Area range is required';
        } else if (!/\d/.test(carpetAreaRange)) {
          nextErrors.carpetAreaRange = 'Area range must contain a number';
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
          scrollToFirstError(Object.keys(nextErrors)[0]);
          return false;
        }
        setFieldErrors({});
        return true;
      }
      case 4: {
        // Pricing & Amenities: starting price, at least one amenity
        const nextErrors: Record<string, string> = {};
        if (!startingPrice.trim()) nextErrors.startingPrice = 'Starting price is required';
        if (selectedAmenities.length === 0) nextErrors.amenities = 'At least one amenity must be selected';
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
          scrollToFirstError(Object.keys(nextErrors)[0]);
          return false;
        }
        setFieldErrors({});
        return true;
      }
      case 5: {
        // Media & Contact: images 2-20, no rejected, at least one approved; at least one sales person
        const nextErrors: Record<string, string> = {};
        const approvedImages = projectImages.filter(img => img.moderationStatus === 'APPROVED');
        const rejectedImages = projectImages.filter(img => img.moderationStatus === 'REJECTED');
        const checkingImages = projectImages.filter(img => img.moderationStatus === 'checking');

        if (checkingImages.length > 0) {
          nextErrors.projectImages = 'Please wait for all images to be validated';
        } else if (rejectedImages.length > 0) {
          nextErrors.projectImages = `Please remove ${rejectedImages.length} rejected image(s)`;
        } else if (projectImages.length < 2) {
          nextErrors.projectImages = 'Please upload at least 2 images';
        } else if (projectImages.length > 20) {
          nextErrors.projectImages = 'You can upload a maximum of 20 images';
        } else if (approvedImages.length === 0) {
          nextErrors.projectImages = 'At least one image must be approved';
        }

        const validSalesPersons = salesPersons.filter(sp => {
          const nameOk = /^[a-zA-Z\s]+$/.test(sp.name.trim()) && sp.name.trim().length >= 2;
          const numberOk = sp.number.replace(/\D/g, '').length === 10;
          const emailOk = sp.email.trim() && sp.email.includes('@');
          return nameOk && numberOk && emailOk;
        });
        if (validSalesPersons.length === 0) {
          if (salesPersons.length === 0) {
            nextErrors.salesPersons = 'At least one sales person is required';
          } else {
            const first = salesPersons[0];
            if (!first.name.trim()) nextErrors.salesPerson_name_0 = 'Sales person name is required';
            else if (/[^a-zA-Z\s]/.test(first.name)) nextErrors.salesPerson_name_0 = 'Name should contain only letters';
            const digits = first.number.replace(/\D/g, '');
            if (!digits) nextErrors.salesPerson_number_0 = 'Sales number is required';
            else if (digits.length !== 10) nextErrors.salesPerson_number_0 = 'Sales number must be 10 digits';
            if (!first.email.trim() || !first.email.includes('@')) nextErrors.salesPerson_email_0 = 'Email ID is required';
          }
        }
        if (Object.keys(nextErrors).length > 0) {
          setFieldErrors(nextErrors);
          scrollToFirstError(Object.keys(nextErrors)[0]);
          return false;
        }
        setFieldErrors({});
        return true;
      }
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Collect approved images: prefer Firebase URL when available (same as Add Property)
      const approvedImages = projectImages
        .filter(img => img.moderationStatus === 'APPROVED')
        .map(img => img.imageUrl || img.base64)
        .filter((url): url is string => url !== undefined && url !== '');

      if (approvedImages.length < 2) {
        Alert.alert('Error', 'Please upload at least 2 approved images', [{ text: 'OK' }]);
        setIsSubmitting(false);
        return;
      }

      const formattedStartingPrice = formatPriceInput(startingPrice);
      const parsedArea = parseFloat(area.replace(/[^0-9.]/g, ''));

      // ── Build property payload WITHOUT images ──
      const propertyTypeForBackend = PROJECT_TYPES.find(t => t.id === projectType)?.label || projectType;

      // Map configuration IDs to their display labels for the backend
      const configLabels = selectedConfigurations
        .map(id => CONFIGURATIONS.find(c => c.id === id)?.label)
        .filter((label): label is string => !!label);

      // Build salesPersons array with all 6 fields per person
      const salesPersonsPayload = salesPersons
        .filter(sp => sp.name.trim() && sp.number.trim() && sp.email.trim())
        .map(sp => ({
          name: sp.name.trim(),
          number: sp.number.trim(),
          email: sp.email.trim(),
          landlineNumber: sp.landlineNumber?.trim() || '',
          whatsappNumber: sp.whatsappNumber?.trim() || '',
          alternativeNumber: sp.alternativeNumber?.trim() || '',
        }));

      const rawUpcomingData: Record<string, any> = {
        builderName: user?.full_name || '',
        projectStatus: projectStatus,
        reraNumber: reraNumber.trim() || null,
        configurations: configLabels,
        carpetAreaRange: carpetAreaRange.trim() || null,
        numberOfTowers: numberOfTowers || null,
        totalUnits: totalUnits || null,
        unitsPerFloor: unitsPerFloor || null,
        numberOfVillas: numberOfVillas || null,
        numberOfPlots: numberOfPlots || null,
        numberOfFloorsOrTowers: numberOfFloorsOrTowers || null,
        bedCapacity: bedCapacity || null,
        loadingDocks: loadingDocks || null,
        startingPrice: startingPrice.trim() || null,
        pricePerSqft: pricePerSqft.trim() || null,
        bookingAmount: bookingAmount.trim() || null,
        expectedLaunchDate: launchDate || null,
        expectedPossessionDate: possessionDate || null,
        reraStatus: reraStatus || null,
        landOwnershipType: landOwnershipType || null,
        bankApproved: bankApproved || null,
        approvedBanks: selectedBanks.length > 0 ? selectedBanks.map(id => BANKS.find(b => b.id === id)?.label || id) : null,
        salesPersons: salesPersonsPayload.length > 0 ? salesPersonsPayload : null,
        pincode: pincode.trim() || null,
        mapLink: latitude && longitude ? `https://maps.google.com/?q=${latitude},${longitude}` : null,
      };
      const upcoming_project_data = Object.fromEntries(
        Object.entries(rawUpcomingData).filter(([, v]) => v !== null && v !== undefined && v !== '')
      );
      const propertyData: any = {
        title: projectName.trim(),
        property_type: propertyTypeForBackend,
        status: 'sale',
        project_type: 'upcoming',
        description: description.trim(),
        location: location.trim(),
        area: isNaN(parsedArea) ? null : parsedArea,
        state: state.trim(),
        additional_address: additionalAddress.trim() || null,
        latitude: latitude || null,
        longitude: longitude || null,
        price: formattedStartingPrice,
        amenities: selectedAmenities,
        upcoming_project_data,
      };

      // ── Step 1: Create property WITHOUT images → get property_id ──
      console.log('[Agent AddProject] Step 1: Creating property (without images)…');
      const createResponse: any = await propertyService.createProperty(propertyData, 'agent');

      if (!createResponse?.success) {
        let errorMessage = 'Failed to create project';
        if (createResponse?.message) {
          errorMessage = createResponse.message;
        } else if (createResponse?.error) {
          errorMessage = typeof createResponse.error === 'string' ? createResponse.error : createResponse.error?.message || errorMessage;
        } else if (createResponse?.data?.message) {
          errorMessage = createResponse.data.message;
        } else if (createResponse?.data?.error) {
          errorMessage = typeof createResponse.data.error === 'string' ? createResponse.data.error : createResponse.data.error?.message || errorMessage;
        } else if (typeof createResponse === 'string') {
          errorMessage = createResponse;
        }
        console.error('[AddProject] Property creation failed:', errorMessage);
        console.error('[AddProject] Full error response:', JSON.stringify(createResponse, null, 2));
        Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
        return;
      }

      const propertyId =
        createResponse.data?.property?.id ||
        createResponse.data?.property?.property_id ||
        createResponse.data?.property?.propertyId ||
        createResponse.data?.property_id ||
        createResponse.data?.id ||
        createResponse.property_id ||
        createResponse.id;

      let failedCount = 0;

      if (propertyId && approvedImages.length > 0) {
        console.log('[Agent AddProject] Step 1 done – property_id:', propertyId);

        // ── Step 2: Moderate + watermark each Firebase URL with property_id ──
        console.log('[Agent AddProject] Step 2: Watermarking', approvedImages.length, 'images…');
        const watermarkedUrls: string[] = [];
        for (const firebaseUrl of approvedImages) {
          try {
            const result = await moderateFirebaseUrlForProperty(firebaseUrl, propertyId);
            watermarkedUrls.push(result.imageUrl || firebaseUrl);
            console.log('[Agent AddProject] Watermarked:', (result.imageUrl || firebaseUrl).substring(0, 80));
          } catch (wmErr: any) {
            failedCount += 1;
            console.warn('[Agent AddProject] Watermark failed for image, using original URL:', wmErr.message);
            watermarkedUrls.push(firebaseUrl); // Fallback to original Firebase URL
          }
        }

        // ── Step 3: Update property with watermarked image URLs ──
        console.log('[Agent AddProject] Step 3: Updating property with watermarked URLs…');
        await propertyService.updateProperty(propertyId, {
          images: watermarkedUrls,
          cover_image: watermarkedUrls[0] || null,
        });

        console.log('[Agent AddProject] ✅ Project created and images watermarked successfully');
      } else {
        console.warn('[AddProject] Could not watermark images (missing property_id or images).', {
          hasPropertyId: !!propertyId,
          approvedImagesCount: approvedImages.length,
          fullResponse: JSON.stringify(createResponse, null, 2),
        });
      }

      Alert.alert(
        'Success',
        `Upcoming project published successfully!${approvedImages.length > 0 ? ` ${approvedImages.length} image(s) uploaded.` : ''}${failedCount > 0 ? ` (${failedCount} image(s) failed to watermark; you can re-upload in Edit.)` : ''
        }`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      console.error('Submit error:', error);
      let errorMessage = 'Failed to create project. Please try again.';
      const resData = error?.response?.data;
      // Check multiple possible error message locations (backend may use message, error, msg, etc.)
      if (resData?.message) {
        errorMessage = resData.message;
      } else if (resData?.error) {
        errorMessage = typeof resData.error === 'string' ? resData.error : resData.error?.message || errorMessage;
      } else if (resData?.msg) {
        errorMessage = resData.msg;
      } else if (resData?.errors && Array.isArray(resData.errors) && resData.errors[0]) {
        errorMessage = typeof resData.errors[0] === 'string' ? resData.errors[0] : resData.errors[0]?.message || errorMessage;
      } else if (typeof resData === 'string') {
        errorMessage = resData;
      } else if (error?.message) {
        errorMessage = error.message;
      } else if (error?.error) {
        errorMessage = typeof error.error === 'string' ? error.error : error.error?.message || errorMessage;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Cancel Project',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  };

  const getStepStatus = (stepId: number) => {
    if (currentStep > stepId) {
      return 'completed';
    } else if (currentStep === stepId) {
      return 'active';
    }
    return 'pending';
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Basic Project Information</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Project Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Green Valley Residency"
                placeholderTextColor={colors.textSecondary}
                value={projectName}
                onChangeText={(text: string) => {
                  setProjectName(text);
                  clearFieldError('projectName');
                }}
              />
              {!!fieldErrors.projectName && (
                <Text style={styles.fieldErrorText}>{fieldErrors.projectName}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Builder / Developer Name</Text>
              <TextInput
                style={[styles.input, styles.disabledInput]}
                value={user?.full_name || ''}
                editable={false}
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.hintText}>Auto-filled from your account</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Project Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.buttonGrid}>
                {PROJECT_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.id}
                    style={[
                      styles.typeButton,
                      projectType === type.id && styles.typeButtonActive,
                    ]}
                    onPress={() => {
                      setProjectType(type.id);
                      clearFieldError('projectType');
                    }}>
                    <TabIcon name={PROJECT_TYPE_ICONS[type.id] || 'building'} color={projectType === type.id ? colors.surface : colors.primary} size={24} />
                    <Text style={[
                      styles.typeButtonText,
                      projectType === type.id && styles.typeButtonTextActive,
                    ]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!fieldErrors.projectType && (
                <Text style={styles.fieldErrorText}>{fieldErrors.projectType}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Project Status <Text style={styles.required}>*</Text>
              </Text>
              <Dropdown
                placeholder="Select project status"
                options={PROJECT_STATUSES}
                value={projectStatus}
                onSelect={(value) => {
                  setProjectStatus(value);
                  clearFieldError('projectStatus');
                }}
              />
              {!!fieldErrors.projectStatus && (
                <Text style={styles.fieldErrorText}>{fieldErrors.projectStatus}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>RERA Number (Optional but recommended)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., RERA/PKR/2019/001234"
                placeholderTextColor={colors.textSecondary}
                value={reraNumber}
                onChangeText={setReraNumber}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Project Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Provide a detailed overview (minimum 100 characters)"
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={(text: string) => {
                  setDescription(text);
                  clearFieldError('description');
                }}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {description.length}/1000 {description.trim().length < 100 && '(min 100 required)'}
              </Text>
              {!!fieldErrors.description && (
                <Text style={styles.fieldErrorText}>{fieldErrors.description}</Text>
              )}
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Location</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Location / Area <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter locality, area or landmark"
                  placeholderTextColor={colors.textSecondary}
                  value={locationQuery}
                  onChangeText={(text: string) => {
                    setLocationQuery(text);
                    setLocation(text);
                    setShowLocationSuggestions(text.length >= 2);
                    clearFieldError('location');
                    if (!text) {
                      setLocation('');
                    }
                  }}
                />
                {showLocationSuggestions && (
                  <LocationAutoSuggest
                    query={locationQuery}
                    onSelect={handleLocationSelect}
                    visible={showLocationSuggestions}
                  />
                )}
              </View>
              <Text style={styles.hintText}>At least one of location or area is required</Text>
              {!!fieldErrors.location && (
                <Text style={styles.fieldErrorText}>{fieldErrors.location}</Text>
              )}

              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => setLocationPickerVisible(true)}>
                <TabIcon name={latitude && longitude ? 'location' : 'map'} color={colors.surface} size={20} />
                <Text style={styles.mapButtonText}>
                  {latitude && longitude ? 'Change Location' : 'Add Location on Map'}
                </Text>
              </TouchableOpacity>
              {latitude && longitude && (
                <View style={styles.coordinatesContainer}>
                  <Text style={styles.coordinatesText}>
                    Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </Text>
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => {
                      setLatitude(null);
                      setLongitude(null);
                    }}>
                    <Text style={styles.removeButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!latitude && !longitude && (
                <Text style={styles.hintText}>Select exact location on map for better visibility</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Area (sq ft)
              </Text>
              <View style={styles.areaInputContainer}>
                <TextInput
                  style={[styles.input, styles.areaInput]}
                  placeholder="e.g., 1200"
                  placeholderTextColor={colors.textSecondary}
                  value={area}
                  onChangeText={(text: string) => {
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    const next = parts.length <= 2 ? (parts[0] + (parts[1] != null ? '.' + parts[1] : '')) : parts[0];
                    setArea(next);
                    clearFieldError('area');
                  }}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.areaUnit}>sq.ft</Text>
              </View>
              {!!fieldErrors.area && (
                <Text style={styles.fieldErrorText}>{fieldErrors.area}</Text>
              )}
            </View>

            <LocationPicker
              visible={locationPickerVisible}
              initialLocation={latitude && longitude ? { latitude, longitude } : undefined}
              onLocationSelect={(locationData) => {
                setLatitude(locationData.latitude);
                setLongitude(locationData.longitude);
                if (locationData.address) {
                  setLocation(locationData.address);
                  setLocationQuery(locationData.address);
                }
                // Extract state from context if available
                const extractedState = extractStateFromContext(locationData.context);
                if (extractedState) {
                  setState(extractedState);
                  setStateAutoFilled(true);
                }
                setLocationPickerVisible(false);
              }}
              onClose={() => setLocationPickerVisible(false)}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                State <Text style={styles.required}>*</Text>
              </Text>
              <Dropdown
                placeholder="Select state"
                options={INDIAN_STATES_OPTIONS}
                value={state}
                onSelect={(value) => {
                  setState(value);
                  setStateAutoFilled(false);
                  clearFieldError('state');
                }}
              />
              {stateAutoFilled && (
                <Text style={styles.hintText}>Auto-filled from location</Text>
              )}
              {!!fieldErrors.state && (
                <Text style={styles.fieldErrorText}>{fieldErrors.state}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Additional Address <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter additional address details"
                placeholderTextColor={colors.textSecondary}
                value={additionalAddress}
                onChangeText={(text: string) => {
                  setAdditionalAddress(text);
                  clearFieldError('additionalAddress');
                }}
              />
              {!!fieldErrors.additionalAddress && (
                <Text style={styles.fieldErrorText}>{fieldErrors.additionalAddress}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Pincode <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="6 digits"
                placeholderTextColor={colors.textSecondary}
                value={pincode}
                onChangeText={(text: string) => {
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setPincode(cleaned);
                  clearFieldError('pincode');
                }}
                keyboardType="numeric"
                maxLength={6}
              />
              {!!fieldErrors.pincode && (
                <Text style={styles.fieldErrorText}>{fieldErrors.pincode}</Text>
              )}
            </View>
          </View>
        );

      case 3:
        const configIdsForType = projectType ? (CONFIGURATIONS_BY_TYPE[projectType] || []) : [];
        const configOptionsForType = configIdsForType.map(id => CONFIGURATIONS.find(c => c.id === id)!).filter(Boolean);
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Configuration</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Configurations <Text style={styles.required}>*</Text>
              </Text>
              {!projectType ? (
                <Text style={styles.warningText}>Select a project type in Step 1 first</Text>
              ) : null}
              <View style={styles.buttonGrid}>
                {configOptionsForType.map(config => (
                  <TouchableOpacity
                    key={config.id}
                    style={[
                      styles.configButton,
                      selectedConfigurations.includes(config.id) && styles.configButtonActive,
                    ]}
                    onPress={() => {
                      clearFieldError('configurations');
                      if (selectedConfigurations.includes(config.id)) {
                        setSelectedConfigurations(prev => prev.filter(id => id !== config.id));
                      } else {
                        setSelectedConfigurations(prev => [...prev, config.id]);
                      }
                    }}>
                    {selectedConfigurations.includes(config.id) && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                    <Text style={[
                      styles.configButtonText,
                      selectedConfigurations.includes(config.id) && styles.configButtonTextActive,
                    ]}>{config.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!fieldErrors.configurations && (
                <Text style={styles.fieldErrorText}>{fieldErrors.configurations}</Text>
              )}
            </View>

            {(() => {
              const areaLabelByType: Record<string, { label: string; suffix: string; placeholder: string }> = {
                plot: { label: 'Plot Size Range', suffix: 'sq.ft / sq.m', placeholder: 'e.g., 500 - 2000' },
                commercial_office: { label: 'Area Range', suffix: 'sq.ft', placeholder: 'e.g., 650 - 1200' },
                commercial_shop: { label: 'Area Range', suffix: 'sq.ft', placeholder: 'e.g., 650 - 1200' },
                warehouse: { label: 'Built-up Area Range', suffix: 'sq.ft', placeholder: 'e.g., 650 - 1200' },
                pg_hostel: { label: 'Carpet Area Range', suffix: 'sq.ft', placeholder: 'e.g., 650 - 1200' },
              };
              const areaMeta = areaLabelByType[projectType] || { label: 'Carpet Area Range (sq.ft)', suffix: 'sq.ft', placeholder: 'e.g., 650 - 1200' };
              return (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    {areaMeta.label} <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.areaInputContainer}>
                    <TextInput
                      style={[styles.input, styles.areaInput]}
                      placeholder={areaMeta.placeholder}
                      placeholderTextColor={colors.textSecondary}
                      value={carpetAreaRange}
                      onChangeText={(text: string) => {
                        const cleaned = text.replace(/sq\.ft|sq\.m|sq ft|sq m/gi, '').replace(/[^0-9.\-\s]/g, '').trim();
                        setCarpetAreaRange(cleaned);
                        clearFieldError('carpetAreaRange');
                      }}
                      keyboardType="decimal-pad"
                    />
                    <Text style={styles.areaUnit}>{areaMeta.suffix}</Text>
                  </View>
                  {!!fieldErrors.carpetAreaRange && (
                    <Text style={styles.fieldErrorText}>{fieldErrors.carpetAreaRange}</Text>
                  )}
                </View>
              );
            })()}

            {(projectType === 'apartment' || projectType === 'penthouse' || projectType === 'studio_apartment') && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Number of Towers (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 3"
                  placeholderTextColor={colors.textSecondary}
                  value={numberOfTowers}
                  onChangeText={(text: string) => setNumberOfTowers(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
            )}
            {(projectType === 'apartment' || projectType === 'studio_apartment') && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Units per floor (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 4"
                  placeholderTextColor={colors.textSecondary}
                  value={unitsPerFloor}
                  onChangeText={(text: string) => setUnitsPerFloor(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
            )}
            {projectType === 'villa' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Number of Villas (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 24"
                  placeholderTextColor={colors.textSecondary}
                  value={numberOfVillas}
                  onChangeText={(text: string) => setNumberOfVillas(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
            )}
            {(projectType === 'independent_house' || projectType === 'row_house') && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Total Units (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 200"
                  placeholderTextColor={colors.textSecondary}
                  value={totalUnits}
                  onChangeText={(text: string) => setTotalUnits(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
            )}
            {projectType === 'plot' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Number of Plots (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 50"
                  placeholderTextColor={colors.textSecondary}
                  value={numberOfPlots}
                  onChangeText={(text: string) => setNumberOfPlots(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
            )}
            {projectType === 'commercial_office' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Number of Floors / Towers (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 10"
                  placeholderTextColor={colors.textSecondary}
                  value={numberOfFloorsOrTowers}
                  onChangeText={(text: string) => setNumberOfFloorsOrTowers(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
            )}
            {projectType === 'pg_hostel' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Bed Capacity (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 100"
                  placeholderTextColor={colors.textSecondary}
                  value={bedCapacity}
                  onChangeText={(text: string) => setBedCapacity(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
            )}
            {projectType === 'warehouse' && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Loading Docks (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 4"
                  placeholderTextColor={colors.textSecondary}
                  value={loadingDocks}
                  onChangeText={(text: string) => setLoadingDocks(text.replace(/[^0-9]/g, ''))}
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pricing & Amenities</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Starting Price <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="e.g., 4500000 or 45-60"
                  placeholderTextColor={colors.textSecondary}
                  value={startingPrice}
                  onChangeText={(text: string) => {
                    setStartingPrice(text);
                    clearFieldError('startingPrice');
                  }}
                  keyboardType="numeric"
                />
              </View>
              {startingPrice && (
                <Text style={styles.priceDisplay}>
                  Price: {formatters.price(formatPriceInput(startingPrice))}
                </Text>
              )}
              {!!fieldErrors.startingPrice && (
                <Text style={styles.fieldErrorText}>{fieldErrors.startingPrice}</Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Price per Sq.ft (Optional)</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="e.g., 5000 or 5000-6000"
                  placeholderTextColor={colors.textSecondary}
                  value={pricePerSqft}
                  onChangeText={setPricePerSqft}
                  keyboardType="numeric"
                />
              </View>
              {pricePerSqft && (
                <Text style={styles.priceDisplay}>
                  Price: {formatters.price(formatPriceInput(pricePerSqft))}/sq.ft
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Booking Amount Price (Optional)</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="e.g., 200000 or 1.5-2.5"
                  placeholderTextColor={colors.textSecondary}
                  value={bookingAmount}
                  onChangeText={setBookingAmount}
                  keyboardType="numeric"
                />
              </View>
              {bookingAmount && (
                <Text style={styles.priceDisplay}>
                  Price: {formatters.price(formatPriceInput(bookingAmount))}
                </Text>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Launch Date (Optional)</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowLaunchDatePicker(true)}>
                <Text style={launchDate ? styles.dateText : styles.datePlaceholder}>
                  {launchDate || 'Select date'}
                </Text>
              </TouchableOpacity>
              {showLaunchDatePicker && (
                <DateTimePicker
                  value={launchDate ? new Date(launchDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selectedDate) => {
                    setShowLaunchDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const y = selectedDate.getFullYear();
                      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const d = String(selectedDate.getDate()).padStart(2, '0');
                      setLaunchDate(`${y}-${m}-${d}`);
                    }
                  }}
                  onTouchCancel={() => setShowLaunchDatePicker(false)}
                />
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Expected Possession Date (Optional)</Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowPossessionDatePicker(true)}>
                <Text style={possessionDate ? styles.dateText : styles.datePlaceholder}>
                  {possessionDate || 'Select date'}
                </Text>
              </TouchableOpacity>
              {showPossessionDatePicker && (
                <DateTimePicker
                  value={possessionDate ? new Date(possessionDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_, selectedDate) => {
                    setShowPossessionDatePicker(Platform.OS === 'ios');
                    if (selectedDate) {
                      const y = selectedDate.getFullYear();
                      const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                      const d = String(selectedDate.getDate()).padStart(2, '0');
                      setPossessionDate(`${y}-${m}-${d}`);
                    }
                  }}
                  onTouchCancel={() => setShowPossessionDatePicker(false)}
                />
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Amenities <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.amenitiesGrid}>
                {AMENITIES.map(amenity => (
                  <TouchableOpacity
                    key={amenity.id}
                    style={[
                      styles.amenityButton,
                      selectedAmenities.includes(amenity.id) && styles.amenityButtonActive,
                    ]}
                    onPress={() => {
                      clearFieldError('amenities');
                      if (selectedAmenities.includes(amenity.id)) {
                        setSelectedAmenities(prev => prev.filter(id => id !== amenity.id));
                      } else {
                        setSelectedAmenities(prev => [...prev, amenity.id]);
                      }
                    }}>
                    <TabIcon name={AMENITY_ICONS[amenity.id] || 'sparkles'} color={selectedAmenities.includes(amenity.id) ? colors.surface : colors.primary} size={22} />
                    {selectedAmenities.includes(amenity.id) && (
                      <Text style={styles.amenityCheckmark}>✓</Text>
                    )}
                    <Text style={[
                      styles.amenityText,
                      selectedAmenities.includes(amenity.id) && styles.amenityTextActive,
                    ]}>{amenity.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!!fieldErrors.amenities && (
                <Text style={styles.fieldErrorText}>{fieldErrors.amenities}</Text>
              )}
            </View>
          </View>
        );

      case 5: {
        const approvedImagesCount = projectImages.filter(img => img.moderationStatus === 'APPROVED').length;

        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Media & Contact</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Project Cover Image (Optional)</Text>
              <View style={styles.coverImageRow}>
                <TouchableOpacity
                  style={styles.coverImageUpload}
                  onPress={async () => {
                    const hasPermission = await requestCameraPermission();
                    if (!hasPermission) return;
                    launchImageLibrary({ mediaType: 'photo' as MediaType, quality: 0.8 as const, includeBase64: true }, (response) => {
                      if (response.assets && response.assets[0]) {
                        const asset = response.assets[0];
                        setCoverImage({
                          uri: asset.uri || '',
                          base64: asset.base64 ? `data:image/${asset.type || 'jpeg'};base64,${asset.base64}` : undefined,
                        });
                      }
                    });
                  }}>
                  {coverImage ? (
                    <Image source={{ uri: coverImage.uri }} style={styles.coverImagePreview} />
                  ) : (
                    <View style={styles.coverImagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>🖼️</Text>
                      <Text style={styles.imagePlaceholderLabel}>Upload</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.coverImageCamera}
                  onPress={async () => {
                    const ok = await requestCameraPermissionForCapture();
                    if (!ok) return;
                    launchCamera({ mediaType: 'photo' as MediaType, quality: 0.8 as const, includeBase64: true }, (response) => {
                      if (response.assets && response.assets[0]) {
                        const asset = response.assets[0];
                        setCoverImage({
                          uri: asset.uri || '',
                          base64: asset.base64 ? `data:image/${asset.type || 'jpeg'};base64,${asset.base64}` : undefined,
                        });
                      }
                    });
                  }}>
                  <TabIcon name="camera" color={colors.primary} size={36} />
                  <Text style={styles.coverImageCameraLabel}>Take photo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Project Images <Text style={styles.required}>*</Text> (Concept images / 3D renders allowed)
              </Text>
              <View style={styles.projectImagesButtonRow}>
                <TouchableOpacity
                  style={[styles.uploadButton, styles.projectImageButton]}
                  onPress={() => {
                    clearFieldError('projectImages');
                    handleProjectImagesUpload();
                  }}>
                  <Text style={styles.uploadButtonText}>Gallery (Max 20)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadButton, styles.uploadButtonSecondary, styles.projectImageButton]}
                  onPress={() => {
                    clearFieldError('projectImages');
                    handleProjectImagesFromCamera();
                  }}>
                  <View style={styles.uploadButtonIconWrap}><TabIcon name="camera" color={colors.primary} size={20} /></View>
                  <Text style={styles.uploadButtonTextSecondary}>Camera</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.imageCountText}>
                Images uploaded: {approvedImagesCount} / 20 (Minimum 2 required)
              </Text>
              {approvedImagesCount < 2 && (
                <Text style={styles.warningText}>
                  ⚠️ Please upload at least 2 images to continue.
                </Text>
              )}
              {!!fieldErrors.projectImages && (
                <Text style={styles.fieldErrorText}>{fieldErrors.projectImages}</Text>
              )}

              {projectImages.length > 0 && (
                <View style={styles.imagesGrid}>
                  {projectImages.map((img, index) => {
                    const status = img.moderationStatus;
                    return (
                      <View key={index} style={styles.imageItem}>
                        <Image source={{ uri: img.uri }} style={styles.projectImage} />
                        {status === 'checking' && (
                          <View style={styles.imageStatusOverlay}>
                            <ActivityIndicator size="small" color={colors.surface} />
                            <Text style={styles.imageStatusText}>Checking...</Text>
                          </View>
                        )}
                        {status === 'APPROVED' && (
                          <View style={[styles.imageStatusOverlay, styles.approvedOverlay]}>
                            <Text style={styles.imageStatusText}>✓ Approved</Text>
                          </View>
                        )}
                        {status === 'REJECTED' && (
                          <View style={[styles.imageStatusOverlay, styles.rejectedOverlay]}>
                            <Text style={styles.imageStatusText}>✗ {img.moderationReason || 'Rejected'}</Text>
                            <TouchableOpacity
                              style={styles.removeAndRetryButton}
                              onPress={() => {
                                setProjectImages(prev => prev.filter((_, i) => i !== index));
                              }}>
                              <Text style={styles.removeAndRetryText}>Remove & Try Again</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                        {status !== 'checking' && (
                          <TouchableOpacity
                            style={styles.removeImageButton}
                            onPress={() => {
                              setProjectImages(prev => prev.filter((_, i) => i !== index));
                            }}>
                            <TabIcon name="close" color={colors.surface} size={16} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Floor Plans (PDF / Images) (Optional)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={async () => {
                  const hasPermission = await requestCameraPermission();
                  if (!hasPermission) return;

                  launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (response) => {
                    if (response.assets) {
                      const newPlans = response.assets.map(asset => ({
                        uri: asset.uri || '',
                        name: asset.fileName || 'floor_plan.jpg',
                      }));
                      setFloorPlans(prev => [...prev, ...newPlans]);
                    }
                  });
                }}>
                <View style={styles.uploadButtonIconWrap}><TabIcon name="file" color={colors.primary} size={20} /></View>
                <Text style={styles.uploadButtonText}>Upload Floor Plans</Text>
              </TouchableOpacity>
              {floorPlans.length > 0 && (
                <View style={styles.filesList}>
                  {floorPlans.map((plan, index) => (
                    <View key={index} style={styles.fileItem}>
                      <Text style={styles.fileName}>{plan.name}</Text>
                      <TouchableOpacity
                        onPress={() => setFloorPlans(prev => prev.filter((_, i) => i !== index))}>
                        <TabIcon name="close" color={colors.error} size={16} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Brochure (PDF) (Optional)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={async () => {
                  try {
                    const res = await DocumentPicker.pickSingle({ type: DocumentPicker.types.pdf });
                    if (res?.uri) {
                      setBrochure({
                        uri: res.uri,
                        name: res.name || 'brochure.pdf',
                      });
                    }
                  } catch (err: any) {
                    if (!DocumentPicker.isCancel(err)) {
                      Alert.alert('Error', 'Failed to pick PDF file');
                    }
                  }
                }}>
                <View style={styles.uploadButtonIconWrap}><TabIcon name="file" color={colors.primary} size={20} /></View>
                <Text style={styles.uploadButtonText}>Upload Brochure (PDF)</Text>
              </TouchableOpacity>
              {brochure && (
                <View style={styles.fileItem}>
                  <Text style={styles.fileName}>{brochure.name}</Text>
                  <TouchableOpacity onPress={() => setBrochure(null)}>
                    <Text style={styles.removeFileText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Master Plan Image (Optional)</Text>
              <View style={styles.coverImageActions}>
                <TouchableOpacity
                  style={styles.imageUploadButton}
                  onPress={async () => {
                    const hasPermission = await requestCameraPermission();
                    if (!hasPermission) return;
                    launchImageLibrary({ mediaType: 'photo' as MediaType, quality: 0.8 as const, includeBase64: true }, (response) => {
                      if (response.assets && response.assets[0]) {
                        const asset = response.assets[0];
                        setMasterPlan({
                          uri: asset.uri || '',
                          base64: asset.base64 ? `data:image/${asset.type || 'jpeg'};base64,${asset.base64}` : undefined,
                        });
                      }
                    });
                  }}>
                  {masterPlan ? (
                    <Image source={{ uri: masterPlan.uri }} style={styles.imagePreview} />
                  ) : (
                    <View style={styles.imagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>🗺️</Text>
                      <Text style={styles.imagePlaceholderLabel}>Upload Master Plan</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.uploadButton, styles.uploadButtonSecondary]}
                  onPress={async () => {
                    const ok = await requestCameraPermissionForCapture();
                    if (!ok) return;
                    launchCamera({ mediaType: 'photo' as MediaType, quality: 0.8 as const, includeBase64: true }, (response) => {
                      if (response.assets && response.assets[0]) {
                        const asset = response.assets[0];
                        setMasterPlan({
                          uri: asset.uri || '',
                          base64: asset.base64 ? `data:image/${asset.type || 'jpeg'};base64,${asset.base64}` : undefined,
                        });
                      }
                    });
                  }}>
                  <View style={styles.uploadButtonIconWrap}><TabIcon name="camera" color={colors.primary} size={20} /></View>
                <Text style={styles.uploadButtonText}>Take photo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Sales Person(s) <Text style={styles.required}>*</Text> (At least 1, max 5)
              </Text>
              {!!fieldErrors.salesPersons && (
                <Text style={styles.fieldErrorText}>{fieldErrors.salesPersons}</Text>
              )}
              {salesPersons.length === 0 ? (
                <TouchableOpacity
                  style={styles.addSalesPersonButton}
                  onPress={() => setSalesPersons([{ name: '', number: '', email: '', landlineNumber: '', whatsappNumber: '', alternativeNumber: '' }])}>
                  <Text style={styles.addSalesPersonText}>+ Add sales person</Text>
                </TouchableOpacity>
              ) : null}
              {salesPersons.map((sp, index) => (
                <View key={index} style={styles.salesPersonCard}>
                  <View style={styles.salesPersonRow}>
                    <Text style={styles.salesPersonLabel}>Person {index + 1}</Text>
                    <TouchableOpacity
                      onPress={() => setSalesPersons(prev => prev.filter((_, i) => i !== index))}
                      style={styles.removeSalesPersonBtn}>
                      <Text style={styles.removeSalesPersonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.salesPersonLabel}>Name <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Letters and spaces only"
                    placeholderTextColor={colors.textSecondary}
                    value={sp.name}
                    onChangeText={(text: string) => {
                      const cleaned = text.replace(/[^a-zA-Z\s]/g, '');
                      setSalesPersons(prev => {
                        const next = [...prev];
                        next[index] = { ...next[index], name: cleaned };
                        return next;
                      });
                      clearFieldError(`salesPerson_name_${index}`);
                    }}
                  />
                  {!!fieldErrors[`salesPerson_name_${index}`] && (
                    <Text style={styles.fieldErrorText}>{fieldErrors[`salesPerson_name_${index}`]}</Text>
                  )}
                  <Text style={styles.salesPersonLabel}>Contact Number <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit phone number"
                    placeholderTextColor={colors.textSecondary}
                    value={sp.number}
                    onChangeText={(text: string) => {
                      const cleaned = text.replace(/\D/g, '').slice(0, 10);
                      setSalesPersons(prev => {
                        const next = [...prev];
                        next[index] = { ...next[index], number: cleaned };
                        return next;
                      });
                      clearFieldError(`salesPerson_number_${index}`);
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  {!!fieldErrors[`salesPerson_number_${index}`] && (
                    <Text style={styles.fieldErrorText}>{fieldErrors[`salesPerson_number_${index}`]}</Text>
                  )}
                  <Text style={styles.salesPersonLabel}>Email ID <Text style={styles.required}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.textSecondary}
                    value={sp.email}
                    onChangeText={(text: string) => {
                      setSalesPersons(prev => {
                        const next = [...prev];
                        next[index] = { ...next[index], email: text };
                        return next;
                      });
                      clearFieldError(`salesPerson_email_${index}`);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  {!!fieldErrors[`salesPerson_email_${index}`] && (
                    <Text style={styles.fieldErrorText}>{fieldErrors[`salesPerson_email_${index}`]}</Text>
                  )}
                  <Text style={styles.salesPersonLabel}>Landline Number (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 020-12345678"
                    placeholderTextColor={colors.textSecondary}
                    value={sp.landlineNumber}
                    onChangeText={(text: string) => {
                      const cleaned = text.replace(/[^0-9\s\-]/g, '').slice(0, 15);
                      setSalesPersons(prev => {
                        const next = [...prev];
                        next[index] = { ...next[index], landlineNumber: cleaned };
                        return next;
                      });
                    }}
                    keyboardType="phone-pad"
                    maxLength={15}
                  />
                  <Text style={styles.salesPersonLabel}>WhatsApp Number (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit number"
                    placeholderTextColor={colors.textSecondary}
                    value={sp.whatsappNumber}
                    onChangeText={(text: string) => {
                      const cleaned = text.replace(/\D/g, '').slice(0, 10);
                      setSalesPersons(prev => {
                        const next = [...prev];
                        next[index] = { ...next[index], whatsappNumber: cleaned };
                        return next;
                      });
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                  <Text style={styles.salesPersonLabel}>Alternative Number (Optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10-digit number"
                    placeholderTextColor={colors.textSecondary}
                    value={sp.alternativeNumber}
                    onChangeText={(text: string) => {
                      const cleaned = text.replace(/\D/g, '').slice(0, 10);
                      setSalesPersons(prev => {
                        const next = [...prev];
                        next[index] = { ...next[index], alternativeNumber: cleaned };
                        return next;
                      });
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
              ))}
              {salesPersons.length < 5 && (
                <TouchableOpacity
                  style={styles.addSalesPersonButton}
                  onPress={() => setSalesPersons(prev => [...prev, { name: '', number: '', email: '', landlineNumber: '', whatsappNumber: '', alternativeNumber: '' }])}>
                  <Text style={styles.addSalesPersonText}>+ Add another sales person ({salesPersons.length}/5)</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      presentationStyle="overFullScreen"
      statusBarTranslucent={true}
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* @ts-expect-error - SafeAreaView style typing mismatch in this project */}
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Add Project</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <TabIcon name="close" color={colors.textSecondary} size={22} />
              </TouchableOpacity>
            </View>

            {/* Progress Steps */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.progressContainer}
              contentContainerStyle={styles.progressContent}>
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                return (
                  <TouchableOpacity
                    key={step.id}
                    style={styles.stepItem}
                    onPress={() => {
                      // Allow navigation to completed steps
                      if (status === 'completed' || status === 'active') {
                        setCurrentStep(step.id);
                      }
                    }}
                    disabled={status === 'pending'}>
                    <View
                      style={[
                        styles.stepCircle,
                        status === 'completed' && styles.stepCircleCompleted,
                        status === 'active' && styles.stepCircleActive,
                      ]}>
                      {status === 'completed' ? (
                        <TabIcon name="check" color={colors.surface} size={16} />
                      ) : (
                        <TabIcon name={step.iconName} color={status === 'active' ? colors.surface : colors.textSecondary} size={16} />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        status === 'completed' && styles.stepLabelCompleted,
                        status === 'active' && styles.stepLabelActive,
                      ]}
                      numberOfLines={1}>
                      {step.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Content */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={false}>
              {renderStepContent()}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
                  <TabIcon name="chevron-left" color={colors.primary} size={20} />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.nextButton,
                  isSubmitting && styles.nextButtonDisabled
                ]}
                onPress={handleNext}
                disabled={isSubmitting}>
                {isSubmitting ? (
                  <View style={styles.submitButtonInner}>
                    <ActivityIndicator size="small" color={colors.surface} />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : currentStep === totalSteps ? (
                  <View style={styles.publishButtonInner}>
                    <TabIcon name="check" color={colors.surface} size={20} />
                    <Text style={styles.publishButtonText}>Publish Project</Text>
                  </View>
                ) : (
                  <View style={styles.nextButtonInner}>
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Text style={styles.nextButtonArrow}>→</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

// Styles - same as builder screen
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxWidth: 600,
    height: '90%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h1,
    fontSize: 24,
    color: colors.text,
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: colors.text,
    fontWeight: '600',
  },
  progressContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 100,
  },
  progressContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  stepItem: {
    alignItems: 'center',
    minWidth: 60,
    marginRight: spacing.sm,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleCompleted: {
    backgroundColor: '#0077C0',
  },
  stepCircleActive: {
    backgroundColor: '#0077C0',
  },
  stepIcon: {
    fontSize: 18,
  },
  stepCheckmark: {
    fontSize: 20,
    color: colors.surface,
    fontWeight: 'bold',
  },
  stepLabel: {
    ...typography.caption,
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: '#0077C0',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#0077C0',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    ...typography.h1,
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 14,
  },
  required: {
    color: colors.error,
  },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabledInput: {
    backgroundColor: colors.border + '40',
    color: colors.textSecondary,
  },
  textArea: {
    height: 120,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  fieldErrorText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  salesPersonCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  salesPersonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  salesPersonLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  removeSalesPersonBtn: {
    padding: spacing.xs,
  },
  removeSalesPersonText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
  },
  addSalesPersonButton: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addSalesPersonText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 14,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  typeButton: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  typeButtonActive: {
    borderColor: '#0077C0',
    borderWidth: 2,
    backgroundColor: '#0077C020',
  },
  typeButtonIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  typeButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextActive: {
    color: '#0077C0',
    fontWeight: '600',
  },
  locationInputContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0077C0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  mapButtonIcon: {
    fontSize: 18,
  },
  mapButtonText: {
    ...typography.body,
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  coordinatesContainer: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coordinatesText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
  },
  removeButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  removeButtonText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  stateInputContainer: {
    position: 'relative',
  },
  autoFilledInput: {
    backgroundColor: colors.border + '40',
  },
  autoFilledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  autoFilledBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontStyle: 'italic',
  },
  editButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  editButtonText: {
    ...typography.caption,
    color: '#0077C0',
    fontSize: 11,
    fontWeight: '600',
  },
  areaInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  areaInput: {
    flex: 1,
  },
  areaUnit: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: spacing.md,
  },
  currencySymbol: {
    ...typography.body,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  priceInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  priceDisplay: {
    ...typography.caption,
    color: '#0077C0',
    fontSize: 12,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  configButton: {
    width: '30%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    position: 'relative',
  },
  configButtonActive: {
    borderColor: '#0077C0',
    borderWidth: 2,
    backgroundColor: '#0077C020',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 16,
    color: '#0077C0',
    fontWeight: 'bold',
  },
  configButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  configButtonTextActive: {
    color: '#0077C0',
    fontWeight: '600',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  amenityButton: {
    width: '32%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    position: 'relative',
    marginBottom: spacing.md,
  },
  amenityButtonActive: {
    borderColor: '#0077C0',
    borderWidth: 2,
    backgroundColor: '#0077C020',
  },
  amenityIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  amenityCheckmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 16,
    color: '#0077C0',
    fontWeight: 'bold',
  },
  amenityText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 11,
    textAlign: 'center',
  },
  amenityTextActive: {
    color: '#0077C0',
    fontWeight: '600',
  },
  uploadButton: {
    flexDirection: 'row',
    backgroundColor: '#0077C0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  uploadButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0077C0',
  },
  coverImageActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    alignItems: 'center',
  },
  coverImageRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'stretch',
  },
  coverImageUpload: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 120,
  },
  coverImagePreview: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  coverImagePlaceholder: {
    flex: 1,
    minHeight: 120,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  coverImageCamera: {
    flex: 1,
    minHeight: 120,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverImageCameraIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  coverImageCameraLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  projectImagesButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  projectImageButton: {
    flex: 1,
  },
  uploadButtonIconWrap: {
    marginRight: spacing.xs,
  },
  uploadButtonTextSecondary: {
    ...typography.body,
    color: '#0077C0',
    fontSize: 14,
    fontWeight: '600',
  },
  dateText: {
    ...typography.body,
    color: colors.text,
  },
  datePlaceholder: {
    ...typography.body,
    color: colors.textSecondary,
  },
  uploadButtonText: {
    ...typography.body,
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  imageCountText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: spacing.xs,
  },
  warningText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  projectImage: {
    width: '100%',
    height: '100%',
  },
  imageStatusOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvedOverlay: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  rejectedOverlay: {
    backgroundColor: 'rgba(244, 67, 54, 0.8)',
  },
  imageStatusText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  removeAndRetryButton: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.sm,
  },
  removeAndRetryText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 9,
    fontWeight: '600',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  imageUploadButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: 200,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  imagePlaceholderLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  filesList: {
    marginTop: spacing.sm,
  },
  fileItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.xs,
  },
  fileName: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    flex: 1,
  },
  removeFileText: {
    ...typography.body,
    color: colors.error,
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: spacing.sm,
  },
  previewScroll: {
    maxHeight: 400,
  },
  previewSection: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  previewSectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  previewLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
    flex: 1,
  },
  previewValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
  },
  backButtonIcon: {
    ...typography.body,
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  backButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  nextButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    backgroundColor: '#0077C0',
  },
  nextButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
  },
  nextButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  nextButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  nextButtonArrow: {
    ...typography.body,
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700',
  },
  publishButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  publishButtonIcon: {
    ...typography.body,
    color: colors.surface,
    fontSize: 18,
    fontWeight: '700',
  },
  publishButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
  submitButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AddProjectScreen;
