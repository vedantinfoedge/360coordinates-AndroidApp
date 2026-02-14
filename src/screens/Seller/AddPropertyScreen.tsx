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
  Dimensions,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { launchImageLibrary, launchCamera, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SellerStackParamList } from '../../navigation/SellerNavigator';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon, TabIconName } from '../../components/navigation/TabIcons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const AMENITY_GAP = spacing.xs;
const AMENITY_COLS = 4;
const AMENITY_ITEM_WIDTH = (SCREEN_WIDTH - 2 * spacing.xl - (AMENITY_COLS - 1) * AMENITY_GAP) / AMENITY_COLS;
import Dropdown from '../../components/common/Dropdown';
import { propertyService } from '../../services/property.service';
import { sellerService } from '../../services/seller.service';
import {
  uploadPropertyImageWithModeration,
  moderateFirebaseUrlForProperty,
} from '../../services/imageUpload.service';
import { formatters } from '../../utils/formatters';
import { USE_FIREBASE_STORAGE } from '../../config/firebaseStorage.config';
import { isFirebaseStorageAvailable } from '../../services/firebaseStorageProperty.service';
import { useAuth } from '../../context/AuthContext';
import LocationPicker from '../../components/map/LocationPicker';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import StateAutoSuggest from '../../components/search/StateAutoSuggest';
import { extractStateFromContext } from '../../utils/geocoding';
import CustomAlert from '../../utils/alertHelper';
import {
  GuidePropertyType,
  getPropertyTypeConfig,
  getAvailableAmenitiesForPropertyType,
  PROPERTY_TYPES,
  AMENITIES_LIST,
} from '../../utils/propertyTypeConfig';

type AddPropertyScreenNavigationProp = NativeStackNavigationProp<
  SellerStackParamList,
  'AddProperty'
>;

type Props = {
  navigation: AddPropertyScreenNavigationProp;
};

type PropertyStatus = 'sell' | 'rent';

const PROPERTY_TYPE_ICONS: Record<string, TabIconName> = {
  'Apartment': 'building', 'Villa / Banglow': 'home', 'Independent House': 'home',
  'Row House/ Farm House': 'home', 'Penthouse': 'building', 'Studio Apartment': 'bed',
  'Plot / Land / Industrial Property': 'square', 'Commercial Office': 'building',
  'Commercial Shop': 'building', 'Warehouse / Godown': 'building', 'PG / Hostel': 'bed',
};

const AMENITY_ICONS: Record<string, TabIconName> = {
  parking: 'square', lift: 'layers', security: 'support', power_backup: 'sparkles',
  gym: 'square', swimming_pool: 'sparkles', garden: 'sparkles', clubhouse: 'building',
  playground: 'sparkles', cctv: 'camera', intercom: 'phone', fire_safety: 'alert',
  water_supply: 'bath', gas_pipeline: 'sparkles', wifi: 'sparkles', ac: 'sparkles',
  electricity: 'sparkles',
};

const AddPropertyScreen: React.FC<Props> = ({ navigation }) => {
  const { user } = useAuth();
  const route = useRoute<RouteProp<SellerStackParamList, 'AddProperty'>>();
  const routeParams = (route.params as any) || {};
  const isEditMode = !!routeParams.propertyId;
  const isLimitedEdit = !!routeParams.isLimitedEdit;
  const propertyId = routeParams.propertyId;
  const createdAt = routeParams.createdAt;
  const [loadingProperty, setLoadingProperty] = useState(isEditMode);

  const [currentStep, setCurrentStep] = useState(1);

  // Subscription Check
  const isAgent = (user as any)?.role === 'agent';
  const isPaidSeller = (user as any)?.subscription_status === 'active' || (user as any)?.subscription_status === 'pro';
  // Allow 10 for Agents or Paid Sellers, 3 for Free Sellers
  const MAX_PHOTOS = isAgent || isPaidSeller ? 10 : 3;
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyStatus, setPropertyStatus] = useState<PropertyStatus>('sell');
  const [propertyType, setPropertyType] = useState<GuidePropertyType | ''>('');
  const [location, setLocation] = useState('');
  const [locationSelected, setLocationSelected] = useState(false);
  const [state, setState] = useState('');
  const stateAutoFilledFromLocation = useRef(false);
  const [additionalAddress, setAdditionalAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationPickerVisible, setLocationPickerVisible] = useState(false);
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [balconies, setBalconies] = useState<number | null>(null);
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [carpetArea, setCarpetArea] = useState('');
  const [floor, setFloor] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [facing, setFacing] = useState('');
  const [propertyAge, setPropertyAge] = useState('');
  const [furnishing, setFurnishing] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<Array<{ uri: string; base64?: string; moderationStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking'; moderationReason?: string; imageUrl?: string }>>([]);
  const [expectedPrice, setExpectedPrice] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [availableForBachelors, setAvailableForBachelors] = useState(false);
  const stepScrollViewRef = useRef<{ scrollTo: (opts: { y: number; animated?: boolean }) => void } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = useCallback((field: string) => {
    setFieldErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const renderFieldError = useCallback((field: string) => {
    const msg = fieldErrors[field];
    if (!msg) return null;
    return <Text style={styles.errorText}>{msg}</Text>;
  }, [fieldErrors]);

  const showError = (title: string, message: string) => {
    Alert.alert(title, message, [{ text: 'OK' }]);
  };

  // Format price for suggestion below input (e.g. 2000 → "2k", 1500000 → "15L", 15000000 → "1.5Cr")
  const formatPriceShort = (raw: string): string | null => {
    const n = parseFloat(raw.replace(/[^0-9.]/g, ''));
    if (isNaN(n) || n <= 0) return null;
    if (n >= 1e7) return (n / 1e7).toFixed(1).replace(/\.0$/, '') + 'Cr';
    if (n >= 1e5) return (n / 1e5).toFixed(1).replace(/\.0$/, '') + 'L';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return null;
  };

  const totalSteps = 5;
  const steps: Array<{ id: number; name: string; iconName: TabIconName }> = [
    { id: 1, name: 'Basic Info', iconName: 'file-text' },
    { id: 2, name: 'Property Details', iconName: 'home' },
    { id: 3, name: 'Amenities', iconName: 'sparkles' },
    { id: 4, name: 'Photos', iconName: 'camera' },
    { id: 5, name: 'Pricing', iconName: 'dollar' },
  ];

  // Get field visibility configuration based on property type (using guide utility)
  const fieldVisibility = useMemo(() => {
    if (!propertyType) {
      return {
        showBedrooms: false,
        bedroomsRequired: false,
        showBathrooms: false,
        bathroomsRequired: false,
        showBalconies: false,
        showFloor: false,
        showTotalFloors: false,
        showFacing: false,
        showAge: false,
        showFurnishing: false,
        showCarpetArea: false,
        areaLabel: 'Built-up Area' as const,
      };
    }
    return getPropertyTypeConfig(propertyType);
  }, [propertyType]);

  // Get available amenities based on property type
  const availableAmenities = useMemo(() => {
    if (!propertyType) return AMENITIES_LIST;
    const allowedAmenityIds = getAvailableAmenitiesForPropertyType(propertyType);
    return AMENITIES_LIST.filter(amenity => allowedAmenityIds.includes(amenity.id));
  }, [propertyType]);

  const toggleAmenity = (amenityId: string) => {
    setSelectedAmenities(prev =>
      prev.includes(amenityId)
        ? prev.filter(id => id !== amenityId)
        : [...prev, amenityId],
    );
  };

  // Check if property is older than 24 hours
  // Uses MySQL DATETIME format parser: "YYYY-MM-DD HH:MM:SS"
  const isPropertyOlderThan24Hours = (createdAtDate?: string | Date): boolean => {
    if (!createdAtDate) return false;
    const now = new Date();
    let created: Date;

    if (typeof createdAtDate === 'string') {
      // Parse MySQL DATETIME format: "YYYY-MM-DD HH:MM:SS"
      const parsed = formatters.parseMySQLDateTime(createdAtDate);
      if (!parsed) return false;
      created = parsed;
    } else {
      created = createdAtDate;
    }

    const hoursSinceCreation = (now.getTime() - created.getTime()) / (1000 * 60 * 60);
    return hoursSinceCreation >= 24;
  };

  // Check if a field can be edited based on 24-hour restriction
  const canEditField = (fieldName: string): boolean => {
    if (!isEditMode || !isLimitedEdit) return true;

    // After 24 hours, only these fields can be edited
    const editableFields = ['title', 'price', 'priceNegotiable', 'maintenanceCharges', 'depositAmount'];
    return editableFields.includes(fieldName);
  };

  // Load property data when in edit mode
  useEffect(() => {
    const loadPropertyData = async () => {
      if (!isEditMode || !propertyId) {
        setLoadingProperty(false);
        return;
      }

      try {
        setLoadingProperty(true);
        const response: any = await propertyService.getPropertyDetails(propertyId);

        if (response && response.success && response.data) {
          const propData = response.data.property || response.data;

          // Populate form fields
          setPropertyTitle(propData.title || propData.property_title || '');
          setPropertyStatus(propData.status === 'rent' ? 'rent' : 'sell');
          setPropertyType(propData.property_type || '');
          setLocation(propData.location || '');
          setState(propData.state || '');
          setAdditionalAddress(propData.additional_address || '');
          setLatitude(propData.latitude || null);
          setLongitude(propData.longitude || null);
          setBedrooms(propData.bedrooms ? parseInt(propData.bedrooms) : null);
          setBathrooms(propData.bathrooms ? parseInt(propData.bathrooms) : null);
          setBalconies(propData.balconies ? parseInt(propData.balconies) : null);
          setBuiltUpArea(propData.area ? String(propData.area) : '');
          setCarpetArea(propData.carpet_area ? String(propData.carpet_area) : '');
          setFloor(propData.floor || '');
          setTotalFloors(propData.total_floors ? String(propData.total_floors) : '');
          setFacing(propData.facing || '');
          setPropertyAge(propData.age || '');
          setFurnishing(propData.furnishing || '');
          setDescription(propData.description || '');
          setExpectedPrice(propData.price ? String(propData.price) : '');
          setPriceNegotiable(propData.price_negotiable || false);
          setDepositAmount(propData.deposit_amount ? String(propData.deposit_amount) : '');
          setMaintenance(propData.maintenance_charges ? String(propData.maintenance_charges) : '');
          setAvailableForBachelors(propData.available_for_bachelors || false);
          setSelectedAmenities(propData.amenities ? (Array.isArray(propData.amenities) ? propData.amenities : []) : []);

          // Load existing images
          if (propData.images && Array.isArray(propData.images) && propData.images.length > 0) {
            const existingImages = propData.images.map((imgUrl: string) => ({
              uri: imgUrl,
              imageUrl: imgUrl,
              moderationStatus: 'APPROVED' as const,
            }));
            setPhotos(existingImages);
          }
        } else {
          Alert.alert('Error', 'Failed to load property details', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        }
      } catch (error: any) {
        console.error('Error loading property:', error);
        Alert.alert('Error', error.message || 'Failed to load property details', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } finally {
        setLoadingProperty(false);
      }
    };

    loadPropertyData();
  }, [isEditMode, propertyId, navigation]);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version as number;
        const permission = (apiLevel >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : (PermissionsAndroid.PERMISSIONS as any).READ_EXTERNAL_STORAGE) || PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES;
        const granted = await PermissionsAndroid.request(permission, {
          title: 'Image Picker Permission',
          message: 'App needs access to your photos to upload property images',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const requestCameraCapturePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
          title: 'Camera Permission',
          message: 'App needs camera access to take property photos',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        });
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Request camera and gallery permissions when user enters Photos step so they're prompted once before tapping Take photo / Gallery
  useEffect(() => {
    if (currentStep !== 4) return;
    requestCameraPermission().catch(() => { });
    requestCameraCapturePermission().catch(() => { });
  }, [currentStep]);

  const handleImagePicker = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant photo access in Settings to upload property images.', [{ text: 'OK' }]);
      return;
    }

    if (photos.length >= MAX_PHOTOS) {
      if (!isAgent && !isPaidSeller) {
        Alert.alert(
          'Limit Reached',
          'Free plan allows only 3 images. Upgrade to add more.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Subscription' as never) }
          ]
        );
      } else {
        showError('Limit Reached', `You can upload maximum ${MAX_PHOTOS} photos`);
      }
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.5 as const,
      selectionLimit: MAX_PHOTOS - photos.length,
      includeBase64: true,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        const msg = response.errorMessage || response.errorCode === 'permission' ? 'Photo access denied. Please allow access in Settings.' : 'Failed to pick image';
        Alert.alert('Error', msg, [{ text: 'OK' }]);
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const remainingSlots = MAX_PHOTOS - photos.length;
        const assetsToAdd = response.assets.slice(0, remainingSlots);

        if (photos.length + assetsToAdd.length > MAX_PHOTOS) {
          if (!isAgent && !isPaidSeller) {
            Alert.alert(
              'Limit Reached',
              'Free plan allows only 3 images. Upgrade to add more.',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upgrade', onPress: () => navigation.navigate('Subscription' as never) }
              ]
            );
          } else {
            showError('Limit Reached', `You can upload maximum ${MAX_PHOTOS} photos`);
          }
          return;
        }

        try {
          const newPhotos = assetsToAdd.map(asset => {
            let imageType = asset.type || 'jpeg';
            if (!asset.type && asset.uri) {
              const uriLower = asset.uri.toLowerCase();
              if (uriLower.includes('.png')) imageType = 'png';
              else if (uriLower.includes('.jpg') || uriLower.includes('.jpeg')) imageType = 'jpeg';
              else if (uriLower.includes('.webp')) imageType = 'webp';
            }

            let base64Data = asset.base64;
            if (base64Data && base64Data.includes('data:image/')) {
              const parts = base64Data.split(',');
              base64Data = parts.length > 1 ? parts[1] : base64Data;
            }

            const base64String = base64Data
              ? `data:image/${imageType};base64,${base64Data}`
              : undefined;

            return {
              uri: asset.uri || '',
              base64: base64String,
              moderationStatus: 'checking' as const,
              moderationReason: undefined,
              imageUrl: undefined,
            };
          });

          const updatedPhotos = [...photos, ...newPhotos];
          setPhotos(updatedPhotos);

          // Storage workflow: Device → Firebase Storage → backend receives URL for moderation only; images stored in Firebase
          const firebaseEnabled = USE_FIREBASE_STORAGE && user?.id;
          const firebaseAvailable = firebaseEnabled && isFirebaseStorageAvailable();

          if (!firebaseEnabled || !firebaseAvailable) {
            const message = !user?.id
              ? 'You must be signed in to upload images.'
              : !firebaseAvailable
                ? 'Firebase Storage is not available. Please rebuild the app to enable image uploads.'
                : 'Firebase Storage is required for property images. Please enable it and rebuild the app.';
            Alert.alert('Image Upload Unavailable', message, [{ text: 'OK' }]);
            setPhotos(prev => {
              const updated = [...prev];
              newPhotos.forEach((_, index) => {
                const imgIndex = prev.length - newPhotos.length + index;
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
            newPhotos.forEach((img, index) => {
              if (img.uri) {
                const uploadPropertyId = isEditMode && propertyId ? (typeof propertyId === 'string' ? propertyId : String(propertyId)) : null;
                uploadPropertyImageWithModeration(img.uri, uploadPropertyId, user!.id)
                  .then(result => {
                    setPhotos(prev => {
                      const updated = [...prev];
                      const imgIndex = prev.length - newPhotos.length + index;
                      if (updated[imgIndex]) {
                        const status = String(result.moderationStatus || '').toUpperCase();
                        let moderationStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking' = 'REJECTED';
                        if (status === 'SAFE' || status === 'APPROVED') moderationStatus = 'APPROVED';
                        else if (status === 'REJECTED' || status === 'UNSAFE') moderationStatus = 'REJECTED';
                        else moderationStatus = 'APPROVED';
                        // Prefer backend-returned URL (watermarked + cache-busted), fallback to original Firebase URL
                        const finalUrl = result.imageUrl || result.firebaseUrl || '';
                        updated[imgIndex] = {
                          ...updated[imgIndex],
                          moderationStatus,
                          moderationReason: result.moderationReason || undefined,
                          imageUrl: finalUrl,
                        };
                      }
                      return updated;
                    });
                    if (result.moderationStatus === 'REJECTED' || result.moderationStatus === 'UNSAFE') {
                      Alert.alert('Image Rejected', result.moderationReason || 'Image does not meet our guidelines. Please upload property images only.', [{ text: 'OK' }]);
                    }
                  })
                  .catch(error => {
                    console.error('[AddProperty] Firebase upload error:', error);
                    setPhotos(prev => {
                      const updated = [...prev];
                      const imgIndex = prev.length - newPhotos.length + index;
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
                    Alert.alert('Upload Failed', errorMessage, [{ text: 'OK' }]);
                  });
              }
            });
          }

          console.log('[AddProperty] Added', newPhotos.length, 'images (Device → Firebase Storage → backend URL for moderation)');
        } catch (err) {
          console.error('[AddProperty] Image processing error:', err);
          Alert.alert('Error', 'Failed to process images. Please try again.', [{ text: 'OK' }]);
        }
      }
    });
  };

  const handleCameraCapture = async () => {
    if (photos.length >= MAX_PHOTOS) {
      if (!isAgent && !isPaidSeller) {
        Alert.alert(
          'Limit Reached',
          'Free plan allows only 3 images. Upgrade to add more.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('Subscription' as never) }
          ]
        );
      } else {
        showError('Limit Reached', `You can upload maximum ${MAX_PHOTOS} photos`);
      }
      return;
    }
    const hasPermission = await requestCameraCapturePermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant camera access in Settings to take photos.', [{ text: 'OK' }]);
      return;
    }
    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.5 as const,
      includeBase64: true,
      saveToPhotos: false,
    };
    launchCamera(options, (response: ImagePickerResponse) => {
      if (response.didCancel) return;
      if (response.errorCode) {
        const msg = response.errorMessage || response.errorCode === 'camera_unavailable' ? 'Camera not available' : 'Failed to take photo';
        Alert.alert('Error', msg, [{ text: 'OK' }]);
        return;
      }
      if (response.assets && response.assets.length > 0) {
        const asset = response.assets[0];
        let imageType = asset.type || 'jpeg';
        if (!asset.type && asset.uri) {
          const uriLower = asset.uri.toLowerCase();
          if (uriLower.includes('.png')) imageType = 'png';
          else if (uriLower.includes('.jpg') || uriLower.includes('.jpeg')) imageType = 'jpeg';
          else if (uriLower.includes('.webp')) imageType = 'webp';
        }
        let base64Data = asset.base64;
        if (base64Data && base64Data.includes('data:image/')) {
          const parts = base64Data.split(',');
          base64Data = parts.length > 1 ? parts[1] : base64Data;
        }
        const base64String = base64Data ? `data:image/${imageType};base64,${base64Data}` : undefined;
        const newPhoto = {
          uri: asset.uri || '',
          base64: base64String,
          moderationStatus: 'checking' as const,
          moderationReason: undefined,
          imageUrl: undefined,
        };
        const newPhotos = [newPhoto];
        const updatedPhotos = [...photos, ...newPhotos];
        setPhotos(updatedPhotos);
        const firebaseEnabled = USE_FIREBASE_STORAGE && user?.id;
        const firebaseAvailable = firebaseEnabled && isFirebaseStorageAvailable();
        if (!firebaseEnabled || !firebaseAvailable) {
          const message = !user?.id ? 'You must be signed in to upload images.' : !firebaseAvailable ? 'Firebase Storage is not available.' : 'Firebase Storage is required.';
          Alert.alert('Image Upload Unavailable', message, [{ text: 'OK' }]);
          setPhotos(prev => prev.map((p, i) => (i === prev.length - 1 ? { ...p, moderationStatus: 'REJECTED' as const, moderationReason: message } : p)));
          return;
        }
        const imgIndex = updatedPhotos.length - 1;
        const uploadPropertyId = isEditMode && propertyId ? String(propertyId) : null;
        uploadPropertyImageWithModeration(asset.uri || '', uploadPropertyId, user!.id)
          .then(result => {
            setPhotos(prev => {
              const updated = [...prev];
              if (updated[imgIndex]) {
                const status = String(result.moderationStatus || '').toUpperCase();
                let moderationStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking' = 'REJECTED';
                if (status === 'SAFE' || status === 'APPROVED') moderationStatus = 'APPROVED';
                else if (status === 'REJECTED' || status === 'UNSAFE') moderationStatus = 'REJECTED';
                else moderationStatus = 'APPROVED';
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
              Alert.alert('Image Rejected', result.moderationReason || 'Image does not meet our guidelines.', [{ text: 'OK' }]);
            }
          })
          .catch(error => {
            setPhotos(prev => {
              const updated = [...prev];
              if (updated[imgIndex]) updated[imgIndex] = { ...updated[imgIndex], moderationStatus: 'REJECTED' as const, moderationReason: error.message };
              return updated;
            });
            Alert.alert('Upload Failed', error.message || 'Failed to upload image.', [{ text: 'OK' }]);
          });
      }
    });
  };

  const handleNext = () => {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!propertyTitle.trim()) nextErrors.propertyTitle = 'Please enter property title';
      if (!propertyType) nextErrors.propertyType = 'Please select property type';
      if (propertyTitle.length > 200) nextErrors.propertyTitle = 'Title must be between 1 and 200 characters';
      if (propertyTitle.length < 1) nextErrors.propertyTitle = 'Title is required (1-200 characters)';
    }

    if (currentStep === 2) {
      if (!location.trim()) nextErrors.location = 'Please enter location';
      if (!state.trim()) nextErrors.state = 'Please enter state';
      if (fieldVisibility.showFacing && !facing) nextErrors.facing = 'Please select facing direction';
      if (fieldVisibility.showBalconies && balconies === null) nextErrors.balconies = 'Please select number of balconies';
      if (fieldVisibility.showFloor && !floor.trim()) nextErrors.floor = 'Please enter floor number';
      if (fieldVisibility.showTotalFloors && !totalFloors.trim()) nextErrors.totalFloors = 'Please enter total floors';
      if (fieldVisibility.bedroomsRequired && bedrooms === null && propertyType !== 'Studio Apartment') {
        nextErrors.bedrooms = 'Please select number of bedrooms';
      }
      if (fieldVisibility.bathroomsRequired && bathrooms === null) nextErrors.bathrooms = 'Please select number of bathrooms';
      if (fieldVisibility.showAge && !propertyAge.trim()) nextErrors.propertyAge = 'Please select property age';
      if (fieldVisibility.showFurnishing && !furnishing.trim()) nextErrors.furnishing = 'Please select furnishing status';

      if (!builtUpArea.trim()) {
        nextErrors.builtUpArea = `Please enter ${fieldVisibility.areaLabel}`;
      }

      const areaValue = parseFloat(builtUpArea.replace(/[^0-9.]/g, ''));
      if (builtUpArea.trim() && (isNaN(areaValue) || areaValue <= 0)) {
        nextErrors.builtUpArea = `${fieldVisibility.areaLabel} must be a positive number`;
      }

      // Validate carpet_area <= area
      if (carpetArea.trim()) {
        const carpetValue = parseFloat(carpetArea.replace(/[^0-9.]/g, ''));
        if (isNaN(carpetValue) || carpetValue <= 0) {
          nextErrors.carpetArea = 'Carpet area must be a positive number';
        } else if (!isNaN(areaValue) && areaValue > 0 && carpetValue > areaValue) {
          nextErrors.carpetArea = 'Carpet area cannot be greater than built-up area';
        }
      }

      // Validate floor <= total_floors (if both provided)
      if (floor.trim() && totalFloors.trim()) {
        const floorNum = parseInt(floor, 10);
        const totalFloorsNum = parseInt(totalFloors, 10);
        if (!isNaN(floorNum) && !isNaN(totalFloorsNum) && floorNum > totalFloorsNum) {
          nextErrors.floor = 'Floor number cannot be greater than total floors';
        }
      }
    }

    if (currentStep === 3) {
      if (selectedAmenities.length < 1) nextErrors.selectedAmenities = 'Please select at least one amenity';
      if (!description.trim()) nextErrors.description = 'Please enter property description';
      if (description.length > 0 && description.length < 100) nextErrors.description = 'Description must be at least 100 characters';
      if (description.trim().length > 1000) nextErrors.description = 'Description cannot exceed 1000 characters';

      const mobileRegex = /(\+91[\s-]?)?[6-9]\d{9}/g;
      if (description && mobileRegex.test(description)) {
        nextErrors.description = 'Description cannot contain mobile numbers';
      }
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      if (description && emailRegex.test(description)) {
        nextErrors.description = 'Description cannot contain email addresses';
      }
    }

    if (currentStep === 4) {
      if (photos.length < 4) nextErrors.photos = 'Please upload at least 4 images';
      const checkingImages = photos.filter(p => p.moderationStatus === 'checking');
      if (checkingImages.length > 0) {
        nextErrors.photos = 'Please wait for all images to be validated before proceeding';
      }
      const rejectedImages = photos.filter(p => p.moderationStatus === 'REJECTED');
      const approvedImagesStep4 = photos.filter(p => p.moderationStatus === 'APPROVED');
      if (rejectedImages.length > 0) {
        nextErrors.photos =
          approvedImagesStep4.length > 0
            ? `Some images are rejected. Remove ${rejectedImages.length} rejected image(s) to move forward. You have ${approvedImagesStep4.length} approved image(s).`
            : 'Please remove all rejected images and upload valid images to continue.';
      }
      if (approvedImagesStep4.length > 0 && approvedImagesStep4.length < 4) {
        nextErrors.photos = 'Please ensure at least 4 images are approved';
      }
    }

    if (currentStep === 5) {
      if (!expectedPrice.trim()) {
        nextErrors.expectedPrice =
          propertyStatus === 'sell' ? 'Please enter expected price' : 'Please enter monthly rent';
      } else {
        const priceValue = parseFloat(expectedPrice.replace(/[^0-9.]/g, ''));
        if (isNaN(priceValue) || priceValue <= 0) {
          nextErrors.expectedPrice = 'Price must be a positive number';
        }
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      stepScrollViewRef.current?.scrollTo({ y: 0, animated: true });
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      stepScrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (isEditMode && propertyId) {
        // EDIT MODE: Update existing property
        console.log('[AddProperty] Editing property ID:', propertyId);

        // For edit mode, collect images differently:
        // - Existing images: preserve URLs (filter out blob URLs)
        // - New images: include base64 or imageUrl from moderation
        const existingImageUrls = photos
          .filter(p => p.imageUrl && !p.uri.startsWith('blob:') && !p.uri.startsWith('file:'))
          .map(p => p.imageUrl!)
          .filter((url): url is string => !!url && !url.startsWith('blob:'));

        // New images that were uploaded (have base64 or were uploaded via moderation)
        const newImages = photos.filter(p =>
          p.base64 || (p.imageUrl && (p.uri.startsWith('file:') || p.uri.startsWith('blob:')))
        );

        const newImageBase64 = newImages
          .map(p => {
            if (p.base64) {
              let base64 = p.base64.trim();
              if (base64.startsWith('data:image/')) {
                if (!base64.includes(';base64,')) return null;
                return base64;
              }
              return `data:image/jpeg;base64,${base64}`;
            }
            return null;
          })
          .filter((base64): base64 is string => base64 !== null && base64 !== '');

        // Combine existing URLs and new base64 images
        const allImages = [...existingImageUrls, ...newImageBase64];

        // Check if we have any images
        if (allImages.length === 0 && photos.length > 0) {
          Alert.alert(
            'No Valid Images',
            'Please wait for images to be processed or upload new images.',
            [{ text: 'OK' }]
          );
          setIsSubmitting(false);
          return;
        }

        const checkingImages = photos.filter(p => p.moderationStatus === 'checking');
        if (checkingImages.length > 0) {
          Alert.alert(
            'Images Still Validating',
            'Please wait for all images to be validated before submitting.',
            [{ text: 'OK' }]
          );
          setIsSubmitting(false);
          return;
        }

        // Build update data based on 24-hour restriction
        const updateData: any = {};

        // Always allowed fields (after 24 hours): title, price, price_negotiable, maintenance_charges, deposit_amount
        updateData.title = propertyTitle.trim();
        updateData.price = parseFloat(expectedPrice.replace(/[^0-9.]/g, '')) || 0;
        updateData.price_negotiable = priceNegotiable;
        updateData.maintenance_charges = maintenance ? parseFloat(maintenance.replace(/[^0-9.]/g, '')) : null;
        if (propertyStatus === 'rent' && depositAmount) {
          updateData.deposit_amount = parseFloat(depositAmount.replace(/[^0-9.]/g, ''));
        }
        if (propertyStatus === 'rent' && (propertyType === 'Apartment' || propertyType === 'PG / Hostel')) {
          updateData.available_for_bachelors = availableForBachelors;
        }

        // Only include other fields if not in limited edit mode
        // Location fields are explicitly blocked after 24 hours: location, latitude, longitude, state, additional_address
        if (!isLimitedEdit) {
          updateData.status = propertyStatus === 'sell' ? 'sale' : 'rent';
          updateData.property_type = propertyType;
          // Location fields (explicitly blocked after 24 hours)
          updateData.location = location.trim();
          updateData.state = state.trim() || null;
          updateData.additional_address = additionalAddress.trim() || null;
          updateData.latitude = latitude || null;
          updateData.longitude = longitude || null;
          updateData.bedrooms = bedrooms?.toString() || (propertyType === 'Studio Apartment' ? '0' : null);
          updateData.bathrooms = bathrooms?.toString() || (propertyType === 'Studio Apartment' ? '0' : null);
          updateData.balconies = balconies?.toString() || (propertyType === 'Studio Apartment' ? '0' : null);
          updateData.area = parseFloat(builtUpArea) || 0;
          updateData.carpet_area = carpetArea ? parseFloat(carpetArea) : null;
          updateData.floor = floor.trim() || null;
          updateData.total_floors = totalFloors ? parseInt(totalFloors) : null;
          updateData.facing = facing || null;
          updateData.age = propertyAge || null;
          updateData.furnishing = furnishing || null;
          updateData.description = description.trim();
          updateData.amenities = selectedAmenities;
        }

        // Include images if any
        if (allImages.length > 0) {
          updateData.images = allImages;
        }

        console.log('[AddProperty] Updating property with data:', {
          ...updateData,
          images: `[${allImages.length} images]`,
        });

        const response: any = await sellerService.updateProperty(propertyId, updateData);

        if (response && response.success) {
          Alert.alert(
            'Success',
            'Property updated successfully!',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          const errorMessage = response?.message || response?.error?.message || 'Failed to update property';
          console.error('[AddProperty] Property update failed:', errorMessage);
          showError('Error', errorMessage);
        }
      } else {
        // CREATE MODE: Create new property
        // Prefer Firebase URLs so backend stores references only; fallback to base64 when Firebase not used
        const validImages = photos.filter(
          p => p.moderationStatus === 'APPROVED' || p.moderationStatus === 'PENDING',
        );

        if (validImages.length < 4) {
          Alert.alert(
            'No Valid Images',
            'Please upload at least 4 images that have been approved or are pending review.',
            [{ text: 'OK' }]
          );
          setIsSubmitting(false);
          return;
        }

        const checkingImages = photos.filter(p => p.moderationStatus === 'checking');
        if (checkingImages.length > 0) {
          Alert.alert(
            'Images Still Validating',
            'Please wait for all images to be validated before submitting.',
            [{ text: 'OK' }]
          );
          setIsSubmitting(false);
          return;
        }

        const firebaseImageUrls = validImages
          .map(p => p.imageUrl)
          .filter(
            (url): url is string =>
              !!url && (url.startsWith('http://') || url.startsWith('https://')),
          );

        // Non-Firebase fallback: send base64 images directly in create request (no watermark flow).
        let imagesPayload: string[] | undefined;
        if (!USE_FIREBASE_STORAGE) {
          const imageBase64Strings = validImages
            .map(p => {
              if (!p.base64) return null;
              let base64 = p.base64.trim();
              if (base64.startsWith('data:image/')) {
                if (!base64.includes(';base64,')) return null;
                return base64;
              }
              return `data:image/jpeg;base64,${base64}`;
            })
            .filter((base64): base64 is string => base64 !== null && base64 !== '');

          if (imageBase64Strings.length === 0) {
            Alert.alert(
              'Image Data Missing',
              'Approved images are missing image data. Please try removing and re-uploading the images.',
              [{ text: 'OK' }],
            );
            setIsSubmitting(false);
            return;
          }
          imagesPayload = imageBase64Strings;
        }

        // For watermarking, we need a real DB property_id. So we create the property FIRST (without images),
        // then call /images/moderate-and-upload.php for each already-uploaded Firebase URL.
        if (USE_FIREBASE_STORAGE && firebaseImageUrls.length < 4) {
          Alert.alert(
            'Images Not Ready',
            'Please wait for all images to finish uploading before submitting.',
            [{ text: 'OK' }],
          );
          setIsSubmitting(false);
          return;
        }

        const imageCount = USE_FIREBASE_STORAGE
          ? firebaseImageUrls.length
          : imagesPayload?.length || 0;
        console.log(
          '[AddProperty] Total photos:',
          photos.length,
          'Valid (approved/pending):',
          validImages.length,
          USE_FIREBASE_STORAGE ? 'Firebase URLs to watermark:' : 'Images to send:',
          imageCount,
        );

        // Property type is already in the correct format from guide
        const propertyData: any = {
          title: propertyTitle.trim(),
          status: propertyStatus === 'sell' ? 'sale' : 'rent', // Map 'sell' to 'sale'
          property_type: propertyType, // Already in guide format (e.g., 'Apartment', 'Villa / Banglow')
          location: location.trim(),
          state: state.trim() || null,
          additional_address: additionalAddress.trim() || null,
          latitude: latitude || null,
          longitude: longitude || null,
          bedrooms: bedrooms?.toString() || (propertyType === 'Studio Apartment' ? '0' : null),
          bathrooms: bathrooms?.toString() || (propertyType === 'Studio Apartment' ? '0' : null),
          balconies: balconies?.toString() || (propertyType === 'Studio Apartment' ? '0' : null),
          area: parseFloat(builtUpArea) || 0,
          carpet_area: carpetArea ? parseFloat(carpetArea) : null,
          floor: floor.trim() || null,
          total_floors: totalFloors ? parseInt(totalFloors) : null,
          facing: facing || null,
          age: propertyAge || null,
          furnishing: furnishing || null,
          description: description.trim(),
          price: parseFloat(expectedPrice.replace(/[^0-9.]/g, '')) || 0,
          price_negotiable: priceNegotiable,
          maintenance_charges: maintenance ? parseFloat(maintenance.replace(/[^0-9.]/g, '')) : null,
          amenities: selectedAmenities,
          deposit_amount: propertyStatus === 'rent' && depositAmount ? parseFloat(depositAmount.replace(/[^0-9.]/g, '')) : undefined,
          available_for_bachelors: propertyStatus === 'rent' && (propertyType === 'Apartment' || propertyType === 'PG / Hostel') ? availableForBachelors : undefined,
          ...(USE_FIREBASE_STORAGE
            ? {
              // Important: images are uploaded via Firebase and finalized (watermark + DB save) after property creation.
              // Do NOT send raw Firebase URLs here, otherwise backend may store unwatermarked URLs and create duplicates later.
            }
            : {
              images: imagesPayload && imagesPayload.length > 0 ? imagesPayload : undefined,
            }),
        };

        console.log('[AddProperty] Creating property with endpoint: /seller/properties/add.php');
        console.log(
          '[AddProperty] Images:',
          imageCount,
          USE_FIREBASE_STORAGE
            ? '(Firebase URLs; will watermark after create)'
            : '(base64 fallback)',
        );

        const response: any = await propertyService.createProperty(propertyData, 'seller');

        if (response && response.success) {
          const createdPropertyId =
            response?.data?.property?.id ||
            response?.data?.property?.property_id ||
            response?.data?.property?.propertyId ||
            response?.data?.id;

          let failedCount = 0;

          if (USE_FIREBASE_STORAGE && createdPropertyId && firebaseImageUrls.length > 0) {
            console.log('[AddProperty] Property created. Watermarking images with property_id:', createdPropertyId);

            // Process sequentially to keep ordering predictable and reduce server load.
            for (const url of firebaseImageUrls) {
              try {
                await moderateFirebaseUrlForProperty(url, createdPropertyId);
              } catch (e: any) {
                failedCount += 1;
                console.error('[AddProperty] Watermark/mode-rate failed for image:', {
                  message: e?.message,
                  url: url?.substring?.(0, 80),
                });
              }
            }
          } else {
            console.warn('[AddProperty] Could not watermark images (missing property_id or images).', {
              hasCreatedPropertyId: !!createdPropertyId,
              firebaseImageUrls: firebaseImageUrls.length,
            });
          }

          Alert.alert(
            'Success',
            `Property listed successfully!${imageCount > 0 ? ` ${imageCount} image(s) uploaded.` : ''}${failedCount > 0 ? ` (${failedCount} image(s) failed to watermark; you can re-upload in Edit.)` : ''
            }`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        } else {
          let errorMessage = 'Failed to create property';
          // Check multiple possible error message locations
          if (response?.message) {
            errorMessage = response.message;
          } else if (response?.error) {
            if (typeof response.error === 'string') {
              errorMessage = response.error;
            } else if (response.error?.message) {
              errorMessage = response.error.message;
            }
          } else if (response?.data?.message) {
            errorMessage = response.data.message;
          } else if (response?.data?.error) {
            errorMessage = typeof response.data.error === 'string' ? response.data.error : response.data.error?.message || errorMessage;
          } else if (typeof response === 'string') {
            errorMessage = response;
          }
          console.error('[AddProperty] Property creation failed:', errorMessage);
          console.error('[AddProperty] Full error response:', JSON.stringify(response, null, 2));
          Alert.alert('Error', errorMessage, [{ text: 'OK' }]);
        }
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      let errorMessage = isEditMode ? 'Failed to update property. Please try again.' : 'Failed to create property. Please try again.';
      // Check multiple possible error message locations
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.response?.data?.error) {
        errorMessage = typeof error.response.data.error === 'string' ? error.response.data.error : error.response.data.error?.message || errorMessage;
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
      'Cancel Listing',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        { text: 'Continue Editing', style: 'cancel' },
        { text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack() },
      ],
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Basic Information</Text>
            <Text style={styles.stepSubtitle}>
              Let's start with the basic details of your property
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Property Title <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Spacious 3BHK Apartment with Sea View"
                placeholderTextColor={colors.textSecondary}
                value={propertyTitle}
                onChangeText={(text: string) => {
                  setPropertyTitle(text);
                  clearFieldError('propertyTitle');
                }}
              />
              {renderFieldError('propertyTitle')}
            </View>

            {/* Lock non-pricing fields in limited edit mode */}
            <View
              style={styles.inputContainer}
              pointerEvents={isLimitedEdit ? 'none' : 'auto'}>
              <Text style={styles.label}>I want to <Text style={styles.required}>*</Text></Text>
              <View style={styles.typeButtonsContainer}>
                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => setPropertyStatus('sell')}>
                  {propertyStatus === 'sell' ? (
                    // @ts-expect-error - LinearGradient works but TypeScript types are incorrect
                    <LinearGradient
                      colors={['#0077C0', '#005A94']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.typeButtonGradient}>
                      <TabIcon name="tag" color={colors.surface} size={20} />
                      <Text style={styles.typeButtonTextSelected}>Sell</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.typeButtonUnselected}>
                      <TabIcon name="tag" color={colors.surface} size={20} />
                      <Text style={styles.typeButtonText}>Sell</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => setPropertyStatus('rent')}>
                  {propertyStatus === 'rent' ? (
                    // @ts-expect-error - LinearGradient works but TypeScript types are incorrect
                    <LinearGradient
                      colors={['#0077C0', '#005A94']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.typeButtonGradient}>
                      <TabIcon name="key" color={colors.surface} size={20} />
                      <Text style={styles.typeButtonTextSelected}>Rent</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.typeButtonUnselected}>
                      <TabIcon name="key" color={colors.surface} size={20} />
                      <Text style={styles.typeButtonText}>Rent</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View
              style={styles.inputContainer}
              pointerEvents={isLimitedEdit ? 'none' : 'auto'}>
              <Text style={styles.label}>
                Property Type <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.propertyTypeGrid}>
                {PROPERTY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.propertyTypeButton,
                      propertyType === type.value && styles.propertyTypeButtonActive,
                    ]}
                    onPress={() => {
                      setPropertyType(type.value);
                      clearFieldError('propertyType');
                      // Auto-set bedrooms to 0 for Studio Apartment
                      if (type.value === 'Studio Apartment') {
                        setBedrooms(0);
                      } else {
                        // Reset bedrooms for other types
                        setBedrooms(null);
                      }
                      // Clear amenities when property type changes (they'll be filtered)
                      setSelectedAmenities([]);
                    }}>
                    <View style={styles.propertyTypeIconWrap}>
                      <TabIcon name={PROPERTY_TYPE_ICONS[type.value] || 'home'} color={propertyType === type.value ? colors.surface : colors.textSecondary} size={22} />
                    </View>
                    <Text
                      style={[
                        styles.propertyTypeText,
                        propertyType === type.value && styles.propertyTypeTextActive,
                      ]}
                      numberOfLines={2}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {renderFieldError('propertyType')}
            </View>

            {propertyStatus === 'rent' && (propertyType === 'Apartment' || propertyType === 'PG / Hostel' || propertyType === 'Studio Apartment') && (
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAvailableForBachelors(!availableForBachelors)}
                activeOpacity={0.7}>
                <View style={[styles.checkbox, availableForBachelors && styles.checkboxChecked]}>
                  {availableForBachelors && <TabIcon name="check" color={colors.surface} size={14} />}
                </View>
                <Text style={styles.checkboxLabel}>Available for bachelors</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent} pointerEvents={isLimitedEdit ? 'none' : 'auto'}>
            <Text style={styles.stepTitle}>Property Details</Text>
            <Text style={styles.stepSubtitle}>
              Tell us more about your property specifications
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Location <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter locality, area or landmark"
                  placeholderTextColor={colors.textSecondary}
                  value={location}
                  onChangeText={(text: string) => {
                    setLocation(text);
                    clearFieldError('location');
                    // Reset locationSelected when user starts typing/editing
                    if (locationSelected) {
                      setLocationSelected(false);
                    }
                  }}
                  onFocus={() => {
                    // Allow autosuggest when user focuses on the input
                    // Only if they haven't selected a location or are editing
                    if (locationSelected && location.length >= 2) {
                      setLocationSelected(false);
                    }
                  }}
                />
                <LocationAutoSuggest
                  query={location}
                  onSelect={(locationData) => {
                    setLocation(locationData.placeName || locationData.name);
                    setLocationSelected(true); // Mark location as selected
                    clearFieldError('location');
                    if (locationData.coordinates) {
                      setLatitude(locationData.coordinates[1]);
                      setLongitude(locationData.coordinates[0]);
                    }
                    // Extract state from context if available
                    const extractedState = extractStateFromContext(locationData.context);
                    if (extractedState) {
                      stateAutoFilledFromLocation.current = true;
                      setState(extractedState);
                    }
                  }}
                  visible={location.length >= 2 && !locationSelected}
                />
              </View>
              {renderFieldError('location')}

              {/* Property Location on Map - Below Location Input */}
              <View style={styles.mapContainer}>
                <Text style={styles.mapLabel}>Property Location on Map (Optional)</Text>
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => setLocationPickerVisible(true)}>
                  {/* @ts-expect-error - LinearGradient works but TypeScript types are incorrect */}
                  <LinearGradient
                    colors={['#0077C0', '#005A94']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.mapButtonGradient}>
                    <TabIcon name="location" color={colors.surface} size={18} />
                    <Text style={styles.mapButtonText}>Add Location on Map</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={styles.mapButtonSubtext}>
                  Select exact location on map for better visibility
                </Text>
                {latitude && longitude && (
                  <Text style={styles.coordinateText}>
                    Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                  </Text>
                )}
              </View>
            </View>

            <LocationPicker
              visible={locationPickerVisible}
              initialLocation={latitude && longitude ? { latitude, longitude } : undefined}
              onLocationSelect={(locationData) => {
                setLatitude(locationData.latitude);
                setLongitude(locationData.longitude);
                if (locationData.address) {
                  setLocation(locationData.address);
                  setLocationSelected(true);
                }
                // Extract state from context if available
                const extractedState = extractStateFromContext(locationData.context);
                if (extractedState) {
                  stateAutoFilledFromLocation.current = true;
                  setState(extractedState);
                }
                setLocationPickerVisible(false);
              }}
              onClose={() => setLocationPickerVisible(false)}
            />

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                State <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.stateInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter state"
                  placeholderTextColor={colors.textSecondary}
                  value={state}
                  onChangeText={(text: string) => {
                    stateAutoFilledFromLocation.current = false;
                    setState(text);
                    clearFieldError('state');
                  }}
                />
                <StateAutoSuggest
                  query={state}
                  onSelect={(stateData) => {
                    setState(stateData.name || stateData.placeName);
                    clearFieldError('state');
                  }}
                  visible={state.length >= 2 && !stateAutoFilledFromLocation.current}
                />
              </View>
              {renderFieldError('state')}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Additional Address</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter additional address details (building name, landmark, etc.)"
                placeholderTextColor={colors.textSecondary}
                value={additionalAddress}
                onChangeText={setAdditionalAddress}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </View>

            {fieldVisibility.showBedrooms && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {propertyType === 'Studio Apartment' ? 'Studio' : 'Bedrooms'}
                  {fieldVisibility.bedroomsRequired && <Text style={styles.required}>*</Text>}
                </Text>
                {propertyType === 'Studio Apartment' ? (
                  <View style={styles.studioButton}>
                    <Text style={styles.studioButtonText}>Studio (0 Bedrooms)</Text>
                  </View>
                ) : (
                  <View style={styles.numberButtonsContainer}>
                    <TouchableOpacity
                      style={[
                        styles.numberButton,
                        bedrooms === 0 && styles.numberButtonActive,
                      ]}
                      onPress={() => {
                        setBedrooms(0);
                        clearFieldError('bedrooms');
                      }}>
                      <Text
                        style={[
                          styles.numberButtonText,
                          bedrooms === 0 && styles.numberButtonTextActive,
                        ]}>
                        0
                      </Text>
                    </TouchableOpacity>
                    {[1, 2, 3, 4, 5].map(num => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.numberButton,
                          bedrooms === num && styles.numberButtonActive,
                        ]}
                        onPress={() => {
                          setBedrooms(num);
                          clearFieldError('bedrooms');
                        }}>
                        <Text
                          style={[
                            styles.numberButtonText,
                            bedrooms === num && styles.numberButtonTextActive,
                          ]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={[
                        styles.numberButton,
                        bedrooms === 6 && styles.numberButtonActive,
                      ]}
                      onPress={() => {
                        setBedrooms(6);
                        clearFieldError('bedrooms');
                      }}>
                      <Text
                        style={[
                          styles.numberButtonText,
                          bedrooms === 6 && styles.numberButtonTextActive,
                        ]}>
                        5+
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
                {renderFieldError('bedrooms')}
              </View>
            )}

            {fieldVisibility.showBathrooms && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  Bathrooms {fieldVisibility.bathroomsRequired && <Text style={styles.required}>*</Text>}
                </Text>
                <View style={styles.numberButtonsContainer}>
                  {[1, 2, 3, 4].map(num => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.numberButton,
                        bathrooms === num && styles.numberButtonActive,
                      ]}
                      onPress={() => {
                        setBathrooms(num);
                        clearFieldError('bathrooms');
                      }}>
                      <Text
                        style={[
                          styles.numberButtonText,
                          bathrooms === num && styles.numberButtonTextActive,
                        ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.numberButton,
                      bathrooms === 5 && styles.numberButtonActive,
                    ]}
                    onPress={() => {
                      setBathrooms(5);
                      clearFieldError('bathrooms');
                    }}>
                    <Text
                      style={[
                        styles.numberButtonText,
                        bathrooms === 5 && styles.numberButtonTextActive,
                      ]}>
                      4+
                    </Text>
                  </TouchableOpacity>
                </View>
                {renderFieldError('bathrooms')}
              </View>
            )}

            {fieldVisibility.showBalconies && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Balconies <Text style={styles.required}>*</Text></Text>
                <View style={styles.numberButtonsContainer}>
                  {[0, 1, 2, 3].map(num => (
                    <TouchableOpacity
                      key={num}
                      style={[
                        styles.numberButton,
                        balconies === num && styles.numberButtonActive,
                      ]}
                      onPress={() => {
                        setBalconies(num);
                        clearFieldError('balconies');
                      }}>
                      <Text
                        style={[
                          styles.numberButtonText,
                          balconies === num && styles.numberButtonTextActive,
                        ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity
                    style={[
                      styles.numberButton,
                      balconies === 4 && styles.numberButtonActive,
                    ]}
                    onPress={() => {
                      setBalconies(4);
                      clearFieldError('balconies');
                    }}>
                    <Text
                      style={[
                        styles.numberButtonText,
                        balconies === 4 && styles.numberButtonTextActive,
                      ]}>
                      3+
                    </Text>
                  </TouchableOpacity>
                </View>
                {renderFieldError('balconies')}
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {fieldVisibility.areaLabel} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.areaInputContainer}>
                <TextInput
                  style={[styles.input, styles.areaInput]}
                  placeholder={fieldVisibility.areaLabel === 'Plot Area' ? 'Enter plot area' : 'Enter area'}
                  placeholderTextColor={colors.textSecondary}
                  value={builtUpArea}
                  onChangeText={(text: string) => {
                    // Validate plot area limit (3 lac = 300,000 sq ft)
                    if (fieldVisibility.areaLabel === 'Plot Area') {
                      const numValue = parseFloat(text.replace(/[^0-9.]/g, ''));
                      if (!isNaN(numValue) && numValue > 300000) {
                        setFieldErrors(prev => ({
                          ...prev,
                          builtUpArea: 'Plot area cannot exceed 3 lac sq ft (300,000 sq ft)',
                        }));
                        return;
                      }
                    }
                    setBuiltUpArea(text);
                    clearFieldError('builtUpArea');
                  }}
                  keyboardType="numeric"
                />
                <Text style={styles.areaUnit}>sq.ft</Text>
              </View>
              {renderFieldError('builtUpArea')}
              {fieldVisibility.areaLabel === 'Plot Area' && (
                <Text style={styles.hintText}>
                  Maximum: 3 lac sq ft (300,000 sq ft)
                </Text>
              )}
            </View>

            {fieldVisibility.showCarpetArea && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Carpet Area</Text>
                <View style={styles.areaInputContainer}>
                  <TextInput
                    style={[styles.input, styles.areaInput]}
                    placeholder="Enter area"
                    placeholderTextColor={colors.textSecondary}
                    value={carpetArea}
                    onChangeText={(text: string) => {
                      setCarpetArea(text);
                      clearFieldError('carpetArea');
                    }}
                    keyboardType="numeric"
                  />
                  <Text style={styles.areaUnit}>sq.ft</Text>
                </View>
                {renderFieldError('carpetArea')}
              </View>
            )}

            {fieldVisibility.showFloor && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Floor Number <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 5"
                  placeholderTextColor={colors.textSecondary}
                  value={floor}
                  onChangeText={(text: string) => {
                    setFloor(text.replace(/[^0-9]/g, ''));
                    clearFieldError('floor');
                  }}
                  keyboardType="number-pad"
                />
                {renderFieldError('floor')}
              </View>
            )}

            {fieldVisibility.showTotalFloors && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Total Floors <Text style={styles.required}>*</Text></Text>
                <TextInput
                  style={styles.input}
                  placeholder="Total floors in building"
                  placeholderTextColor={colors.textSecondary}
                  value={totalFloors}
                  onChangeText={(text: string) => {
                    setTotalFloors(text.replace(/[^0-9]/g, ''));
                    clearFieldError('totalFloors');
                  }}
                  keyboardType="number-pad"
                />
                {renderFieldError('totalFloors')}
              </View>
            )}

            <Dropdown
              label="Facing"
              placeholder="Select facing direction"
              required={true}
              options={[
                { label: 'North', value: 'North' },
                { label: 'South', value: 'South' },
                { label: 'East', value: 'East' },
                { label: 'West', value: 'West' },
                { label: 'North-East', value: 'North-East' },
                { label: 'North-West', value: 'North-West' },
                { label: 'South-East', value: 'South-East' },
                { label: 'South-West', value: 'South-West' },
              ]}
              value={facing}
              onSelect={(value) => {
                setFacing(value);
                clearFieldError('facing');
              }}
            />
            {renderFieldError('facing')}

            {fieldVisibility.showAge && (
              <>
                <Dropdown
                  label="Property Age"
                  placeholder="Select property age"
                  required={true}
                  options={[
                    { label: 'New Construction', value: 'New Construction' },
                    { label: 'Less than 1 Year', value: 'Less than 1 Year' },
                    { label: '1-5 Years', value: '1-5 Years' },
                    { label: '5-10 Years', value: '5-10 Years' },
                    { label: '10+ Years', value: '10+ Years' },
                  ]}
                  value={propertyAge}
                  onSelect={(value) => {
                    setPropertyAge(value);
                    clearFieldError('propertyAge');
                  }}
                />
                {renderFieldError('propertyAge')}
              </>
            )}

            {fieldVisibility.showFurnishing && (
              <>
                <Dropdown
                  label="Furnishing"
                  placeholder="Select furnishing status"
                  required={true}
                  options={[
                    { label: 'Unfurnished', value: 'Unfurnished' },
                    { label: 'Semi-Furnished', value: 'Semi-Furnished' },
                    { label: 'Fully-Furnished', value: 'Fully-Furnished' },
                  ]}
                  value={furnishing}
                  onSelect={(value) => {
                    setFurnishing(value);
                    clearFieldError('furnishing');
                  }}
                />
                {renderFieldError('furnishing')}
              </>
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent} pointerEvents={isLimitedEdit ? 'none' : 'auto'}>
            <Text style={styles.stepTitle}>Amenities & Description</Text>
            <Text style={styles.stepSubtitle}>
              Select the amenities available and describe your property.
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Amenities</Text>
              <View style={styles.amenitiesGrid}>
                {availableAmenities.map(amenity => (
                  <TouchableOpacity
                    key={amenity.id}
                    style={[
                      styles.amenityButton,
                      selectedAmenities.includes(amenity.id) &&
                      styles.amenityButtonActive,
                    ]}
                    onPress={() => {
                      toggleAmenity(amenity.id);
                      clearFieldError('selectedAmenities');
                    }}>
                    <View style={styles.amenityIconWrap}>
                      <TabIcon name={AMENITY_ICONS[amenity.id] || 'sparkles'} color={selectedAmenities.includes(amenity.id) ? colors.surface : colors.textSecondary} size={20} />
                    </View>
                    <Text
                      style={[
                        styles.amenityText,
                        selectedAmenities.includes(amenity.id) &&
                        styles.amenityTextActive,
                      ]}>
                      {amenity.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {renderFieldError('selectedAmenities')}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Property Description <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your property in detail (minimum 100 characters required). Mention unique features, nearby landmarks, connectivity, etc. Note: Mobile numbers and email addresses are not allowed."
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
                Characters: {description.length}/1000 (min: 100)
              </Text>
              {renderFieldError('description')}
              {description.length > 0 && description.length < 100 && (
                <Text style={styles.errorText}>
                  Description must be at least 100 characters
                </Text>
              )}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Upload Photos</Text>
            <Text style={styles.stepSubtitle}>
              Add 4–10 high-quality photos of your property (minimum 4 required)
            </Text>

            <TouchableOpacity
              style={styles.photoUploadArea}
              onPress={() => {
                clearFieldError('photos');
                handleImagePicker();
              }}
              activeOpacity={0.7}>
              <TabIcon name="upload" color={colors.primary} size={32} />
              <Text style={styles.photoUploadText}>Tap to select photos from gallery</Text>
              <Text style={styles.photoUploadSubtext}>
                Select up to {10 - photos.length} more photos
              </Text>
              <Text style={styles.photoUploadHint}>
                Minimum 4 images required. Supports: JPG, PNG, WEBP (Max 5MB each)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoCameraButton}
              onPress={() => {
                clearFieldError('photos');
                handleCameraCapture();
              }}
              activeOpacity={0.7}>
              <TabIcon name="camera" color={colors.primary} size={32} />
              <Text style={styles.photoUploadText}>Take photo with camera</Text>
            </TouchableOpacity>
            {renderFieldError('photos')}

            {photos.length > 0 && (
              <View style={styles.photosPreview}>
                {photos.map((photo, index) => {
                  const showApprovedBadge = photo.moderationStatus === 'APPROVED';
                  const showRejectedBadge = photo.moderationStatus === 'REJECTED';
                  const statusColor = showApprovedBadge ? '#4CAF50' : showRejectedBadge ? colors.error : 'transparent';
                  const statusText = showApprovedBadge ? '✓' : showRejectedBadge ? '✗' : '';

                  return (
                    <View key={index} style={styles.photoPreviewItem}>
                      <Image source={{ uri: photo.uri }} style={styles.photoPreviewImage} />
                      {photo.moderationStatus === 'checking' && (
                        <View style={[styles.moderationBadge, styles.moderationBadgeLoading]}>
                          <ActivityIndicator size="small" color={colors.surface} />
                        </View>
                      )}
                      {(showApprovedBadge || showRejectedBadge) && (
                        <View style={[styles.moderationBadge, { backgroundColor: statusColor }]}>
                          <Text style={styles.moderationBadgeText}>{statusText}</Text>
                        </View>
                      )}
                      {photo.moderationReason && photo.moderationStatus === 'REJECTED' && (
                        <View style={styles.reasonBadge}>
                          <Text style={styles.reasonText} numberOfLines={2}>
                            {photo.moderationReason}
                          </Text>
                        </View>
                      )}
                      {photo.moderationStatus === 'REJECTED' && (
                        <TouchableOpacity
                          style={styles.errorDetailsButton}
                          onPress={() => {
                            Alert.alert(
                              'Image Rejected',
                              photo.moderationReason || 'Image does not meet our guidelines. Please upload property images only.',
                              [{ text: 'OK' }]
                            );
                          }}>
                          <Text style={styles.errorDetailsText}>View Details</Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.photoRemoveButton}
                        onPress={() => {
                          setPhotos(prev => prev.filter((_, i) => i !== index));
                        }}>
                        <Text style={styles.photoRemoveText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pricing Details</Text>
            <Text style={styles.stepSubtitle}>Set the right price for your property</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                {propertyStatus === 'sell' ? 'Expected Price' : 'Monthly Rent'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder={propertyStatus === 'sell' ? 'Enter expected price' : 'Enter monthly rent'}
                  placeholderTextColor={colors.textSecondary}
                  value={expectedPrice}
                  onChangeText={(text: string) => {
                    setExpectedPrice(text);
                    clearFieldError('expectedPrice');
                  }}
                  keyboardType="numeric"
                />
              </View>
              {formatPriceShort(expectedPrice) && (
                <Text style={styles.priceSuggestionText}>≈ ₹{formatPriceShort(expectedPrice)}</Text>
              )}
              {renderFieldError('expectedPrice')}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setPriceNegotiable(!priceNegotiable)}>
                <View
                  style={[
                    styles.checkbox,
                    priceNegotiable && styles.checkboxChecked,
                  ]}>
                  {priceNegotiable && <TabIcon name="check" color={colors.surface} size={14} />}
                </View>
                <Text style={styles.checkboxLabel}>Price is negotiable</Text>
              </TouchableOpacity>
            </View>

            {propertyStatus === 'rent' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Security Deposit</Text>
                  <View style={styles.priceInputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={[styles.input, styles.priceInput]}
                      placeholder="Enter deposit amount"
                      placeholderTextColor={colors.textSecondary}
                      value={depositAmount}
                      onChangeText={setDepositAmount}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={styles.hintText}>
                    Typically 2-6 months of rent
                  </Text>
                </View>

                {/* Available for Bachelors - Only for Apartment, PG / Hostel */}
                {(propertyType === 'Apartment' || propertyType === 'PG / Hostel') && (
                  <View style={styles.inputContainer}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setAvailableForBachelors(!availableForBachelors)}>
                      <View
                        style={[
                          styles.checkbox,
                          availableForBachelors && styles.checkboxChecked,
                        ]}>
                        {availableForBachelors && <TabIcon name="check" color={colors.surface} size={14} />}
                      </View>
                      <Text style={styles.checkboxLabel}>Available for bachelors</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Maintenance (per month)</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Enter monthly maintenance"
                  placeholderTextColor={colors.textSecondary}
                  value={maintenance}
                  onChangeText={setMaintenance}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.summaryButton}>
              <Text style={styles.summaryButtonText}>Listing Summary</Text>
            </TouchableOpacity>

            <View style={styles.listingSummary}>
              <Text style={styles.summaryTitle}>Listing Summary</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Property:</Text>
                <Text style={styles.summaryValue}>{propertyTitle || 'N/A'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Type:</Text>
                <Text style={styles.summaryValue}>
                  {propertyType || 'N/A'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Configuration:</Text>
                <Text style={styles.summaryValue}>
                  {bedrooms ? `${bedrooms} BHK` : 'N/A'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Area:</Text>
                <Text style={styles.summaryValue}>
                  {builtUpArea ? `${builtUpArea} sq.ft` : 'N/A'}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Location:</Text>
                <Text style={styles.summaryValue}>{location || 'N/A'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Photos:</Text>
                <Text style={styles.summaryValue}>{photos.length} uploaded</Text>
              </View>
              {propertyStatus === 'sell' && expectedPrice && (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Expected Price:</Text>
                  <Text style={styles.summaryValue}>
                    {formatters.price(parseFloat(expectedPrice.replace(/[^0-9.]/g, '')) || 0, false)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const getStepStatus = (stepId: number) => {
    if (currentStep > stepId) {
      return 'completed';
    } else if (currentStep === stepId) {
      return 'active';
    }
    return 'pending';
  };

  // Show loading while loading property data
  if (loadingProperty) {
    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        presentationStyle="overFullScreen"
        statusBarTranslucent={true}
        onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* @ts-expect-error SafeAreaView accepts style at runtime (types incomplete) */}
            <SafeAreaView style={styles.safeArea}>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading property details...</Text>
              </View>
            </SafeAreaView>
          </View>
        </View>
      </Modal>
    );
  }

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
          {/* @ts-expect-error SafeAreaView accepts style at runtime (types incomplete) */}
          <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
              style={styles.safeArea}
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
              {/* Restricted edit banner for older listings */}
              {isEditMode && isLimitedEdit && (
                <View style={styles.limitedBanner}>
                  <Text style={styles.limitedBannerTitle}>Limited Edit Mode</Text>
                  <Text style={styles.limitedBannerText}>
                    This listing is more than 24 hours old. You can only edit the Title and Pricing fields (price, negotiable, security deposit, maintenance). Other details are locked.
                  </Text>
                </View>
              )}

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {isEditMode ? 'Edit Property' : 'List Your Property'}
                </Text>
                <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                  <TabIcon name="close" color={colors.surface} size={20} />
                </TouchableOpacity>
              </View>

              {/* Progress Steps */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.progressContainer}
                contentContainerStyle={styles.progressContent}>
                {steps.map((step) => {
                  const status = getStepStatus(step.id);
                  return (
                    <TouchableOpacity
                      key={step.id}
                      style={styles.stepItem}
                      onPress={() => {
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
                          <TabIcon name="check" color={colors.surface} size={12} />
                        ) : (
                          <View style={styles.stepIconWrap}>
                            <TabIcon name={step.iconName} color={currentStep >= step.id ? colors.surface : colors.textSecondary} size={18} />
                          </View>
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
                ref={stepScrollViewRef}
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={true}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag">
                {renderStepContent()}
              </ScrollView>

              {/* Footer */}
              <View style={styles.footer}>
                {currentStep > 1 && (
                  <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
                    <TabIcon name="chevron-left" color={colors.surface} size={22} />
                    <Text style={styles.backButtonText}>Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.nextButton, isSubmitting && styles.disabledButton]}
                  onPress={handleNext}
                  disabled={isSubmitting}>
                  {currentStep === totalSteps ? (
                    // @ts-expect-error - LinearGradient works but TypeScript types are incorrect
                    <LinearGradient
                      colors={isSubmitting ? ['#CCCCCC', '#999999'] : ['#43A047', '#2E7D32']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.publishButtonGradient}>
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color={colors.surface} />
                      ) : (
                        <TabIcon name="check" color={colors.surface} size={20} />
                      )}
                      <Text style={styles.publishButtonText}>
                        {isSubmitting ? 'Submitting...' : 'Publish Listing'}
                      </Text>
                    </LinearGradient>
                  ) : (
                    // @ts-expect-error - LinearGradient works but TypeScript types are incorrect
                    <LinearGradient
                      colors={['#0077C0', '#005A94']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nextButtonGradient}>
                      <Text style={styles.nextButtonText}>Next</Text>
                      <Text style={styles.nextButtonArrow}>→</Text>
                    </LinearGradient>
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
  },
  modalContainer: {
    width: '95%',
    maxWidth: 600,
    height: '90%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    zIndex: 10000,
    elevation: 10000,
  },
  safeArea: {
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
    color: colors.text,
    marginTop: spacing.md,
    fontSize: 16,
  },
  limitedBanner: {
    backgroundColor: '#FFF3CD',
    borderBottomWidth: 1,
    borderBottomColor: '#FFC107',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexShrink: 0,
  },
  limitedBannerTitle: {
    ...typography.h3,
    color: '#856404',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  limitedBannerText: {
    ...typography.body,
    color: '#856404',
    fontSize: 13,
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    minHeight: 70,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexShrink: 0,
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
    backgroundColor: '#43A047',
  },
  stepCircleActive: {
    backgroundColor: '#0077C0',
  },
  stepIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIcon: {
    fontSize: 20,
  },
  stepCheckmark: {
    fontSize: 20,
    color: colors.surface,
    fontWeight: 'bold',
  },
  stepLabel: {
    ...typography.caption,
    fontSize: 10,
    lineHeight: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: '#43A047',
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
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  stepContent: {
    paddingBottom: spacing.lg,
  },
  stepTitle: {
    ...typography.h1,
    fontSize: 24,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  stepSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  locationInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  stateInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 14,
  },
  required: {
    color: '#E53935',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
  errorText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  typeButton: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  typeButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  typeButtonUnselected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    gap: spacing.xs,
  },
  typeButtonIcon: {
    fontSize: 18,
  },
  typeButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
  typeButtonTextSelected: {
    ...typography.body,
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  propertyTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    marginHorizontal: -spacing.xs / 2, // Negative margin for spacing
  },
  propertyTypeButton: {
    width: '48%', // Two columns with space between
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    marginHorizontal: spacing.xs / 2, // Half margin on each side
    marginBottom: spacing.md,
  },
  propertyTypeButtonActive: {
    borderColor: '#0077C0',
    borderWidth: 2,
    backgroundColor: '#E3F6FF',
  },
  propertyTypeIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  propertyTypeIconWrap: {
    marginBottom: spacing.xs,
  },
  propertyTypeText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  propertyTypeTextActive: {
    color: '#0077C0',
    fontWeight: '600',
  },
  mapContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  mapLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: spacing.sm,
  },
  mapButton: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.xs,
  },
  mapButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  mapButtonIcon: {
    fontSize: 18,
    marginRight: spacing.xs,
  },
  mapButtonText: {
    ...typography.body,
    color: colors.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  mapButtonSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  coordinateText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  numberButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  studioButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  studioButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  numberButton: {
    width: 60,
    height: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberButtonActive: {
    backgroundColor: '#0077C0',
    borderColor: '#0077C0',
  },
  numberButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  numberButtonTextActive: {
    color: colors.surface,
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
  dropdown: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
  },
  dropdownPlaceholder: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16,
  },
  dropdownArrow: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: AMENITY_GAP,
  },
  amenityButton: {
    width: AMENITY_ITEM_WIDTH,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
    paddingHorizontal: spacing.xs,
  },
  amenityButtonActive: {
    borderColor: '#0077C0',
    borderWidth: 2,
    backgroundColor: '#E3F6FF',
  },
  amenityIcon: {
    fontSize: 24,
    marginBottom: spacing.xs,
  },
  amenityIconWrap: {
    marginBottom: spacing.xs,
  },
  amenityText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 12,
    textAlign: 'center',
  },
  amenityTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  photoUploadArea: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    backgroundColor: '#FAFAFA',
  },
  photoUploadIcon: {
    fontSize: 32,
    marginBottom: spacing.md,
  },
  photoUploadText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  photoUploadSubtext: {
    ...typography.body,
    color: colors.text,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  photoUploadHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
  },
  photoCameraButton: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#E8F4FD',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  photosPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  photoPreviewItem: {
    width: 100,
    height: 100,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  moderationBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 60,
    alignItems: 'center',
  },
  moderationBadgeLoading: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    minHeight: 28,
  },
  moderationBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  reasonBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
  },
  reasonText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 8,
  },
  errorDetailsButton: {
    position: 'absolute',
    bottom: 24,
    left: 4,
    right: 4,
    backgroundColor: colors.error,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignItems: 'center',
  },
  errorDetailsText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  photoRemoveButton: {
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
  photoRemoveText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: 'bold',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
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
  priceSuggestionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 4,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#0077C0',
    borderColor: '#0077C0',
  },
  checkboxCheck: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
  },
  summaryButton: {
    backgroundColor: '#E3F6FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryButtonText: {
    ...typography.body,
    color: '#0077C0',
    fontSize: 14,
    fontWeight: '600',
  },
  listingSummary: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryTitle: {
    ...typography.h3,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 14,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    gap: spacing.md,
    flexShrink: 0,
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
    overflow: 'hidden',
  },
  disabledButton: {
    opacity: 0.6,
  },
  nextButtonGradient: {
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
  publishButtonGradient: {
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
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  typeButtonActive: {
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accent + '20',
  },
  typeButtonTextActive: {
    color: colors.accent,
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
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accent + '20',
  },
  configButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
  },
  configButtonTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
  },
  amenityCheckmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
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
  disabledInput: {
    backgroundColor: colors.border + '40',
    color: colors.textSecondary,
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
    color: colors.accent,
    fontSize: 11,
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
  priceDisplay: {
    ...typography.caption,
    color: colors.accent,
    fontSize: 12,
    marginTop: spacing.xs,
    fontWeight: '600',
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
  nextButtonDisabled: {
    backgroundColor: colors.border,
    opacity: 0.6,
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
  uploadButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
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
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});

export default AddPropertyScreen;
