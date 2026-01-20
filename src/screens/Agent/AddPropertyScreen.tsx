import React, {useState, useMemo, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  Image,
  Platform,
  PermissionsAndroid,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useRoute, RouteProp} from '@react-navigation/native';
import {launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {AgentTabParamList} from '../../components/navigation/AgentTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
import Dropdown from '../../components/common/Dropdown';
import {propertyService} from '../../services/property.service';
import {moderationService} from '../../services/moderation.service';
import {sellerService} from '../../services/seller.service';
import LocationPicker from '../../components/map/LocationPicker';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import StateAutoSuggest from '../../components/search/StateAutoSuggest';
import {extractStateFromContext} from '../../utils/geocoding';
import {
  GuidePropertyType,
  getPropertyTypeConfig,
  getAvailableAmenitiesForPropertyType,
  PROPERTY_TYPES,
  AMENITIES_LIST,
} from '../../utils/propertyTypeConfig';

type AddPropertyScreenNavigationProp = BottomTabNavigationProp<
  AgentTabParamList,
  'AddProperty'
>;

type Props = {
  navigation: AddPropertyScreenNavigationProp;
};

type PropertyStatus = 'sell' | 'rent';

const AddPropertyScreen: React.FC<Props> = ({navigation}) => {
  const route = useRoute<RouteProp<AgentTabParamList, 'AddProperty'>>();
  const routeParams = (route.params as any) || {};
  const isEditMode = !!routeParams.propertyId;
  const isLimitedEdit = !!routeParams.isLimitedEdit;
  const propertyId = routeParams.propertyId;
  const createdAt = routeParams.createdAt;
  const [loadingProperty, setLoadingProperty] = useState(isEditMode);
  
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyStatus, setPropertyStatus] = useState<PropertyStatus>('sell');
  const [propertyType, setPropertyType] = useState<GuidePropertyType | ''>('');
  const [location, setLocation] = useState('');
  const [locationSelected, setLocationSelected] = useState(false);
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
  const [photos, setPhotos] = useState<Array<{uri: string; base64?: string; moderationStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking'; moderationReason?: string; imageUrl?: string}>>([]);
  const [expectedPrice, setExpectedPrice] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [maintenance, setMaintenance] = useState('');

  const totalSteps = 5;
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
  const isPropertyOlderThan24Hours = (createdAtDate?: string | Date): boolean => {
    if (!createdAtDate) return false;
    const now = new Date();
    const created = typeof createdAtDate === 'string' ? new Date(createdAtDate) : createdAtDate;
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
          Alert.alert('Error', 'Failed to load property details');
          navigation.goBack();
        }
      } catch (error: any) {
        console.error('Error loading property:', error);
        Alert.alert('Error', error.message || 'Failed to load property details');
        navigation.goBack();
      } finally {
        setLoadingProperty(false);
      }
    };

    loadPropertyData();
  }, [isEditMode, propertyId, navigation]);

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

  const handleImagePicker = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant photo access permission');
      return;
    }

    if (photos.length >= 10) {
      Alert.alert('Limit Reached', 'You can upload maximum 10 photos');
      return;
    }

    const options = {
      mediaType: 'photo' as MediaType,
      quality: 0.8 as const,
      selectionLimit: 10 - photos.length,
      includeBase64: true,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick image');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const maxPhotos = 10;
        const remainingSlots = maxPhotos - photos.length;
        const assetsToAdd = response.assets.slice(0, remainingSlots);
        
        if (photos.length + assetsToAdd.length > maxPhotos) {
          Alert.alert('Limit Reached', 'You can upload maximum 10 photos');
          return;
        }

        // Add images with "checking" status and validate with Google Vision API
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
        
        // Process moderation for each image via Google Vision API
        newPhotos.forEach((img, index) => {
          if (img.uri) {
            // In edit mode, upload with propertyId; in create mode, validate only
            const uploadPropertyId = isEditMode && propertyId ? Number(propertyId) : 0;
            const validateOnly = !isEditMode || !propertyId;
            
            moderationService.uploadWithModeration(img.uri, uploadPropertyId, validateOnly)
              .then(result => {
                setPhotos(prev => {
                  const updated = [...prev];
                  const imgIndex = prev.length - newPhotos.length + index;
                  if (updated[imgIndex]) {
                    let moderationStatus: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking' = 'checking';
                    
                    if (result.status === 'approved' || result.moderation_status === 'SAFE') {
                      moderationStatus = 'APPROVED';
                    } else if (result.status === 'rejected' || result.moderation_status === 'REJECTED' || result.moderation_status === 'UNSAFE') {
                      moderationStatus = 'REJECTED';
                    } else if (result.status === 'pending' || result.moderation_status === 'PENDING' || (result.moderation_status as string) === 'NEEDS_REVIEW') {
                      moderationStatus = 'PENDING';
                    }
                    
                    updated[imgIndex] = {
                      ...updated[imgIndex],
                      moderationStatus,
                      moderationReason: result.moderation_reason,
                      imageUrl: result.image_url || updated[imgIndex].imageUrl || undefined,
                    };
                    
                    if (moderationStatus === 'REJECTED') {
                      Alert.alert(
                        'Image Rejected',
                        result.moderation_reason || 'Image does not meet our guidelines. Please upload property images only.',
                        [{text: 'OK'}]
                      );
                    } else if (moderationStatus === 'PENDING') {
                      Alert.alert(
                        'Image Under Review',
                        'Your image is being reviewed and will be visible after approval.',
                        [{text: 'OK'}]
                      );
                    }
                  }
                  return updated;
                });
              })
              .catch(error => {
                console.error('[AddProperty] Moderation error:', error);
                setPhotos(prev => {
                  const updated = [...prev];
                  const imgIndex = prev.length - newPhotos.length + index;
                  if (updated[imgIndex]) {
                    updated[imgIndex] = {
                      ...updated[imgIndex],
                      moderationStatus: 'REJECTED' as const,
                      moderationReason: error.message || 'Failed to verify image',
                    };
                  }
                  return updated;
                });
                Alert.alert(
                  'Upload Failed',
                  error.message || 'Failed to upload image. Please try again.',
                  [{text: 'OK'}]
                );
              });
          }
        });
        
        console.log('[AddProperty] Added', newPhotos.length, 'images (validating with Google Vision API)');
      }
    });
  };

  const handleNext = () => {
    // Validation
    if (currentStep === 1) {
      if (!propertyTitle.trim()) {
        Alert.alert('Error', 'Please enter property title');
        return;
      }
      if (!propertyType) {
        Alert.alert('Error', 'Please select property type');
        return;
      }
      if (propertyTitle.length > 255) {
        Alert.alert('Error', 'Title must be less than 255 characters');
        return;
      }
    }
    if (currentStep === 2) {
      if (!location.trim()) {
        Alert.alert('Error', 'Please enter location');
        return;
      }
      if (!state.trim()) {
        Alert.alert('Error', 'Please enter state');
        return;
      }
      if (fieldVisibility.showFacing && !facing) {
        Alert.alert('Error', 'Please select facing direction');
        return;
      }
      if (fieldVisibility.bedroomsRequired && bedrooms === null && propertyType !== 'Studio Apartment') {
        Alert.alert('Error', 'Please select number of bedrooms');
        return;
      }
      if (fieldVisibility.bathroomsRequired && bathrooms === null) {
        Alert.alert('Error', 'Please select number of bathrooms');
        return;
      }
      if (!builtUpArea.trim()) {
        Alert.alert('Error', `Please enter ${fieldVisibility.areaLabel}`);
        return;
      }
    }
    if (currentStep === 3) {
      if (!description.trim()) {
        Alert.alert('Error', 'Please enter property description');
        return;
      }
      if (description.length < 100) {
        Alert.alert('Error', 'Description must be at least 100 characters');
        return;
      }
      if (description.trim().length > 1000) {
        Alert.alert('Error', 'Description cannot exceed 1000 characters');
        return;
      }
      // Check for mobile numbers (Indian format: 10 digits, may have +91)
      const mobileRegex = /(\+91[\s-]?)?[6-9]\d{9}/g;
      if (mobileRegex.test(description)) {
        Alert.alert('Error', 'Description cannot contain mobile numbers');
        return;
      }
      // Check for email addresses
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      if (emailRegex.test(description)) {
        Alert.alert('Error', 'Description cannot contain email addresses');
        return;
      }
    }
    if (currentStep === 5) {
      if (!expectedPrice.trim()) {
        Alert.alert('Error', propertyStatus === 'sell' ? 'Please enter expected price' : 'Please enter monthly rent');
        return;
      }
      const priceValue = parseFloat(expectedPrice.replace(/[^0-9.]/g, ''));
      if (isNaN(priceValue) || priceValue <= 0) {
        Alert.alert('Error', 'Price must be a positive number');
        return;
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
        const updateData: any = {};
        
        // Always allowed fields
        updateData.title = propertyTitle.trim();
        updateData.price = parseFloat(expectedPrice.replace(/[^0-9.]/g, '')) || 0;
        updateData.price_negotiable = priceNegotiable;
        updateData.maintenance_charges = maintenance ? parseFloat(maintenance.replace(/[^0-9.]/g, '')) : null;
        if (propertyStatus === 'rent' && depositAmount) {
          updateData.deposit_amount = parseFloat(depositAmount.replace(/[^0-9.]/g, ''));
        }
        
        // Only include other fields if not in limited edit mode
        if (!isLimitedEdit) {
          updateData.status = propertyStatus === 'sell' ? 'sale' : 'rent';
          updateData.property_type = propertyType;
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
            [{text: 'OK', onPress: () => navigation.goBack()}]
          );
        } else {
          const errorMessage = response?.message || response?.error?.message || 'Failed to update property';
          console.error('[AddProperty] Property update failed:', errorMessage);
          Alert.alert('Error', errorMessage);
        }
      } else {
        // CREATE MODE: Create new property
        // Collect base64 for approved/pending images (Google Vision API moderated)
        const validImages = photos.filter(
          p =>
            (p.moderationStatus === 'APPROVED' || p.moderationStatus === 'PENDING') &&
            !!p.base64
        );
        
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
        
        if (validImages.length === 0) {
          Alert.alert(
            'No Valid Images',
            'Please upload at least one image that has been approved or is pending review.',
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
        
        if (imageBase64Strings.length === 0) {
          Alert.alert(
            'Image Data Missing',
            'Approved images are missing image data. Please try removing and re-uploading the images.',
            [{text: 'OK'}]
          );
          setIsSubmitting(false);
          return;
        }
        
        console.log('[AddProperty] Total photos:', photos.length, 'Valid (approved/pending):', validImages.length, 'Base64 ready:', imageBase64Strings.length);

        // Property type is already in the correct format from guide
        const propertyData = {
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
          // Include images as base64 strings in the request
          images: imageBase64Strings.length > 0 ? imageBase64Strings : undefined,
        };

        console.log('[AddProperty] Creating property with endpoint: /seller/properties/add.php');
        console.log('[AddProperty] Images included as base64:', imageBase64Strings.length);

        // Same endpoint as seller; backend skips property limit for agents
        const response: any = await propertyService.createProperty(propertyData, 'agent');
        
        if (response && response.success) {
          const imageCount = imageBase64Strings.length;
          Alert.alert(
            'Success', 
            `Property listed successfully!${imageCount > 0 ? ` ${imageCount} image(s) included.` : ''}`, 
            [{text: 'OK', onPress: () => navigation.goBack()}]
          );
        } else {
          const errorMessage = response?.message || response?.error?.message || 'Failed to create property';
          console.error('[AddProperty] Property creation failed:', errorMessage);
          Alert.alert('Error', errorMessage);
        }
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.response?.data?.message || (isEditMode ? 'Failed to update property. Please try again.' : 'Failed to create property. Please try again.'));
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
                placeholder="e.g., Spacious 3BHK Apartment with Sea View"
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
                  onPress={() => setPropertyStatus('sell')}>
                  {propertyStatus === 'sell' ? (
                    <LinearGradient
                      colors={['#8B5CF6', '#6D28D9']}
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
                    <LinearGradient
                      colors={['#8B5CF6', '#6D28D9']}
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
                  <LinearGradient
                    colors={['#8B5CF6', '#6D28D9']}
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
                  onChangeText={setState}
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
                  placeholder="e.g., 5 or Ground"
                  placeholderTextColor={colors.textSecondary}
                  value={floor}
                  onChangeText={setFloor}
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
                  onChangeText={setTotalFloors}
                  keyboardType="numeric"
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
          <View style={styles.stepContent}>
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
                {propertyStatus === 'sell' ? 'Expected Price' : 'Monthly Rent'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder={propertyStatus === 'sell' ? 'Enter expected price' : 'Enter monthly rent'}
                  placeholderTextColor={colors.textSecondary}
                  value={expectedPrice}
                  onChangeText={setExpectedPrice}
                  keyboardType="numeric"
                />
              </View>
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

  // Show loading while loading property data
  if (loadingProperty) {
    return (
      <Modal
        visible={true}
        animationType="fade"
        transparent={true}
        onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
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
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.safeArea}>
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
              showsVerticalScrollIndicator={false}>
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
                  <LinearGradient
                    colors={['#8B5CF6', '#6D28D9']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.nextButtonGradient}>
                    <Text style={styles.nextButtonText}>Next</Text>
                    <Text style={styles.nextButtonArrow}>→</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
    position: 'relative',
  },
  stepCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  stepCircleCompleted: {
    backgroundColor: '#43A047',
  },
  stepCircleActive: {
    backgroundColor: '#8B5CF6',
  },
  stepIcon: {
    fontSize: 20,
  },
  stepCheckmark: {
    fontSize: 24,
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
    color: '#8B5CF6',
    fontWeight: '700',
  },
  stepLine: {
    position: 'absolute',
    top: 24,
    left: '60%',
    right: '-40%',
    height: 2,
    backgroundColor: colors.border,
    zIndex: -1,
  },
  stepLineCompleted: {
    backgroundColor: '#43A047',
  },
  stepLineActive: {
    backgroundColor: '#8B5CF6',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: spacing.xl,
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
    borderColor: '#8B5CF6',
    borderWidth: 2,
    backgroundColor: '#F3F0FF',
  },
  propertyTypeIcon: {
    fontSize: 32,
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
    color: '#8B5CF6',
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
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
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
    justifyContent: 'flex-start',
    marginTop: spacing.sm,
    marginHorizontal: -spacing.xs, // Negative margin for spacing
  },
  amenityButton: {
    width: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 4) / 3, // Responsive width for 3 columns
    minWidth: 90, // Minimum width for small screens
    maxWidth: (SCREEN_WIDTH - spacing.lg * 2 - spacing.xs * 4) / 3, // Max width same as width
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
    marginHorizontal: spacing.xs / 2, // Half margin on each side
    marginBottom: spacing.md, // Bottom margin for wrapping
  },
  amenityButtonActive: {
    borderColor: '#8B5CF6',
    borderWidth: 2,
    backgroundColor: '#F3F0FF',
  },
  amenityIcon: {
    fontSize: 24,
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
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    backgroundColor: '#FAFAFA',
  },
  photoUploadIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  photoUploadText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  photoUploadSubtext: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  photoUploadHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
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
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
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
    backgroundColor: '#F3F0FF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryButtonText: {
    ...typography.body,
    color: '#8B5CF6',
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
  progressContainerScroll: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 100,
  },
  progressContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
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
