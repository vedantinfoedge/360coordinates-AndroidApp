import React, {useState, useMemo, useEffect, useRef} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Modal,
  SafeAreaView,
  Image,
  Platform,
  PermissionsAndroid,
  ActivityIndicator,
} from 'react-native';
import {launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {BottomTabNavigationProp, useRoute} from '@react-navigation/bottom-tabs';
import {AgentTabParamList} from '../../components/navigation/AgentTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import Dropdown from '../../components/common/Dropdown';
import {propertyService} from '../../services/property.service';
import {moderationService} from '../../services/moderation.service';
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
import {useAuth} from '../../context/AuthContext';
import {formatters} from '../../utils/formatters';

type AddPropertyScreenNavigationProp = BottomTabNavigationProp<
  AgentTabParamList,
  'AddProperty'
>;

type Props = {
  navigation: AddPropertyScreenNavigationProp;
};

type PropertyStatus = 'sell' | 'rent';

// Project Type Options
const PROJECT_TYPES = [
  {id: 'apartment', label: 'Apartment', icon: '🏢'},
  {id: 'villa', label: 'Villa', icon: '🏡'},
  {id: 'plot', label: 'Plot', icon: '📐'},
  {id: 'commercial', label: 'Commercial', icon: '🏢'},
];

// Project Status Options
const PROJECT_STATUSES = [
  {label: 'UNDER CONSTRUCTION', value: 'UNDER CONSTRUCTION'},
  {label: 'PRE-LAUNCH', value: 'PRE-LAUNCH'},
  {label: 'COMPLETED', value: 'COMPLETED'},
];

// Configuration Options
const CONFIGURATIONS = [
  {id: '1bhk', label: '1 BHK'},
  {id: '2bhk', label: '2 BHK'},
  {id: '3bhk', label: '3 BHK'},
  {id: '4bhk', label: '4 BHK'},
  {id: '5bhk', label: '5+ BHK'},
  {id: 'villa', label: 'Villa'},
  {id: 'plot', label: 'Plot'},
];

// Amenities Options (for projects)
const PROJECT_AMENITIES = [
  {id: 'lift', label: 'Lift', icon: '🛗'},
  {id: 'parking', label: 'Parking', icon: '🚗'},
  {id: 'power_backup', label: 'Power Backup', icon: '⚡'},
  {id: 'garden', label: 'Garden / Open Space', icon: '🌳'},
  {id: 'gym', label: 'Gym', icon: '🏋️'},
  {id: 'swimming_pool', label: 'Swimming Pool', icon: '🏊'},
  {id: 'play_area', label: 'Children Play Area', icon: '🎢'},
  {id: 'club_house', label: 'Club House', icon: '🏛️'},
  {id: 'security', label: 'Security / CCTV', icon: '👮'},
];

// Bank Options
const BANKS = [
  {id: 'sbi', label: 'SBI'},
  {id: 'hdfc', label: 'HDFC Bank'},
  {id: 'kotak', label: 'Kotak Mahindra Bank'},
  {id: 'icici', label: 'ICICI Bank'},
  {id: 'axis', label: 'Axis Bank'},
  {id: 'bob', label: 'Bank of Baroda (BoB)'},
  {id: 'other', label: 'Other'},
];

const AddPropertyScreen: React.FC<Props> = ({navigation}) => {
  const route = useRoute();
  const {user} = useAuth();
  const routeParams = route.params as {isUpcomingProject?: boolean} | undefined;
  const isUpcomingProject = routeParams?.isUpcomingProject === true;
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

  // Project form state variables
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: Basic Project Information
  const [projectName, setProjectName] = useState('');
  const [projectType, setProjectType] = useState('');
  const [projectStatus, setProjectStatus] = useState('UNDER CONSTRUCTION');
  const [reraNumber, setReraNumber] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [stateAutoFilled, setStateAutoFilled] = useState(false);
  const [pincode, setPincode] = useState('');
  
  // Step 3: Configuration & Inventory
  const [selectedConfigurations, setSelectedConfigurations] = useState<string[]>([]);
  const [carpetAreaRange, setCarpetAreaRange] = useState('');
  const [numberOfTowers, setNumberOfTowers] = useState('');
  const [totalUnits, setTotalUnits] = useState('');
  const [floorsCount, setFloorsCount] = useState('');
  
  // Step 4: Pricing & Timeline
  const [startingPrice, setStartingPrice] = useState('');
  const [pricePerSqft, setPricePerSqft] = useState('');
  const [bookingAmount, setBookingAmount] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [possessionDate, setPossessionDate] = useState('');
  
  // Step 5: Amenities (for projects)
  const [selectedProjectAmenities, setSelectedProjectAmenities] = useState<string[]>([]);
  
  // Step 6: Legal & Approval
  const [reraStatus, setReraStatus] = useState('');
  const [landOwnershipType, setLandOwnershipType] = useState('');
  const [bankApproved, setBankApproved] = useState('');
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [otherBankNames, setOtherBankNames] = useState('');
  
  // Step 7: Media Uploads
  const [coverImage, setCoverImage] = useState<{uri: string; base64?: string} | null>(null);
  const [projectImages, setProjectImages] = useState<Array<{
    uri: string;
    base64?: string;
    moderationStatus?: 'checking' | 'APPROVED' | 'REJECTED' | 'PENDING';
    moderationReason?: string;
    imageUrl?: string;
  }>>([]);
  const [floorPlans, setFloorPlans] = useState<Array<{uri: string; name: string}>>([]);
  const [brochure, setBrochure] = useState<{uri: string; name: string} | null>(null);
  const [masterPlan, setMasterPlan] = useState<{uri: string; base64?: string} | null>(null);
  
  // Step 8: Contact & Sales
  const [salesName, setSalesName] = useState('');
  const [salesNumber, setSalesNumber] = useState('');
  const [emailId, setEmailId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [alternativeNumber, setAlternativeNumber] = useState('');
  
  // Step 9: Marketing Highlights
  const [projectHighlights, setProjectHighlights] = useState('');
  const [usp, setUsp] = useState('');

  const totalSteps = isUpcomingProject ? 10 : 5;
  const steps = isUpcomingProject ? [
    {id: 1, name: 'Basic Info', icon: '📝'},
    {id: 2, name: 'Location', icon: '📍'},
    {id: 3, name: 'Config', icon: '🏗️'},
    {id: 4, name: 'Pricing', icon: '💰'},
    {id: 5, name: 'Amenities', icon: '✨'},
    {id: 6, name: 'Legal', icon: '📋'},
    {id: 7, name: 'Media', icon: '📷'},
    {id: 8, name: 'Contact', icon: '📞'},
    {id: 9, name: 'Marketing', icon: '📢'},
    {id: 10, name: 'Preview', icon: '👁️'},
  ] : [
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
      includeBase64: true, // Enable base64 for direct upload without moderation
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

        // Auto-approve all images and convert to base64 format
        // Skip moderation for now as per user request
        const newPhotos = assetsToAdd.map(asset => {
          // Get base64 string (format: "data:image/jpeg;base64,/9j/4AAQSkZJRg...")
          const imageType = asset.type || 'jpeg';
          const base64String = asset.base64 
            ? `data:image/${imageType};base64,${asset.base64}` 
            : undefined;
          
          return {
            uri: asset.uri || '',
            base64: base64String,
            moderationStatus: 'APPROVED' as const, // Auto-approve for now
            moderationReason: undefined,
            imageUrl: undefined, // We'll use base64 instead
          };
        });
        
        const updatedPhotos = [...photos, ...newPhotos];
        setPhotos(updatedPhotos);
        
        console.log('[AddProperty] Added', newPhotos.length, 'images (auto-approved, base64 ready)');
      }
    });
  };

  const handleNext = () => {
    if (isUpcomingProject) {
      if (!validateProjectStep(currentStep)) {
        return;
      }
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmit();
      }
      return;
    }
    
    // Validation for regular property form
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

  // Project form helper functions
  const formatPriceInput = (value: string): number => {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    if (value.toLowerCase().includes('lakh') || value.toLowerCase().includes('l')) {
      const num = parseFloat(cleaned) || 0;
      return num * 100000;
    }
    if (value.toLowerCase().includes('crore') || value.toLowerCase().includes('cr')) {
      const num = parseFloat(cleaned) || 0;
      return num * 10000000;
    }
    return parseFloat(cleaned) || 0;
  };

  const handleLocationSelect = (locationData: any) => {
    setLocation(locationData.placeName || locationData.name);
    setLocationQuery(locationData.placeName || locationData.name);
    setShowLocationSuggestions(false);
    
    const extractedState = extractStateFromContext(locationData.context);
    if (extractedState) {
      setState(extractedState);
      setStateAutoFilled(true);
    }
    
    if (locationData.coordinates) {
      setLongitude(locationData.coordinates[0]);
      setLatitude(locationData.coordinates[1]);
    }
    
    const cityContext = locationData.context?.find((ctx: any) => 
      ctx.id?.startsWith('place')
    );
    if (cityContext) {
      setCity(cityContext.text || '');
      setArea(cityContext.text || '');
    }
  };

  const handleProjectImagesUpload = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert('Permission Denied', 'Please grant photo access permission');
      return;
    }

    if (projectImages.length >= 20) {
      Alert.alert('Limit Reached', 'You can upload maximum 20 images');
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
        Alert.alert('Error', response.errorMessage || 'Failed to pick image');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const remainingSlots = 20 - projectImages.length;
        const assetsToAdd = response.assets.slice(0, remainingSlots);
        
        const newImages = assetsToAdd.map(asset => ({
          uri: asset.uri || '',
          base64: asset.base64 ? `data:image/${asset.type || 'jpeg'};base64,${asset.base64}` : undefined,
          moderationStatus: 'checking' as const,
        }));
        
        setProjectImages(prev => [...prev, ...newImages]);
        
        newImages.forEach((img, index) => {
          if (img.uri) {
            moderationService.uploadWithModeration(img.uri)
              .then(result => {
                setProjectImages(prev => {
                  const updated = [...prev];
                  const imgIndex = prev.length - newImages.length + index;
                  if (updated[imgIndex]) {
                    updated[imgIndex] = {
                      ...updated[imgIndex],
                      moderationStatus: result.status === 'approved' ? 'APPROVED' : 
                                       result.status === 'rejected' ? 'REJECTED' : 'PENDING',
                      moderationReason: result.moderation_reason,
                      imageUrl: result.image_url,
                    };
                  }
                  return updated;
                });
              })
              .catch(error => {
                console.error('Moderation error:', error);
                setProjectImages(prev => {
                  const updated = [...prev];
                  const imgIndex = prev.length - newImages.length + index;
                  if (updated[imgIndex]) {
                    updated[imgIndex] = {
                      ...updated[imgIndex],
                      moderationStatus: 'REJECTED' as const,
                      moderationReason: 'Failed to process image',
                    };
                  }
                  return updated;
                });
              });
          }
        });
      }
    });
  };

  const validateProjectStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!projectName.trim()) {
          Alert.alert('Error', 'Please enter project name');
          return false;
        }
        if (!projectType) {
          Alert.alert('Error', 'Please select project type');
          return false;
        }
        if (!description.trim()) {
          Alert.alert('Error', 'Please enter project description');
          return false;
        }
        if (description.length > 1000) {
          Alert.alert('Error', 'Description cannot exceed 1000 characters');
          return false;
        }
        return true;
      case 2:
        if (!location.trim()) {
          Alert.alert('Error', 'Please enter location');
          return false;
        }
        if (!state.trim()) {
          Alert.alert('Error', 'Please enter state');
          return false;
        }
        return true;
      case 3:
        if (selectedConfigurations.length === 0) {
          Alert.alert('Error', 'Please select at least one configuration');
          return false;
        }
        if (!carpetAreaRange.trim()) {
          Alert.alert('Error', 'Please enter carpet area range');
          return false;
        }
        return true;
      case 4:
        if (!startingPrice.trim()) {
          Alert.alert('Error', 'Please enter starting price');
          return false;
        }
        return true;
      case 7:
        const approvedImages = projectImages.filter(img => img.moderationStatus === 'APPROVED');
        if (approvedImages.length < 2) {
          Alert.alert('Error', 'Please upload at least 2 approved images');
          return false;
        }
        if (projectImages.length > 20) {
          Alert.alert('Error', 'Maximum 20 images allowed');
          return false;
        }
        const checkingImages = projectImages.filter(img => img.moderationStatus === 'checking');
        if (checkingImages.length > 0) {
          Alert.alert('Error', 'Please wait for all images to be processed');
          return false;
        }
        return true;
      case 8:
        if (!salesName.trim()) {
          Alert.alert('Error', 'Please enter sales person name');
          return false;
        }
        if (!salesNumber.trim() || salesNumber.length !== 10) {
          Alert.alert('Error', 'Please enter valid 10-digit sales number');
          return false;
        }
        if (!emailId.trim() || !emailId.includes('@')) {
          Alert.alert('Error', 'Please enter valid email address');
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleProjectSubmit = async () => {
    if (!validateProjectStep(10)) {
      return;
    }

    try {
      setIsSubmitting(true);

      const approvedImages = projectImages
        .filter(img => img.moderationStatus === 'APPROVED')
        .map(img => img.base64 || img.imageUrl)
        .filter((url): url is string => url !== undefined);

      if (approvedImages.length < 2) {
        Alert.alert('Error', 'Please upload at least 2 approved images');
        setIsSubmitting(false);
        return;
      }

      const formattedStartingPrice = formatPriceInput(startingPrice);
      const formattedPricePerSqft = pricePerSqft ? formatPriceInput(pricePerSqft) : null;
      const formattedBookingAmount = bookingAmount ? formatPriceInput(bookingAmount) : null;

      const propertyData: any = {
        title: projectName.trim(),
        property_type: projectType,
        status: 'sale',
        project_type: 'upcoming',
        project_status: projectStatus,
        rera_number: reraNumber.trim() || null,
        description: description.trim(),
        location: location.trim(),
        area: area || null,
        city: city || null,
        state: state.trim(),
        additional_address: additionalAddress.trim() || null,
        pincode: pincode.trim() || null,
        latitude: latitude || null,
        longitude: longitude || null,
        configurations: selectedConfigurations.join(','),
        carpet_area: carpetAreaRange.trim(),
        number_of_towers: numberOfTowers ? parseInt(numberOfTowers) : null,
        total_units: totalUnits ? parseInt(totalUnits) : null,
        floors_count: floorsCount ? parseInt(floorsCount) : null,
        price: formattedStartingPrice,
        price_per_sqft: formattedPricePerSqft,
        booking_amount: formattedBookingAmount,
        launch_date: launchDate || null,
        possession_date: possessionDate || null,
        amenities: selectedProjectAmenities.length > 0 ? selectedProjectAmenities.join(',') : null,
        rera_status: reraStatus || null,
        land_ownership_type: landOwnershipType || null,
        bank_approved: bankApproved || null,
        approved_banks: selectedBanks.length > 0 ? selectedBanks.join(',') : null,
        other_bank_names: otherBankNames.trim() || null,
        sales_name: salesName.trim(),
        sales_number: salesNumber.trim(),
        email_id: emailId.trim(),
        mobile_number: mobileNumber.trim() || null,
        whatsapp_number: whatsappNumber.trim() || null,
        alternative_number: alternativeNumber.trim() || null,
        project_highlights: projectHighlights.trim() || null,
        usp: usp.trim() || null,
        images: approvedImages,
        cover_image: coverImage?.base64 || null,
        master_plan: masterPlan?.base64 || null,
      };

      console.log('[Agent AddProperty] Submitting project:', propertyData);

      const response: any = await propertyService.createProperty(propertyData, 'agent');
      
      if (response && response.success) {
        Alert.alert(
          'Success',
          'Upcoming project published successfully! It is now visible to buyers.',
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
      } else {
        const errorMessage = response?.message || response?.error?.message || 'Failed to create project';
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isUpcomingProject) {
      await handleProjectSubmit();
      return;
    }
    try {
      setIsSubmitting(true);

      // Collect images as base64 strings (auto-approved, skip moderation)
      const imageBase64Strings = photos
        .filter(p => p.moderationStatus === 'APPROVED' && p.base64)
        .map(p => p.base64!)
        .filter((base64): base64 is string => base64 !== undefined && base64 !== null);
      
      console.log('[AddProperty] Total photos:', photos.length, 'Approved photos with base64:', imageBase64Strings.length);

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

      console.log('[AddProperty] Creating property with endpoint: /agent/properties/add.php');
      console.log('[AddProperty] Images included as base64:', imageBase64Strings.length);

      // Create property with images included in request
      // Use 'agent' userType to use correct endpoint
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
    } catch (error: any) {
      console.error('Submit error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to create property. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    Alert.alert(
      isUpcomingProject ? 'Cancel Project' : 'Cancel Listing',
      'Are you sure you want to cancel? Your progress will be lost.',
      [
        {text: 'Continue Editing', style: 'cancel'},
        {text: 'Cancel', style: 'destructive', onPress: () => navigation.goBack()},
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

  // Render project form steps (similar to Builder's implementation)
  const renderProjectStepContent = () => {
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
                onChangeText={setProjectName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Agent / Developer Name</Text>
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
                    onPress={() => setProjectType(type.id)}>
                    <Text style={styles.typeButtonIcon}>{type.icon}</Text>
                    <Text style={[
                      styles.typeButtonText,
                      projectType === type.id && styles.typeButtonTextActive,
                    ]}>{type.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Project Status <Text style={styles.required}>*</Text>
              </Text>
              <Dropdown
                placeholder="Select project status"
                options={PROJECT_STATUSES}
                value={projectStatus}
                onSelect={(value) => setProjectStatus(value)}
              />
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
                placeholder="Provide a short overview of your project (500-1000 characters)"
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {description.length}/1000
              </Text>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Location Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Location <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter locality, area or landmark"
                  placeholderTextColor={colors.textSecondary}
                  value={locationQuery}
                  onChangeText={(text) => {
                    setLocationQuery(text);
                    setShowLocationSuggestions(text.length >= 2);
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
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Project Location on Map (Optional)</Text>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => setLocationPickerVisible(true)}>
                <Text style={styles.mapButtonIcon}>
                  {latitude && longitude ? '📍' : '🗺️'}
                </Text>
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

            <LocationPicker
              visible={locationPickerVisible}
              initialLocation={latitude && longitude ? {latitude, longitude} : undefined}
              onLocationSelect={(locationData) => {
                setLatitude(locationData.latitude);
                setLongitude(locationData.longitude);
                if (locationData.address) {
                  setLocation(locationData.address);
                  setLocationQuery(locationData.address);
                }
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
              <View style={styles.stateInputContainer}>
                <TextInput
                  style={[styles.input, stateAutoFilled && styles.autoFilledInput]}
                  placeholder="Enter state"
                  placeholderTextColor={colors.textSecondary}
                  value={state}
                  onChangeText={(text) => {
                    setState(text);
                    setStateAutoFilled(false);
                  }}
                  editable={!stateAutoFilled}
                />
                {stateAutoFilled && (
                  <View style={styles.autoFilledBadge}>
                    <Text style={styles.autoFilledBadgeText}>(Auto-filled from location)</Text>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => setStateAutoFilled(false)}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Additional Address (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter additional address details"
                placeholderTextColor={colors.textSecondary}
                value={additionalAddress}
                onChangeText={setAdditionalAddress}
              />
              <Text style={styles.hintText}>This field remains empty unless you enter it manually</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Pincode (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter pincode"
                placeholderTextColor={colors.textSecondary}
                value={pincode}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 6);
                  setPincode(cleaned);
                }}
                keyboardType="numeric"
                maxLength={6}
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Configuration & Inventory Details</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Property Configurations <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.buttonGrid}>
                {CONFIGURATIONS.map(config => (
                  <TouchableOpacity
                    key={config.id}
                    style={[
                      styles.configButton,
                      selectedConfigurations.includes(config.id) && styles.configButtonActive,
                    ]}
                    onPress={() => {
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
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Carpet Area Range <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.areaInputContainer}>
                <TextInput
                  style={[styles.input, styles.areaInput]}
                  placeholder="e.g., 650 - 1200"
                  placeholderTextColor={colors.textSecondary}
                  value={carpetAreaRange}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/sq\.ft/gi, '').trim();
                    setCarpetAreaRange(cleaned);
                  }}
                />
                <Text style={styles.areaUnit}>sq.ft</Text>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Number of Towers / Buildings (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 3"
                placeholderTextColor={colors.textSecondary}
                value={numberOfTowers}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setNumberOfTowers(cleaned);
                }}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Total Units (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 200"
                placeholderTextColor={colors.textSecondary}
                value={totalUnits}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setTotalUnits(cleaned);
                }}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Floors Count (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 15"
                placeholderTextColor={colors.textSecondary}
                value={floorsCount}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  setFloorsCount(cleaned);
                }}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Pricing & Timeline</Text>
            
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
                  onChangeText={setStartingPrice}
                  keyboardType="numeric"
                />
              </View>
              {startingPrice && (
                <Text style={styles.priceDisplay}>
                  Price: {formatters.price(formatPriceInput(startingPrice))}
                </Text>
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
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={launchDate}
                onChangeText={setLaunchDate}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Expected Possession Date (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={possessionDate}
                onChangeText={setPossessionDate}
              />
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Amenities</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Amenities (All Optional)</Text>
              <View style={styles.amenitiesGrid}>
                {PROJECT_AMENITIES.map(amenity => (
                  <TouchableOpacity
                    key={amenity.id}
                    style={[
                      styles.amenityButton,
                      selectedProjectAmenities.includes(amenity.id) && styles.amenityButtonActive,
                    ]}
                    onPress={() => {
                      if (selectedProjectAmenities.includes(amenity.id)) {
                        setSelectedProjectAmenities(prev => prev.filter(id => id !== amenity.id));
                      } else {
                        setSelectedProjectAmenities(prev => [...prev, amenity.id]);
                      }
                    }}>
                    <Text style={styles.amenityIcon}>{amenity.icon}</Text>
                    {selectedProjectAmenities.includes(amenity.id) && (
                      <Text style={styles.amenityCheckmark}>✓</Text>
                    )}
                    <Text style={[
                      styles.amenityText,
                      selectedProjectAmenities.includes(amenity.id) && styles.amenityTextActive,
                    ]}>{amenity.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Legal & Approval Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>RERA Status (Optional)</Text>
              <Dropdown
                placeholder="Select RERA Status"
                options={[
                  {label: 'Applied', value: 'Applied'},
                  {label: 'Approved', value: 'Approved'},
                ]}
                value={reraStatus}
                onSelect={(value) => setReraStatus(value)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Land Ownership Type (Optional)</Text>
              <Dropdown
                placeholder="Select Ownership Type"
                options={[
                  {label: 'Freehold', value: 'Freehold'},
                  {label: 'Leasehold', value: 'Leasehold'},
                  {label: 'Power of Attorney', value: 'Power of Attorney'},
                  {label: 'Co-operative Society', value: 'Co-operative Society'},
                ]}
                value={landOwnershipType}
                onSelect={(value) => setLandOwnershipType(value)}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Bank Approved (Optional)</Text>
              <Dropdown
                placeholder="Select"
                options={[
                  {label: 'Yes', value: 'Yes'},
                  {label: 'No', value: 'No'},
                ]}
                value={bankApproved}
                onSelect={(value) => {
                  setBankApproved(value);
                  if (value !== 'Yes') {
                    setSelectedBanks([]);
                    setOtherBankNames('');
                  }
                }}
              />
            </View>

            {bankApproved === 'Yes' && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>
                    Select Approved Banks <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.buttonGrid}>
                    {BANKS.map(bank => (
                      <TouchableOpacity
                        key={bank.id}
                        style={[
                          styles.configButton,
                          selectedBanks.includes(bank.id) && styles.configButtonActive,
                        ]}
                        onPress={() => {
                          if (selectedBanks.includes(bank.id)) {
                            setSelectedBanks(prev => prev.filter(id => id !== bank.id));
                            if (bank.id === 'other') {
                              setOtherBankNames('');
                            }
                          } else {
                            setSelectedBanks(prev => [...prev, bank.id]);
                          }
                        }}>
                        {selectedBanks.includes(bank.id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                        <Text style={[
                          styles.configButtonText,
                          selectedBanks.includes(bank.id) && styles.configButtonTextActive,
                        ]}>{bank.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {selectedBanks.includes('other') && (
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Other Bank Name(s) (Optional)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter bank names separated by comma (e.g., PNB, Canara Bank)"
                      placeholderTextColor={colors.textSecondary}
                      value={otherBankNames}
                      onChangeText={setOtherBankNames}
                    />
                    <Text style={styles.hintText}>You can enter multiple bank names separated by commas</Text>
                  </View>
                )}
              </>
            )}
          </View>
        );

      case 7:
        const approvedImagesCount = projectImages.filter(img => img.moderationStatus === 'APPROVED').length;
        const checkingImagesCount = projectImages.filter(img => img.moderationStatus === 'checking').length;
        
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Media Uploads</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Project Cover Image (Optional)</Text>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={async () => {
                  const hasPermission = await requestCameraPermission();
                  if (!hasPermission) return;
                  
                  launchImageLibrary({mediaType: 'photo', quality: 0.8, includeBase64: true}, (response) => {
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
                  <Image source={{uri: coverImage.uri}} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>📷</Text>
                    <Text style={styles.imagePlaceholderLabel}>Upload Cover Image</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Project Images <Text style={styles.required}>*</Text> (Concept images / 3D renders allowed)
              </Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleProjectImagesUpload}>
                <Text style={styles.uploadButtonText}>📷 Upload Images (Max 20)</Text>
              </TouchableOpacity>
              <Text style={styles.imageCountText}>
                Images uploaded: {approvedImagesCount} / 20 (Minimum 2 required)
              </Text>
              {approvedImagesCount < 2 && (
                <Text style={styles.warningText}>
                  ⚠️ Please upload at least 2 images to continue.
                </Text>
              )}
              
              {projectImages.length > 0 && (
                <View style={styles.imagesGrid}>
                  {projectImages.map((img, index) => {
                    const status = img.moderationStatus;
                    return (
                      <View key={index} style={styles.imageItem}>
                        <Image source={{uri: img.uri}} style={styles.projectImage} />
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
                            <Text style={styles.removeImageText}>✕</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Master Plan Image (Optional)</Text>
              <TouchableOpacity
                style={styles.imageUploadButton}
                onPress={async () => {
                  const hasPermission = await requestCameraPermission();
                  if (!hasPermission) return;
                  
                  launchImageLibrary({mediaType: 'photo', quality: 0.8, includeBase64: true}, (response) => {
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
                  <Image source={{uri: masterPlan.uri}} style={styles.imagePreview} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Text style={styles.imagePlaceholderText}>🗺️</Text>
                    <Text style={styles.imagePlaceholderLabel}>Upload Master Plan</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        );

      case 8:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Contact & Sales Information</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Sales Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter sales person name"
                placeholderTextColor={colors.textSecondary}
                value={salesName}
                onChangeText={setSalesName}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Sales Number <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
                value={salesNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                  setSalesNumber(cleaned);
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Email ID <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor={colors.textSecondary}
                value={emailId}
                onChangeText={setEmailId}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mobile Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
                value={mobileNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                  setMobileNumber(cleaned);
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>WhatsApp Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
                value={whatsappNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                  setWhatsappNumber(cleaned);
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Alternative Number (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                placeholderTextColor={colors.textSecondary}
                value={alternativeNumber}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '').slice(0, 10);
                  setAlternativeNumber(cleaned);
                }}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>
        );

      case 9:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Marketing Highlights</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Project Highlights (Optional but recommended)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="e.g., Near Metro Station, Sea View, Golf Course Nearby"
                placeholderTextColor={colors.textSecondary}
                value={projectHighlights}
                onChangeText={setProjectHighlights}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>USP (Unique Selling Points) (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What makes your project unique?"
                placeholderTextColor={colors.textSecondary}
                value={usp}
                onChangeText={setUsp}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        );

      case 10:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Preview & Submit</Text>
            
            <ScrollView style={styles.previewScroll}>
              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Basic Information</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Project Name:</Text>
                  <Text style={styles.previewValue}>{projectName || 'N/A'}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Agent:</Text>
                  <Text style={styles.previewValue}>{user?.full_name || 'N/A'}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Project Type:</Text>
                  <Text style={styles.previewValue}>
                    {PROJECT_TYPES.find(t => t.id === projectType)?.label || 'N/A'}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Status:</Text>
                  <Text style={styles.previewValue}>{projectStatus || 'N/A'}</Text>
                </View>
                {reraNumber && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>RERA Number:</Text>
                    <Text style={styles.previewValue}>{reraNumber}</Text>
                  </View>
                )}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Location</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Location:</Text>
                  <Text style={styles.previewValue}>{location || 'N/A'}</Text>
                </View>
                {additionalAddress && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Full Address:</Text>
                    <Text style={styles.previewValue}>{additionalAddress}</Text>
                  </View>
                )}
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>State:</Text>
                  <Text style={styles.previewValue}>{state || 'N/A'}</Text>
                </View>
                {latitude && longitude && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Coordinates:</Text>
                    <Text style={styles.previewValue}>
                      {latitude.toFixed(6)}, {longitude.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Configuration</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Configurations:</Text>
                  <Text style={styles.previewValue}>
                    {selectedConfigurations.map(id => 
                      CONFIGURATIONS.find(c => c.id === id)?.label
                    ).filter(Boolean).join(', ') || 'N/A'}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Carpet Area Range:</Text>
                  <Text style={styles.previewValue}>{carpetAreaRange || 'N/A'} sq.ft</Text>
                </View>
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Pricing</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Starting Price:</Text>
                  <Text style={styles.previewValue}>
                    {startingPrice ? formatters.price(formatPriceInput(startingPrice)) : 'N/A'}
                  </Text>
                </View>
                {pricePerSqft && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Price per Sq.ft:</Text>
                    <Text style={styles.previewValue}>
                      {formatters.price(formatPriceInput(pricePerSqft))}/sq.ft
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Contact</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Sales Name:</Text>
                  <Text style={styles.previewValue}>{salesName || 'N/A'}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Sales Number:</Text>
                  <Text style={styles.previewValue}>{salesNumber || 'N/A'}</Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Email:</Text>
                  <Text style={styles.previewValue}>{emailId || 'N/A'}</Text>
                </View>
                {mobileNumber && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Mobile Number:</Text>
                    <Text style={styles.previewValue}>{mobileNumber}</Text>
                  </View>
                )}
                {whatsappNumber && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>WhatsApp Number:</Text>
                    <Text style={styles.previewValue}>{whatsappNumber}</Text>
                  </View>
                )}
                {alternativeNumber && (
                  <View style={styles.previewRow}>
                    <Text style={styles.previewLabel}>Alternative Number:</Text>
                    <Text style={styles.previewValue}>{alternativeNumber}</Text>
                  </View>
                )}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.previewSectionTitle}>Images</Text>
                <View style={styles.previewRow}>
                  <Text style={styles.previewLabel}>Approved Images:</Text>
                  <Text style={styles.previewValue}>
                    {projectImages.filter(img => img.moderationStatus === 'APPROVED').length} / 20
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        );

      default:
        return null;
    }
  };

  const renderStepContent = () => {
    // Render project form if isUpcomingProject is true
    if (isUpcomingProject) {
      return renderProjectStepContent();
    }
    
    // Render regular property form
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>I want to</Text>
              <View style={styles.typeButtonsContainer}>
                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => setPropertyStatus('sell')}>
                  <View style={propertyStatus === 'sell' ? styles.typeButtonSelected : styles.typeButtonUnselected}>
                    <Text style={styles.typeButtonIcon}>🏷️</Text>
                    <Text style={propertyStatus === 'sell' ? styles.typeButtonTextSelected : styles.typeButtonText}>Sell</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => setPropertyStatus('rent')}>
                  <View style={propertyStatus === 'rent' ? styles.typeButtonSelected : styles.typeButtonUnselected}>
                    <Text style={styles.typeButtonIcon}>🔑</Text>
                    <Text style={propertyStatus === 'rent' ? styles.typeButtonTextSelected : styles.typeButtonText}>Rent / Lease</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputContainer}>
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
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Property Details</Text>
            <Text style={styles.stepSubtitle}>
              Tell us more about your property specifications
            </Text>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Property Location on Map (Optional)</Text>
              <TouchableOpacity
                style={styles.mapButton}
                onPress={() => setLocationPickerVisible(true)}>
                <View style={styles.mapButtonInner}>
                  <Text style={styles.mapButtonIcon}>
                    {latitude && longitude ? '📍' : '🗺️'}
                  </Text>
                  <Text style={styles.mapButtonText}>
                    {latitude && longitude
                      ? 'Location Selected'
                      : 'Select Location on Map'}
                  </Text>
                </View>
              </TouchableOpacity>
              {latitude && longitude && (
                <Text style={styles.mapButtonSubtext}>
                  Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                </Text>
              )}
              {!latitude && !longitude && (
                <Text style={styles.mapButtonSubtext}>
                  Select exact location on map for better visibility
                </Text>
              )}
            </View>

            <LocationPicker
              visible={locationPickerVisible}
              initialLocation={latitude && longitude ? {latitude, longitude} : undefined}
              onLocationSelect={(locationData) => {
                setLatitude(locationData.latitude);
                setLongitude(locationData.longitude);
                if (locationData.address) {
                  setLocation(locationData.address);
                  setLocationSelected(true); // Mark location as selected
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
                Location <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter locality, area or landmark"
                  placeholderTextColor={colors.textSecondary}
                  value={location}
                  onChangeText={(text) => {
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

            {fieldVisibility.showFacing && (
              <Dropdown
                label="Facing"
                placeholder="Select facing direction"
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
            )}

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
          <View style={styles.stepContent}>
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
                <Text style={styles.label}>Deposit Amount</Text>
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

  return (
    <Modal
      visible={true}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <SafeAreaView style={styles.safeArea}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {isUpcomingProject ? 'Add Upcoming Project' : 'List Your Property'}
              </Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Steps */}
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={isUpcomingProject ? styles.progressContainerScroll : styles.progressContainer}
              contentContainerStyle={isUpcomingProject ? styles.progressContent : undefined}>
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
                    {!isUpcomingProject && index < steps.length - 1 && (
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
            </ScrollView>

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
                style={[
                  styles.nextButton,
                  (isSubmitting || 
                   (isUpcomingProject && currentStep === 7 && projectImages.filter(img => img.moderationStatus === 'APPROVED').length < 2) ||
                   (isUpcomingProject && currentStep === 7 && projectImages.length > 20)
                  ) && styles.nextButtonDisabled
                ]}
                onPress={handleNext}
                disabled={isSubmitting || 
                  (isUpcomingProject && currentStep === 7 && projectImages.filter(img => img.moderationStatus === 'APPROVED').length < 2) ||
                  (isUpcomingProject && currentStep === 7 && projectImages.length > 20)
                }>
                {isSubmitting ? (
                  <View style={styles.submitButtonInner}>
                    <ActivityIndicator size="small" color={colors.surface} />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : currentStep === totalSteps ? (
                  <View style={styles.publishButtonInner}>
                    <Text style={styles.publishButtonIcon}>✓</Text>
                    <Text style={styles.publishButtonText}>
                      {isUpcomingProject ? 'Publish Project' : 'Publish Listing'}
                    </Text>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressContainerScroll: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 100,
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
    backgroundColor: colors.text,
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
    color: colors.textSecondary,
    textAlign: 'center',
  },
  stepLabelCompleted: {
    color: '#43A047',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: colors.text,
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
    backgroundColor: colors.text,
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
    color: colors.text,
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
  typeButtonSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
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
    gap: spacing.md,
  },
  propertyTypeButton: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  propertyTypeButtonActive: {
    borderColor: colors.text,
    borderWidth: 2,
    backgroundColor: colors.surfaceSecondary,
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
    color: colors.text,
    fontWeight: '600',
  },
  mapButton: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.text,
    marginBottom: spacing.xs,
  },
  mapButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
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
  mapButtonSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
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
    backgroundColor: colors.text,
    borderColor: colors.text,
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
    gap: spacing.md,
  },
  amenityButton: {
    width: '30%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 90,
  },
  amenityButtonActive: {
    borderColor: colors.text,
    borderWidth: 2,
    backgroundColor: colors.surfaceSecondary,
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
    backgroundColor: colors.surfaceSecondary,
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
    backgroundColor: colors.text,
    borderColor: colors.text,
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
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryButtonText: {
    ...typography.body,
    color: colors.text,
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
    backgroundColor: colors.text,
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
  progressContainerScroll: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 100,
  },
  progressContent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
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
  typeButtonIcon: {
    fontSize: 32,
    marginBottom: spacing.xs,
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
});

export default AddPropertyScreen;
