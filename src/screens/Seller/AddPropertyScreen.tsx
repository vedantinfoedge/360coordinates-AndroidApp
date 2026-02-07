import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Platform,
  PermissionsAndroid,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, RouteProp} from '@react-navigation/native';
import {launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import {CompositeNavigationProp} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {SellerStackParamList} from '../../navigation/SellerNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import Dropdown from '../../components/common/Dropdown';
import {propertyService} from '../../services/property.service';
import {sellerService} from '../../services/seller.service';
import {uploadPropertyImageWithModeration} from '../../services/imageUpload.service';
import {USE_FIREBASE_STORAGE} from '../../config/firebaseStorage.config';
import {useAuth} from '../../context/AuthContext';
import {isFirebaseStorageAvailable} from '../../services/firebaseStorageProperty.service';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import StateAutoSuggest from '../../components/search/StateAutoSuggest';
import LocationPicker from '../../components/map/LocationPicker';
import {extractStateFromContext} from '../../utils/geocoding';
import {
  GuidePropertyType,
  getPropertyTypeConfig,
  getAvailableAmenitiesForPropertyType,
  PROPERTY_TYPES,
  AMENITIES_LIST,
} from '../../utils/propertyTypeConfig';
import {validation} from '../../utils/validation';
import {formatters} from '../../utils/formatters';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type AddPropertyScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<SellerStackParamList, 'AddProperty'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type Props = {
  navigation: AddPropertyScreenNavigationProp;
};

type PropertyStatus = 'sale' | 'rent';

const AddPropertyScreen: React.FC<Props> = ({navigation}) => {
  const {user} = useAuth(); // Get user for userId
  const route = useRoute<RouteProp<SellerStackParamList, 'AddProperty'>>();
  const routeParams = (route.params as any) || {};
  const isEditMode = !!routeParams.propertyId;
  const isLimitedEdit = !!routeParams.isLimitedEdit;
  const propertyId = routeParams.propertyId;
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyStatus, setPropertyStatus] = useState<PropertyStatus>('sale');
  const [propertyType, setPropertyType] = useState<GuidePropertyType | ''>('');
  const [location, setLocation] = useState('');
  const [locationSelected, setLocationSelected] = useState(false); // Track if location was selected from autosuggest
  const [state, setState] = useState('');
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
  const [photos, setPhotos] = useState<
    Array<{
      uri: string;
      // NOTE: base64 is no longer sent to backend; kept only to avoid crashes
      base64?: string;
      moderationStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking';
      moderationReason?: string;
      imageUrl?: string; // final URL from moderation/upload API
    }>
  >([]);
  const [expectedPrice, setExpectedPrice] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [maintenance, setMaintenance] = useState('');
  const [availableForBachelors, setAvailableForBachelors] = useState(false);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [loadingProperty, setLoadingProperty] = useState(isEditMode);

  const showError = (title: string, message: string) => {
    Alert.alert(title, message, [{text: 'OK'}]);
  };

  const totalSteps = 5;

  // Check property limit on screen load (only for new properties)
  // According to backend: Sellers have limits based on subscription (free=3, basic=10, pro=10, premium=10)
  // Agents have unlimited properties
  useEffect(() => {
    if (isEditMode) {
      // Skip limit check for edit mode
      setCheckingLimit(false);
      return;
    }

    const checkLimit = async () => {
      try {
        setCheckingLimit(true);
        
        // Agents have unlimited properties - skip check
        if (user?.user_type === 'agent') {
          setCheckingLimit(false);
          return;
        }

        const statsResponse: any = await sellerService.getDashboardStats();
        if (statsResponse && statsResponse.success && statsResponse.data) {
          const currentCount = statsResponse.data.total_properties || 0;
          
          // Get subscription plan type (defaults to 'free' if no subscription)
          const planType = statsResponse.data.subscription?.plan_type || 'free';
          
          // Property limits based on subscription plan
          const limits: {[key: string]: number} = {
            'free': 3,
            'basic': 10,
            'pro': 10,
            'premium': 10,
          };
          
          const limit = limits[planType] || limits['free'];
          
          if (limit > 0 && currentCount >= limit) {
            Alert.alert(
              'Property limit reached',
              `Property limit reached. You can list up to ${limit} properties in your current plan.`,
              [{text: 'OK', onPress: () => navigation.goBack()}],
              {cancelable: false}
            );
          }
        }
      } catch (error: any) {
        // If dashboard stats endpoint doesn't exist (404), allow to continue
        // The backend will enforce the limit when creating the property
        if (error?.status !== 404 && error?.response?.status !== 404) {
          console.warn('[AddProperty] Error checking property limit:', error);
        }
        // Allow to continue if check fails (including 404)
      } finally {
        setCheckingLimit(false);
      }
    };

    checkLimit();
  }, [navigation, isEditMode, user]);

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
          setPropertyStatus(propData.status === 'rent' ? 'rent' : 'sale');
          setPropertyType(propData.property_type || '');
          setLocation(propData.location || '');
          setState(propData.state || '');
          setAdditionalAddress(propData.additional_address || '');
          setLatitude(propData.latitude || null);
          setLongitude(propData.longitude || null);
          setBedrooms(propData.bedrooms ? parseInt(String(propData.bedrooms)) : null);
          setBathrooms(propData.bathrooms ? parseInt(String(propData.bathrooms)) : null);
          setBalconies(propData.balconies ? parseInt(String(propData.balconies)) : null);
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
          } else if (propData.cover_image) {
            // Fallback to cover_image if images array is not available
            const existingImages = [{
              uri: propData.cover_image,
              imageUrl: propData.cover_image,
              moderationStatus: 'APPROVED' as const,
            }];
            setPhotos(existingImages);
          }
        } else {
          Alert.alert('Error', 'Failed to load property details', [{text: 'OK', onPress: () => navigation.goBack()}]);
        }
      } catch (error: any) {
        console.error('Error loading property:', error);
        Alert.alert('Error', error.message || 'Failed to load property details', [{text: 'OK', onPress: () => navigation.goBack()}]);
      } finally {
        setLoadingProperty(false);
      }
    };

    loadPropertyData();
  }, [isEditMode, propertyId, navigation]);
  const steps = [
    {id: 1, name: 'Basic Info', icon: '📝'},
    {id: 2, name: 'Property Details', icon: '🏠'},
    {id: 3, name: 'Amenities', icon: '✨'},
    {id: 4, name: 'Photos', icon: '📷'},
    {id: 5, name: 'Pricing', icon: '💰'},
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

  // Get available amenities based on property type (using guide utility)
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

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const apiLevel = Platform.Version;
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

  const handleImagePicker = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant photo access in Settings to upload property images.', [{text: 'OK'}]);
      return;
    }

    if (photos.length >= 10) {
      showError('Limit Reached', 'You can upload maximum 10 photos');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.6 as const,
      selectionLimit: 10 - photos.length,
      includeBase64: true,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        const msg = response.errorMessage || response.errorCode === 'permission' ? 'Photo access denied. Please allow access in Settings.' : 'Failed to pick image';
        Alert.alert('Error', msg, [{text: 'OK'}]);
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const maxPhotos = 10;
        const remainingSlots = maxPhotos - photos.length;
        const assetsToAdd = response.assets.slice(0, remainingSlots);

        if (photos.length + assetsToAdd.length > maxPhotos) {
          showError('Limit Reached', 'You can upload maximum 10 photos');
          return;
        }

        try {
        const newPhotos = assetsToAdd.map(asset => {
          // Format base64 as data URI for backend compatibility
          // Extract image type from URI if asset.type is not available
          let imageType = asset.type || 'jpeg';
          if (!asset.type && asset.uri) {
            const uriLower = asset.uri.toLowerCase();
            if (uriLower.includes('.png')) imageType = 'png';
            else if (uriLower.includes('.jpg') || uriLower.includes('.jpeg')) imageType = 'jpeg';
            else if (uriLower.includes('.webp')) imageType = 'webp';
          }
          
          // Ensure base64 doesn't already include data URI prefix
          let base64Data = asset.base64;
          if (base64Data && base64Data.includes('data:image/')) {
            // Extract just the base64 part if it's already formatted
            const parts = base64Data.split(',');
            base64Data = parts.length > 1 ? parts[1] : base64Data;
          }
          
          const base64String = base64Data 
            ? `data:image/${imageType};base64,${base64Data}`
            : undefined;
          
          return {
            uri: asset.uri || '',
            base64: base64String, // Store base64 for sending to add.php
            moderationStatus: 'checking' as const,
            moderationReason: undefined,
            imageUrl: undefined, // May be set by moderation API, but we'll use base64 for submission
          };
        });
        
        const updatedPhotos = [...photos, ...newPhotos];
        setPhotos(updatedPhotos);

        const firebaseEnabled = USE_FIREBASE_STORAGE && user?.id;
        const firebaseAvailable = firebaseEnabled && isFirebaseStorageAvailable();

        if (!firebaseEnabled || !firebaseAvailable) {
          const message = !user?.id
            ? 'You must be signed in to upload images.'
            : !firebaseAvailable
            ? 'Firebase Storage is not available. Please rebuild the app to enable image uploads.'
            : 'Firebase Storage is required for property images. Please enable it and rebuild the app.';
          Alert.alert('Image Upload Unavailable', message, [{text: 'OK'}]);
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
              console.log('[AddProperty] Firebase Storage flow: Device → Firebase → backend URL for moderation', {
                imageIndex: index,
                userId: user.id,
                propertyId: isEditMode ? propertyId : null,
              });
              uploadPropertyImageWithModeration(
                img.uri,
                isEditMode ? propertyId : null,
                user.id,
                (progress) => {
                  console.log(`[AddProperty] Upload progress ${index + 1}: ${Math.round(progress)}%`);
                }
              )
                .then(result => {
                  console.log('[AddProperty] Firebase upload result:', {
                    moderationStatus: result.moderationStatus,
                    hasFirebaseUrl: !!result.firebaseUrl,
                  });
                  setPhotos(prev => {
                    const updated = [...prev];
                    const imgIndex = prev.length - newPhotos.length + index;
                    if (updated[imgIndex]) {
                      const status = String(result.moderationStatus || '').toUpperCase();
                      let moderationStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking' = 'checking';
                      if (status === 'SAFE' || status === 'APPROVED') moderationStatus = 'APPROVED';
                      else if (status === 'REJECTED' || status === 'UNSAFE') moderationStatus = 'REJECTED';
                      else if (status === 'PENDING' || status === 'NEEDS_REVIEW') moderationStatus = 'PENDING';
                      else moderationStatus = 'PENDING';
                      const firebaseUrl = result.firebaseUrl || result.imageUrl || '';
                      if (!firebaseUrl) console.error('[AddProperty] Firebase URL missing in result:', result);
                      updated[imgIndex] = {
                        ...updated[imgIndex],
                        moderationStatus,
                        moderationReason: result.moderationReason || undefined,
                        imageUrl: firebaseUrl,
                      };
                    }
                    return updated;
                  });
                  if (result.moderationStatus === 'REJECTED' || result.moderationStatus === 'UNSAFE') {
                    Alert.alert(
                      'Image Rejected',
                      result.moderationReason || 'Image does not meet our guidelines. Please upload property images only.',
                      [{text: 'OK'}]
                    );
                  } else if (result.moderationStatus === 'PENDING' || result.moderationStatus === 'NEEDS_REVIEW') {
                    Alert.alert(
                      'Image Under Review',
                      'Your image is being reviewed and will be visible after approval.',
                      [{text: 'OK'}]
                    );
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
                  Alert.alert('Upload Failed', errorMessage, [{text: 'OK'}]);
                });
            }
          });
        }

        console.log('[AddProperty] Added', newPhotos.length, 'images (Device → Firebase Storage → backend URL for moderation)');
        } catch (err) {
          console.error('[AddProperty] Image processing error:', err);
          Alert.alert('Error', 'Failed to process images. Please try again.', [{text: 'OK'}]);
        }
      }
    });
  };

  const handleNext = () => {
    // Validation based on guide specifications
    if (currentStep === 1) {
      if (!propertyTitle.trim()) {
        showError('Error', 'Please enter property title');
        return;
      }
      const titleLength = propertyTitle.trim().length;
      if (titleLength < 1 || titleLength > 200) {
        showError('Error', 'Title must be between 1 and 200 characters');
        return;
      }
      if (!propertyType) {
        showError('Error', 'Please select property type');
        return;
      }
    }
    if (currentStep === 2) {
      if (!location.trim()) {
        showError('Error', 'Please enter location');
        return;
      }
      if (location.trim().length < 3) {
        showError('Error', 'Location must be at least 3 characters');
        return;
      }
      if (!state.trim()) {
        showError('Error', 'Please enter state');
        return;
      }
      if (fieldVisibility.showFacing && !facing) {
        showError('Error', 'Please select facing direction');
        return;
      }
      if (fieldVisibility.bedroomsRequired && bedrooms === null && propertyType !== 'Studio Apartment') {
        showError('Error', 'Please select number of bedrooms');
        return;
      }
      if (fieldVisibility.bathroomsRequired && bathrooms === null) {
        showError('Error', 'Please select number of bathrooms');
        return;
      }
      if (!builtUpArea.trim()) {
        showError('Error', `Please enter ${fieldVisibility.areaLabel.toLowerCase()}`);
        return;
      }
      const areaValue = parseFloat(builtUpArea);
      if (isNaN(areaValue) || areaValue <= 0) {
        showError('Error', `${fieldVisibility.areaLabel} must be a positive number`);
        return;
      }
      if (carpetArea.trim()) {
        const carpetValue = parseFloat(carpetArea);
        if (isNaN(carpetValue) || carpetValue <= 0) {
          showError('Error', 'Carpet area must be a positive number');
          return;
        }
        if (carpetValue > areaValue) {
          showError('Error', 'Carpet area cannot be greater than built-up area');
          return;
        }
      }
      if (floor.trim() && totalFloors.trim()) {
        const floorNum = parseInt(floor);
        const totalFloorsNum = parseInt(totalFloors);
        if (!isNaN(floorNum) && !isNaN(totalFloorsNum) && floorNum > totalFloorsNum) {
          showError('Error', 'Floor number cannot be greater than total floors');
          return;
        }
      }
      if (fieldVisibility.showFurnishing && !furnishing) {
        showError('Error', 'Please select furnishing status');
        return;
      }
    }
    if (currentStep === 3) {
      if (!description.trim()) {
        showError('Error', 'Please enter property description');
        return;
      }
      if (description.trim().length < 100) {
        showError('Error', 'Description must be at least 100 characters');
        return;
      }
      if (description.trim().length > 1000) {
        showError('Error', 'Description cannot exceed 1000 characters');
        return;
      }
      const mobileRegex = /(\+91[\s-]?)?[6-9]\d{9}/g;
      if (mobileRegex.test(description)) {
        showError('Error', 'Description cannot contain mobile numbers');
        return;
      }
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      if (emailRegex.test(description)) {
        showError('Error', 'Description cannot contain email addresses');
        return;
      }
    }
    if (currentStep === 5) {
      if (!expectedPrice.trim()) {
        showError('Error', propertyStatus === 'sale' ? 'Please enter expected price' : 'Please enter monthly rent');
        return;
      }
      const priceValue = parseFloat(expectedPrice.replace(/[^0-9.]/g, ''));
      const priceCheck = validation.validatePrice(priceValue, propertyStatus);
      if (!priceCheck.valid) {
        showError('Error', priceCheck.message || 'Invalid price');
        return;
      }

      if (propertyStatus === 'rent' && depositAmount.trim().length > 0) {
        const depositValue = parseFloat(depositAmount.replace(/[^0-9.]/g, ''));
        const depositCheck = validation.validateDeposit(depositValue, priceValue);
        if (!depositCheck.valid) {
          showError('Error', depositCheck.message || 'Invalid security deposit');
          return;
        }
      }

      if (maintenance.trim().length > 0) {
        const maintenanceValue = parseFloat(maintenance.replace(/[^0-9.]/g, ''));
        if (isNaN(maintenanceValue) || maintenanceValue <= 0) {
          showError('Error', 'Maintenance must be a positive amount');
          return;
        }
      }
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      if (isEditMode && propertyId) {
        // EDIT MODE: Update existing property via PUT /api/seller/properties/update.php
        console.log('[AddProperty] Editing property ID:', propertyId);

        // Collect existing image URLs (preserve URLs, filter blob/file)
        const existingImageUrls = photos
          .filter(p => p.imageUrl && !p.uri.startsWith('blob:') && !p.uri.startsWith('file:'))
          .map(p => p.imageUrl!)
          .filter((url): url is string => !!url && !url.startsWith('blob:'));

        // New images (base64 or uploaded via moderation)
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

        const allImages = [...existingImageUrls, ...newImageBase64];

        if (allImages.length === 0 && photos.length > 0) {
          Alert.alert(
            'No Valid Images',
            'Please wait for images to be processed or upload new images.',
            [{text: 'OK'}]
          );
          setIsSubmitting(false);
          return;
        }

        const checkingImages = photos.filter(p => p.moderationStatus === 'checking');
        if (checkingImages.length > 0) {
          Alert.alert(
            'Images Still Validating',
            'Please wait for all images to be validated before submitting.',
            [{text: 'OK'}]
          );
          setIsSubmitting(false);
          return;
        }

        // Build update data based on 24-hour restriction
        // Allowed after 24h: title, price, price_negotiable, maintenance_charges, deposit_amount
        // Restricted: location, latitude, longitude, state, additional_address, and all other fields
        const updateData: any = {};
        updateData.title = propertyTitle.trim();
        updateData.price = parseFloat(expectedPrice.replace(/[^0-9.]/g, '')) || 0;
        updateData.price_negotiable = priceNegotiable;
        updateData.maintenance_charges = maintenance ? parseFloat(maintenance.replace(/[^0-9.]/g, '')) : null;
        if (propertyStatus === 'rent' && depositAmount) {
          updateData.deposit_amount = parseFloat(depositAmount.replace(/[^0-9.]/g, '')) || null;
        }
        if (
          propertyStatus === 'rent' &&
          (propertyType === 'Apartment' || propertyType === 'PG / Hostel' || propertyType === 'Studio Apartment')
        ) {
          updateData.available_for_bachelors = availableForBachelors;
        }

        if (!isLimitedEdit) {
          updateData.status = propertyStatus;
          updateData.property_type = propertyType;
          updateData.location = location.trim();
          updateData.state = state.trim() || null;
          updateData.additional_address = additionalAddress.trim() || null;
          updateData.latitude = latitude || null;
          updateData.longitude = longitude || null;
          updateData.bedrooms = bedrooms?.toString() ?? (propertyType === 'Studio Apartment' ? '0' : null);
          updateData.bathrooms = bathrooms?.toString() ?? null;
          updateData.balconies = balconies?.toString() ?? null;
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

        if (!isLimitedEdit && allImages.length > 0) {
          updateData.images = allImages;
        }

        console.log('[AddProperty] Updating property via seller/properties/update.php', {
          ...updateData,
          images: updateData.images ? `[${updateData.images.length} images]` : 'not sent',
        });

        const response: any = await sellerService.updateProperty(propertyId, updateData);

        if (response && response.success) {
          Alert.alert(
            'Success',
            'Property updated successfully!',
            [{text: 'OK', onPress: () => navigation.goBack()}]
          );
        } else {
          const errorMessage =
            response?.message || response?.data?.message || response?.error?.message || 'Failed to update property';
          showError('Error', errorMessage);
        }
        setIsSubmitting(false);
        return;
      }

      // CREATE MODE: Collect valid images (approved or pending)
      // Support both Firebase URLs and base64 data
      const validImages = photos.filter(
        p => {
          const isValidStatus = p.moderationStatus === 'APPROVED' || p.moderationStatus === 'PENDING';
          const hasData = !!p.imageUrl || !!p.base64;
          
          if (!isValidStatus) {
            console.log('[AddProperty] Image filtered out - invalid status:', {
              status: p.moderationStatus,
              hasImageUrl: !!p.imageUrl,
              hasBase64: !!p.base64,
            });
          }
          if (!hasData) {
            console.log('[AddProperty] Image filtered out - no data:', {
              status: p.moderationStatus,
              hasImageUrl: !!p.imageUrl,
              hasBase64: !!p.base64,
            });
          }
          
          return isValidStatus && hasData;
        }
      );
      
      // Debug logging
      console.log('[AddProperty] All photos:', photos.map(p => ({
        hasUri: !!p.uri,
        moderationStatus: p.moderationStatus,
        hasBase64: !!p.base64,
        hasImageUrl: !!p.imageUrl,
        imageUrl: p.imageUrl?.substring(0, 50) || 'none',
        base64Length: p.base64?.length || 0,
      })));
      
      console.log('[AddProperty] Valid images count:', validImages.length, 'out of', photos.length);
      
      // Check if we have any valid images
      if (validImages.length === 0) {
        const checkingCount = photos.filter(p => p.moderationStatus === 'checking').length;
        const rejectedCount = photos.filter(p => p.moderationStatus === 'REJECTED').length;
        const noDataCount = photos.filter(p => 
          (p.moderationStatus === 'APPROVED' || p.moderationStatus === 'PENDING') && 
          !p.imageUrl && !p.base64
        ).length;
        
        let errorMessage = 'Please upload at least one image that has been approved or is pending review.';
        if (checkingCount > 0) {
          errorMessage = `Please wait for ${checkingCount} image(s) to finish validating before submitting.`;
        } else if (noDataCount > 0) {
          errorMessage = `${noDataCount} image(s) are missing data. Please remove and re-upload them.`;
        } else if (rejectedCount === photos.length) {
          errorMessage = 'All images were rejected. Please upload valid property images.';
        }
        
        console.error('[AddProperty] No valid images:', {
          total: photos.length,
          checking: checkingCount,
          rejected: rejectedCount,
          noData: noDataCount,
          valid: validImages.length,
        });
        
        showError('No Valid Images', errorMessage);
        setIsSubmitting(false);
        return;
      }
      
      // Check if any images are still being validated
      const checkingImages = photos.filter(p => p.moderationStatus === 'checking');
      if (checkingImages.length > 0) {
        Alert.alert(
          'Images Still Validating',
          `Please wait for ${checkingImages.length} image(s) to be validated before submitting.`,
          [{text: 'OK'}]
        );
        setIsSubmitting(false);
        return;
      }
      
      // Separate Firebase URLs and base64 strings
      const firebaseUrls: string[] = [];
      const imageBase64Strings: string[] = [];
      
      validImages.forEach((p, idx) => {
        if (p.imageUrl) {
          // Firebase URL - send directly (preferred)
          const url = p.imageUrl.trim();
          if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
            firebaseUrls.push(url);
            console.log(`[AddProperty] Image ${idx + 1}: Using Firebase URL`);
          } else {
            console.warn(`[AddProperty] Image ${idx + 1}: Invalid Firebase URL format:`, url.substring(0, 50));
          }
        } else if (p.base64) {
          // Base64 data - format and include (fallback)
          let base64 = p.base64.trim();
          
          // If it's already a data URI, validate format
          if (base64.startsWith('data:image/')) {
            // Check if it has the base64 part
            if (!base64.includes(';base64,')) {
              console.warn(`[AddProperty] Image ${idx + 1}: Invalid base64 format (missing ;base64,):`, base64.substring(0, 50));
              return;
            }
            imageBase64Strings.push(base64);
            console.log(`[AddProperty] Image ${idx + 1}: Using base64 data`);
          } else {
            // If it's raw base64, format it
            console.warn(`[AddProperty] Image ${idx + 1}: Base64 missing data URI prefix, adding default format`);
            imageBase64Strings.push(`data:image/jpeg;base64,${base64}`);
          }
        } else {
          console.error(`[AddProperty] Image ${idx + 1}: No imageUrl or base64 available!`, {
            status: p.moderationStatus,
            hasUri: !!p.uri,
          });
        }
      });
      
      // Check if we have any image data (Firebase URLs or base64)
      if (firebaseUrls.length === 0 && imageBase64Strings.length === 0) {
        console.error('[AddProperty] No image data available:', {
          validImagesCount: validImages.length,
          photosWithFirebaseUrl: validImages.filter(p => p.imageUrl).length,
          photosWithBase64: validImages.filter(p => p.base64).length,
          photoDetails: validImages.map(p => ({
            status: p.moderationStatus,
            hasImageUrl: !!p.imageUrl,
            hasBase64: !!p.base64,
            imageUrl: p.imageUrl?.substring(0, 50),
          })),
        });
        showError('Image Data Missing', 'Approved images are missing image data. Please try removing and re-uploading the images.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('[AddProperty] Total photos:', photos.length);
      console.log('[AddProperty] Valid images (approved/pending):', validImages.length);
      console.log('[AddProperty] Firebase URLs:', firebaseUrls.length);
      console.log('[AddProperty] Base64 images:', imageBase64Strings.length);

      // Property type is already in the correct format from guide
      const propertyData = {
        title: propertyTitle.trim(),
        status: propertyStatus, // 'sale' or 'rent'
        property_type: propertyType, // Already in guide format (e.g., 'Apartment', 'Villa / Banglow')
        location: location.trim(),
        state: state.trim(),
        additional_address: additionalAddress.trim() || null,
        latitude: latitude || null,
        longitude: longitude || null,
        bedrooms: bedrooms?.toString() || (propertyType === 'Studio Apartment' ? '0' : null),
        bathrooms: bathrooms?.toString() || null,
        balconies: balconies?.toString() || null,
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
        deposit_amount: propertyStatus === 'rent' && depositAmount ? parseFloat(depositAmount.replace(/[^0-9.]/g, '')) : null,
        maintenance_charges: maintenance ? parseFloat(maintenance.replace(/[^0-9.]/g, '')) : null,
        available_for_bachelors: propertyStatus === 'rent' && (propertyType === 'Apartment' || propertyType === 'PG / Hostel' || propertyType === 'Studio Apartment') ? availableForBachelors : undefined,
        amenities: selectedAmenities,
        // Send Firebase URLs if available, otherwise send base64 strings
        // Backend will handle both: Firebase URLs are already stored, base64 will be converted
        images: firebaseUrls.length > 0 ? firebaseUrls : (imageBase64Strings.length > 0 ? imageBase64Strings : undefined),
        // Also send a flag to indicate if using Firebase URLs
        use_firebase_urls: firebaseUrls.length > 0,
      };

      console.log('[AddProperty] Creating property with endpoint: /seller/properties/add.php');
      console.log('[AddProperty] Images included:', {
        firebaseUrls: firebaseUrls.length,
        base64: imageBase64Strings.length,
        total: firebaseUrls.length + imageBase64Strings.length,
        usingFirebase: firebaseUrls.length > 0,
      });
      console.log('[AddProperty] Property data:', JSON.stringify({
        ...propertyData, 
        images: firebaseUrls.length > 0 
          ? `[${firebaseUrls.length} Firebase URLs]`
          : `[${imageBase64Strings.length} base64 strings]`,
        imagesPreview: firebaseUrls.length > 0
          ? firebaseUrls.map(url => url.substring(0, 50) + '...')
          : imageBase64Strings.map(b => b.substring(0, 50) + '...'),
      }, null, 2));

      // Create property with images included in request (as per guide)
      // Use 'seller' userType to use correct endpoint
      const response: any = await propertyService.createProperty(propertyData, 'seller');
      
      console.log('[AddProperty] Property creation response:', JSON.stringify(response, null, 2));
      
      if (response && response.success) {
        // Property created successfully with images
        const imageCount = firebaseUrls.length + imageBase64Strings.length;
        const propertyData = response.data?.property || response.data;
        
        // Log returned property data to verify images were saved and backend conversion
        if (propertyData) {
          if (__DEV__) {
            console.log('[AddProperty] ✅ Property created with ID:', propertyData.id || propertyData.property_id);
          }
        }
        
        Alert.alert(
          '🎉 Property Published!',
          `Your property has been listed successfully!${imageCount > 0 ? `\n\n📸 ${imageCount} image(s) uploaded.` : ''}\n\n⏰ Important: You can fully edit your property for the next 24 hours.\n\nAfter 24 hours, you will only be able to change:\n• Title\n• Price\n• Location`,
          [{text: 'Got it!', onPress: () => navigation.goBack()}]
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
        Alert.alert('Error', errorMessage, [{text: 'OK'}]);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      let errorMessage = 'Failed to create property. Please try again.';
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
      Alert.alert('Error', errorMessage, [{text: 'OK'}]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    Alert.alert(
      'Cancel Listing',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        {text: 'Continue Editing', style: 'cancel'},
        {text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack()},
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
                placeholder="e.g., 3BHK Apartment with Sea View"
                placeholderTextColor={colors.textSecondary}
                value={propertyTitle}
                onChangeText={setPropertyTitle}
              />
            </View>

            {/* Lock non-pricing fields in limited edit mode */}
            <View
              style={styles.inputContainer}
              pointerEvents={isLimitedEdit ? 'none' : 'auto'}>
              <Text style={styles.label}>I want to <Text style={styles.required}>*</Text></Text>
              <View style={styles.typeButtonsContainer}>
                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => setPropertyStatus('sale')}>
                  {propertyStatus === 'sale' ? (
                    // @ts-expect-error - LinearGradient works but TypeScript types are incorrect
                    <LinearGradient
                      colors={['#0077C0', '#005A94']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.typeButtonGradient}>
                      <Text style={styles.typeButtonIcon}>🏷️</Text>
                      <Text style={styles.typeButtonTextSelected}>Sell</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.typeButtonUnselected}>
                      <Text style={styles.typeButtonIcon}>🏷️</Text>
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
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.typeButtonGradient}>
                      <Text style={styles.typeButtonIcon}>🔑</Text>
                      <Text style={styles.typeButtonTextSelected}>Rent</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.typeButtonUnselected}>
                      <Text style={styles.typeButtonIcon}>🔑</Text>
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
                    <Text style={styles.propertyTypeIcon}>{type.icon}</Text>
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
            </View>

            {/* Available for Bachelors - Basic Info step, only for rent + Apartment / PG / Studio */}
            {propertyStatus === 'rent' && (propertyType === 'Apartment' || propertyType === 'PG / Hostel' || propertyType === 'Studio Apartment') && (
              <View style={styles.inputContainer}>
                <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => setAvailableForBachelors(!availableForBachelors)}>
                  <View
                    style={[
                      styles.checkbox,
                      availableForBachelors && styles.checkboxChecked,
                    ]}>
                    {availableForBachelors && <Text style={styles.checkboxCheck}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>Available for bachelors</Text>
                </TouchableOpacity>
              </View>
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
                    if (locationData.coordinates) {
                      setLatitude(locationData.coordinates[1]);
                      setLongitude(locationData.coordinates[0]);
                    }
                    // Extract state from context if available
                    const extractedState = extractStateFromContext(locationData.context);
                    if (extractedState) {
                      setState(extractedState);
                    }
                  }}
                  visible={location.length >= 2 && !locationSelected}
                />
              </View>
              
              {/* Property Location on Map - Below Location Input */}
              <View style={styles.mapContainer}>
                <Text style={styles.mapLabel}>Property Location on Map (Optional)</Text>
                <TouchableOpacity 
                  style={styles.mapButton}
                  onPress={() => setLocationPickerVisible(true)}>
                  {/* @ts-expect-error - LinearGradient works but TypeScript types are incorrect */}
                  <LinearGradient
                    colors={['#0077C0', '#005A94']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.mapButtonGradient}>
                    <Text style={styles.mapButtonIcon}>📍</Text>
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
                  onChangeText={(text: string) => setState(text)}
                />
                <StateAutoSuggest
                  query={state}
                  onSelect={(stateData) => {
                    setState(stateData.name || stateData.placeName);
                  }}
                  visible={state.length >= 2}
                />
              </View>
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

            <LocationPicker
              visible={locationPickerVisible}
              initialLocation={latitude && longitude ? {latitude, longitude} : undefined}
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
                  setState(extractedState);
                }
                setLocationPickerVisible(false);
              }}
              onClose={() => setLocationPickerVisible(false)}
            />

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
                    {[1, 2, 3, 4, 5].map(num => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.numberButton,
                          bedrooms === num && styles.numberButtonActive,
                        ]}
                        onPress={() => setBedrooms(num)}>
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
                      onPress={() => setBedrooms(6)}>
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
                    onPress={() => setBathrooms(num)}>
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
                  onPress={() => setBathrooms(5)}>
                  <Text
                    style={[
                      styles.numberButtonText,
                      bathrooms === 5 && styles.numberButtonTextActive,
                    ]}>
                    4+
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            )}

            {fieldVisibility.showBalconies && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Balconies</Text>
              <View style={styles.numberButtonsContainer}>
                {[0, 1, 2, 3].map(num => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.numberButton,
                      balconies === num && styles.numberButtonActive,
                    ]}
                    onPress={() => setBalconies(num)}>
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
                  onPress={() => setBalconies(4)}>
                  <Text
                    style={[
                      styles.numberButtonText,
                      balconies === 4 && styles.numberButtonTextActive,
                    ]}>
                    3+
                  </Text>
                </TouchableOpacity>
              </View>
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
                  onChangeText={setBuiltUpArea}
                  keyboardType="numeric"
                />
                <Text style={styles.areaUnit}>sq.ft</Text>
              </View>
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
                    onChangeText={setCarpetArea}
                    keyboardType="numeric"
                  />
                  <Text style={styles.areaUnit}>sq.ft</Text>
                </View>
              </View>
            )}

            {fieldVisibility.showFloor && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Floor Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 5"
                  placeholderTextColor={colors.textSecondary}
                  value={floor}
                  onChangeText={(text: string) => setFloor(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
              </View>
            )}

            {fieldVisibility.showTotalFloors && (
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Total Floors</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Total floors in building"
                  placeholderTextColor={colors.textSecondary}
                  value={totalFloors}
                  onChangeText={(text: string) => setTotalFloors(text.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                />
              </View>
            )}

            <Dropdown
              label="Facing"
              placeholder="Select facing direction"
              required={true}
              options={[
                {label: 'North', value: 'North'},
                {label: 'South', value: 'South'},
                {label: 'East', value: 'East'},
                {label: 'West', value: 'West'},
                {label: 'North-East', value: 'North-East'},
                {label: 'North-West', value: 'North-West'},
                {label: 'South-East', value: 'South-East'},
                {label: 'South-West', value: 'South-West'},
              ]}
              value={facing}
              onSelect={setFacing}
            />

            {fieldVisibility.showAge && (
              <Dropdown
                label="Property Age"
                placeholder="Select property age"
                options={[
                  {label: 'New Construction', value: 'New Construction'},
                  {label: 'Less than 1 Year', value: 'Less than 1 Year'},
                  {label: '1-5 Years', value: '1-5 Years'},
                  {label: '5-10 Years', value: '5-10 Years'},
                  {label: '10+ Years', value: '10+ Years'},
                ]}
                value={propertyAge}
                onSelect={setPropertyAge}
              />
            )}

            {fieldVisibility.showFurnishing && (
              <Dropdown
                label="Furnishing"
                placeholder="Select furnishing status"
                required={false}
                options={[
                  {label: 'Unfurnished', value: 'Unfurnished'},
                  {label: 'Semi-Furnished', value: 'Semi-Furnished'},
                  {label: 'Fully-Furnished', value: 'Fully-Furnished'},
                ]}
                value={furnishing}
                onSelect={setFurnishing}
              />
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
                    onPress={() => toggleAmenity(amenity.id)}>
                    <Text style={styles.amenityIcon}>{amenity.icon}</Text>
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
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                Characters: {description.length}/1000 (min: 100)
              </Text>
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
          <View style={styles.stepContent} pointerEvents={isLimitedEdit ? 'none' : 'auto'}>
            <Text style={styles.stepTitle}>Upload Photos</Text>
            <Text style={styles.stepSubtitle}>
              Add up to 10 high-quality photos of your property
            </Text>

            <TouchableOpacity 
              style={styles.photoUploadArea}
              onPress={handleImagePicker}
              activeOpacity={0.7}>
              <Text style={styles.photoUploadIcon}>📤</Text>
              <Text style={styles.photoUploadText}>Tap to select photos from gallery</Text>
              <Text style={styles.photoUploadSubtext}>
                Select up to {10 - photos.length} more photos
              </Text>
              <Text style={styles.photoUploadHint}>
                Supports: JPG, PNG, WEBP (Max 5MB each)
              </Text>
            </TouchableOpacity>

            {photos.length > 0 && (
              <View style={styles.photosPreview}>
                {photos.map((photo, index) => {
                  const statusColor = 
                    photo.moderationStatus === 'APPROVED' ? '#4CAF50' :
                    photo.moderationStatus === 'REJECTED' ? colors.error :
                    photo.moderationStatus === 'PENDING' ? '#FF9800' :
                    photo.moderationStatus === 'checking' ? colors.textSecondary :
                    'transparent';
                  
                  const statusText = 
                    photo.moderationStatus === 'APPROVED' ? '✓' :
                    photo.moderationStatus === 'REJECTED' ? '✗' :
                    photo.moderationStatus === 'PENDING' ? '⏳' :
                    photo.moderationStatus === 'checking' ? '...' :
                    '';
                  
                  return (
                    <View key={index} style={styles.photoPreviewItem}>
                      <Image source={{uri: photo.uri}} style={styles.photoPreviewImage} />
                      {photo.moderationStatus && (
                        <View style={[styles.moderationBadge, {backgroundColor: statusColor}]}>
                          <Text style={styles.moderationBadgeText}>{statusText}</Text>
                        </View>
                      )}
                      {photo.moderationReason && photo.moderationStatus === 'REJECTED' && (
                        <View style={styles.reasonBadge}>
                          <Text style={styles.reasonText} numberOfLines={1}>
                            {photo.moderationReason}
                          </Text>
                        </View>
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
                {propertyStatus === 'sale' ? 'Expected Price' : 'Monthly Rent'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder={propertyStatus === 'sale' ? 'Enter expected price' : 'Enter monthly rent'}
                  placeholderTextColor={colors.textSecondary}
                  value={expectedPrice}
                  onChangeText={setExpectedPrice}
                  keyboardType="numeric"
                />
              </View>
              {expectedPrice.trim().length > 0 && (
                <Text style={styles.hintText}>
                  {formatters.price(parseFloat(expectedPrice.replace(/[^0-9.]/g, '')) || 0, propertyStatus === 'rent')}
                </Text>
              )}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setPriceNegotiable(!priceNegotiable)}>
                <View
                  style={[
                    styles.checkbox,
                    priceNegotiable && styles.checkboxChecked,
                  ]}>
                  {priceNegotiable && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Price is negotiable</Text>
              </TouchableOpacity>
            </View>

            {propertyStatus === 'rent' && (
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
                {depositAmount.trim().length > 0 && (
                  <Text style={styles.hintText}>
                    {formatters.price(parseFloat(depositAmount.replace(/[^0-9.]/g, '')) || 0, true)} deposit
                  </Text>
                )}
              </View>
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
              {maintenance.trim().length > 0 && (
                <Text style={styles.hintText}>
                  {formatters.price(parseFloat(maintenance.replace(/[^0-9.]/g, '')) || 0, true)} per month
                </Text>
              )}
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

  // Show loading while checking property limit or loading property data
  if (checkingLimit || loadingProperty) {
    return (
      <View style={styles.screenContainer}>
        <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
          <View style={[styles.safeArea, styles.loadingContainer]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>
              {loadingProperty ? 'Loading property details...' : 'Checking property limit...'}
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <SafeAreaView edges={['top', 'bottom', 'left', 'right']}>
        <View style={styles.safeArea}>
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
              <Text style={styles.headerTitle}>List Your Property</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Steps */}
            <View style={styles.progressContainer}>
              {steps.map((step, index) => {
                const status = getStepStatus(step.id);
                return (
                  <View key={step.id} style={styles.stepItem}>
                    <View
                      style={[
                        styles.stepCircle,
                        status === 'completed' && styles.stepCircleCompleted,
                        status === 'active' && styles.stepCircleActive,
                      ]}>
                      {status === 'completed' ? (
                        <Text style={styles.stepCheckmark}>✓</Text>
                      ) : (
                        <Text style={styles.stepIcon}>{step.icon}</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        status === 'completed' && styles.stepLabelCompleted,
                        status === 'active' && styles.stepLabelActive,
                      ]}>
                      {step.name}
                    </Text>
                    {index < steps.length - 1 && (
                      <View
                        style={[
                          styles.stepLine,
                          status === 'completed' && styles.stepLineCompleted,
                          status === 'active' && styles.stepLineActive,
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>

            {/* Content */}
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentContainer}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled">
              {renderStepContent()}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.backButton} onPress={handlePrevious}>
                  <Text style={styles.backButtonIcon}>←</Text>
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
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.publishButtonGradient}>
                    <Text style={styles.publishButtonIcon}>{isSubmitting ? '⏳' : '✓'}</Text>
                    <Text style={styles.publishButtonText}>
                      {isSubmitting ? 'Submitting...' : 'Publish Listing'}
                    </Text>
                  </LinearGradient>
                ) : (
                  // @ts-expect-error - LinearGradient works but TypeScript types are incorrect
                  <LinearGradient
                    colors={['#0077C0', '#005A94']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.nextButtonGradient}>
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Text style={styles.nextButtonArrow}>→</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
            </View>
        </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FAFAFA',
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
    minHeight: 64,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitle: {
    fontSize: 20,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleCompleted: {
    backgroundColor: '#10B981',
  },
  stepCircleActive: {
    backgroundColor: colors.primary,
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
    color: '#9CA3AF',
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelCompleted: {
    color: '#10B981',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  stepLine: {
    position: 'absolute',
    top: 24,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: '#E5E7EB',
    zIndex: -1,
  },
  stepLineCompleted: {
    backgroundColor: '#10B981',
  },
  stepLineActive: {
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  contentContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  stepContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  stepTitle: {
    fontSize: 22,
    color: '#1D242B', // Dark Charcoal
    marginBottom: spacing.xs,
    fontWeight: '700',
  },
  stepSubtitle: {
    ...typography.body,
    color: '#6B7280',
    marginBottom: spacing.xl,
    fontSize: 14,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: '#374151',
    marginBottom: spacing.sm,
    fontWeight: '600',
    fontSize: 14,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md - 2,
    ...typography.body,
    color: colors.text,
    fontSize: 15,
    minHeight: 50,
    marginTop: spacing.xs,
  },
  inputFocused: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputError: {
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  textArea: {
    height: 120,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  charCount: {
    ...typography.caption,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: spacing.xs,
    fontSize: 12,
    fontWeight: '500',
  },
  charCountWarning: {
    color: '#F59E0B',
  },
  charCountError: {
    color: '#EF4444',
  },
  errorText: {
    ...typography.caption,
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  errorIcon: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  typeButtonsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 60,
  },
  typeButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  typeButtonGradient: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    minHeight: 48,
    gap: spacing.xs,
  },
  typeButtonUnselected: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    minHeight: 48,
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
    gap: spacing.sm,
  },
  propertyTypeButton: {
    width: '48%',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    marginBottom: spacing.xs,
  },
  propertyTypeButtonActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#E3F6FF', // Light blue
  },
  propertyTypeIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
  },
  propertyTypeText: {
    ...typography.body,
    color: '#374151',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  propertyTypeTextActive: {
    color: colors.primary,
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
  numberButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  numberButton: {
    width: 56,
    height: 46,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberButtonActive: {
    backgroundColor: colors.primary,
  },
  numberButtonText: {
    ...typography.body,
    color: '#374151',
    fontSize: 15,
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
    backgroundColor: '#F5F5F5',
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
    marginTop: spacing.md,
    marginHorizontal: -spacing.xs, // Negative margin to account for item margins
  },
  amenityButton: {
    width: '31%', // 3 columns with gaps
    marginHorizontal: '1%',
    marginBottom: spacing.sm,
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  amenityButtonActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#E3F6FF',
  },
  amenityIcon: {
    fontSize: 26,
    marginBottom: spacing.xs + 2,
  },
  amenityText: {
    ...typography.caption,
    color: '#374151',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
  amenityTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  photoUploadArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 160,
    backgroundColor: '#F9F5FF', // Light purple tint
  },
  photoUploadIcon: {
    fontSize: 40,
    marginBottom: spacing.md,
  },
  photoUploadText: {
    ...typography.body,
    color: '#1D242B', // Dark Charcoal
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  photoUploadSubtext: {
    ...typography.body,
    color: '#6B7280',
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  photoUploadHint: {
    ...typography.caption,
    color: '#9CA3AF',
    fontSize: 12,
  },
  photosPreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  photoPreviewItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  photoPreviewImage: {
    width: '100%',
    height: '100%',
  },
  moderationBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 24,
    alignItems: 'center',
  },
  moderationBadgeText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '700',
  },
  reasonBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    padding: 4,
  },
  reasonText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 9,
  },
  photoRemoveButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingLeft: spacing.md,
    minHeight: 48,
    marginTop: spacing.xs,
  },
  priceInputContainerFocused: {
    borderColor: '#0077C0',
    backgroundColor: colors.surface,
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
    backgroundColor: '#E3F6FF', // Light blue
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryButtonText: {
    ...typography.body,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  listingSummary: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    color: '#1D242B', // Dark Charcoal
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  summaryLabel: {
    ...typography.body,
    color: '#6B7280',
    fontSize: 13,
  },
  summaryValue: {
    ...typography.body,
    color: '#374151',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 4,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    gap: spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
  },
  backButtonIcon: {
    ...typography.body,
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  backButtonText: {
    ...typography.body,
    color: '#374151',
    fontWeight: '500',
    fontSize: 14,
  },
  cancelButton: {
    paddingVertical: spacing.sm + 4,
    paddingHorizontal: spacing.lg,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    ...typography.body,
    color: '#DC2626',
    fontWeight: '600',
    fontSize: 14,
  },
  nextButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    minHeight: 50,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.6,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
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
    paddingVertical: spacing.md + 2,
    gap: spacing.sm,
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
  locationInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  stateInputContainer: {
    position: 'relative',
    zIndex: 1,
  },
  coordinateText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontFamily: 'monospace',
    fontSize: 11,
  },
  studioButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  studioButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  hintText: {
    ...typography.caption,
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: spacing.xs,
  },
});

export default AddPropertyScreen;
