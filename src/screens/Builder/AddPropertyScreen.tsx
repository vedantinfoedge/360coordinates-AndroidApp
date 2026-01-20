import React, {useState, useEffect, useRef} from 'react';
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
import {SafeAreaView} from 'react-native-safe-area-context';
import {launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {BuilderTabParamList} from '../../components/navigation/BuilderTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import Dropdown from '../../components/common/Dropdown';
import {propertyService} from '../../services/property.service';
import {moderationService} from '../../services/moderation.service';
import LocationPicker from '../../components/map/LocationPicker';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import {extractStateFromContext} from '../../utils/geocoding';
import {useAuth} from '../../context/AuthContext';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type AddPropertyScreenNavigationProp = BottomTabNavigationProp<
  BuilderTabParamList,
  'AddProperty'
>;

type Props = {
  navigation: AddPropertyScreenNavigationProp;
};

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

// Amenities Options
const AMENITIES = [
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
  const {user} = useAuth();
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
  const [floorsCount, setFloorsCount] = useState('');
  
  // Step 4: Pricing & Timeline
  const [startingPrice, setStartingPrice] = useState('');
  const [pricePerSqft, setPricePerSqft] = useState('');
  const [bookingAmount, setBookingAmount] = useState('');
  const [launchDate, setLaunchDate] = useState('');
  const [possessionDate, setPossessionDate] = useState('');
  
  // Step 5: Amenities
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  
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

  const totalSteps = 10;
  const steps = [
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
  ];

  // Price formatting helper
  const formatPriceInput = (value: string): number => {
    // Remove all non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.-]/g, '');
    // Handle Lakhs/Crore format (e.g., "45 Lakhs" -> 4500000)
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

  // Handle location selection from autosuggest
  const handleLocationSelect = (locationData: any) => {
    setLocation(locationData.placeName || locationData.name);
    setLocationQuery(locationData.placeName || locationData.name);
    setShowLocationSuggestions(false);
    
    // Extract state from context
    const extractedState = extractStateFromContext(locationData.context);
    if (extractedState) {
      setState(extractedState);
      setStateAutoFilled(true);
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
      setArea(cityContext.text || '');
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

  // Handle project images upload with moderation
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
        
        // Process moderation for each image
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

  // Validation functions
  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!projectName.trim()) {
          CustomAlert.alert('Error', 'Please enter project name');
          return false;
        }
        if (!projectType) {
          CustomAlert.alert('Error', 'Please select project type');
          return false;
        }
        if (!description.trim()) {
          CustomAlert.alert('Error', 'Please enter project description');
          return false;
        }
        if (description.length > 1000) {
          CustomAlert.alert('Error', 'Description cannot exceed 1000 characters');
          return false;
        }
        return true;
      case 2:
        if (!location.trim()) {
          CustomAlert.alert('Error', 'Please enter location');
          return false;
        }
        if (!state.trim()) {
          CustomAlert.alert('Error', 'Please enter state');
          return false;
        }
        return true;
      case 3:
        if (selectedConfigurations.length === 0) {
          CustomAlert.alert('Error', 'Please select at least one configuration');
          return false;
        }
        if (!carpetAreaRange.trim()) {
          CustomAlert.alert('Error', 'Please enter carpet area range');
          return false;
        }
        return true;
      case 4:
        if (!startingPrice.trim()) {
          CustomAlert.alert('Error', 'Please enter starting price');
          return false;
        }
        return true;
      case 7:
        const approvedImages = projectImages.filter(img => img.moderationStatus === 'APPROVED');
        if (approvedImages.length < 2) {
          CustomAlert.alert('Error', 'Please upload at least 2 approved images');
          return false;
        }
        if (projectImages.length > 20) {
          CustomAlert.alert('Error', 'Maximum 20 images allowed');
          return false;
        }
        const checkingImages = projectImages.filter(img => img.moderationStatus === 'checking');
        if (checkingImages.length > 0) {
          CustomAlert.alert('Error', 'Please wait for all images to be processed');
          return false;
        }
        return true;
      case 8:
        if (!salesName.trim()) {
          CustomAlert.alert('Error', 'Please enter sales person name');
          return false;
        }
        if (!salesNumber.trim() || salesNumber.length !== 10) {
          CustomAlert.alert('Error', 'Please enter valid 10-digit sales number');
          return false;
        }
        if (!emailId.trim() || !emailId.includes('@')) {
          CustomAlert.alert('Error', 'Please enter valid email address');
          return false;
        }
        return true;
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
    if (!validateStep(10)) {
      return;
    }

    try {
      setIsSubmitting(true);

      // Collect approved images
      const approvedImages = projectImages
        .filter(img => img.moderationStatus === 'APPROVED')
        .map(img => img.base64 || img.imageUrl)
        .filter((url): url is string => url !== undefined);

      if (approvedImages.length < 2) {
        CustomAlert.alert('Error', 'Please upload at least 2 approved images');
        setIsSubmitting(false);
        return;
      }

      // Format price
      const formattedStartingPrice = formatPriceInput(startingPrice);
      const formattedPricePerSqft = pricePerSqft ? formatPriceInput(pricePerSqft) : null;
      const formattedBookingAmount = bookingAmount ? formatPriceInput(bookingAmount) : null;

      const propertyData: any = {
        title: projectName.trim(),
        property_type: projectType,
        status: 'sale', // Upcoming projects are for sale
        project_type: 'upcoming', // Mark as upcoming project
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
        amenities: selectedAmenities.join(','),
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

      console.log('[Builder AddProperty] Submitting property:', propertyData);

      const response: any = await propertyService.createProperty(propertyData, 'agent');
      
      if (response && response.success) {
        CustomAlert.alert(
          'Success',
          'Upcoming project published successfully! It is now visible to buyers.',
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
      } else {
        const errorMessage = response?.message || response?.error?.message || 'Failed to create project';
        CustomAlert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      console.error('Submit error:', error);
      CustomAlert.alert('Error', error.response?.data?.message || 'Failed to create project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    CustomAlert.alert(
      'Cancel Project',
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

  // Render step content (continuing in next part due to length)
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
                onChangeText={setProjectName}
              />
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
                  // Only allow digits, max 6
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
                    // Auto-remove "sq.ft" if typed
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
                {AMENITIES.map(amenity => (
                  <TouchableOpacity
                    key={amenity.id}
                    style={[
                      styles.amenityButton,
                      selectedAmenities.includes(amenity.id) && styles.amenityButtonActive,
                    ]}
                    onPress={() => {
                      if (selectedAmenities.includes(amenity.id)) {
                        setSelectedAmenities(prev => prev.filter(id => id !== amenity.id));
                      } else {
                        setSelectedAmenities(prev => [...prev, amenity.id]);
                      }
                    }}>
                    <Text style={styles.amenityIcon}>{amenity.icon}</Text>
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
              <Text style={styles.label}>Floor Plans (PDF / Images) (Optional)</Text>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={async () => {
                  const hasPermission = await requestCameraPermission();
                  if (!hasPermission) return;
                  
                  launchImageLibrary({mediaType: 'photo', quality: 0.8}, (response) => {
                    if (response.assets) {
                      const newPlans = response.assets.map(asset => ({
                        uri: asset.uri || '',
                        name: asset.fileName || 'floor_plan.jpg',
                      }));
                      setFloorPlans(prev => [...prev, ...newPlans]);
                    }
                  });
                }}>
                <Text style={styles.uploadButtonText}>📄 Upload Floor Plans</Text>
              </TouchableOpacity>
              {floorPlans.length > 0 && (
                <View style={styles.filesList}>
                  {floorPlans.map((plan, index) => (
                    <View key={index} style={styles.fileItem}>
                      <Text style={styles.fileName}>{plan.name}</Text>
                      <TouchableOpacity
                        onPress={() => setFloorPlans(prev => prev.filter((_, i) => i !== index))}>
                        <Text style={styles.removeFileText}>✕</Text>
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
                  const hasPermission = await requestCameraPermission();
                  if (!hasPermission) return;
                  
                  launchImageLibrary({mediaType: 'photo', quality: 0.8}, (response) => {
                    if (response.assets && response.assets[0]) {
                      const asset = response.assets[0];
                      setBrochure({
                        uri: asset.uri || '',
                        name: asset.fileName || 'brochure.pdf',
                      });
                    }
                  });
                }}>
                <Text style={styles.uploadButtonText}>📑 Upload Brochure</Text>
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
                  <Text style={styles.previewLabel}>Builder:</Text>
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
              <Text style={styles.headerTitle}>Add Upcoming Project</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>✕</Text>
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
                   (currentStep === 7 && projectImages.filter(img => img.moderationStatus === 'APPROVED').length < 2) ||
                   (currentStep === 7 && projectImages.length > 20)
                  ) && styles.nextButtonDisabled
                ]}
                onPress={handleNext}
                disabled={isSubmitting || 
                  (currentStep === 7 && projectImages.filter(img => img.moderationStatus === 'APPROVED').length < 2) ||
                  (currentStep === 7 && projectImages.length > 20)
                }>
                {isSubmitting ? (
                  <View style={styles.submitButtonInner}>
                    <ActivityIndicator size="small" color={colors.surface} />
                    <Text style={styles.submitButtonText}>Submitting...</Text>
                  </View>
                ) : currentStep === totalSteps ? (
                  <View style={styles.publishButtonInner}>
                    <Text style={styles.publishButtonIcon}>✓</Text>
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
    backgroundColor: '#43A047',
  },
  stepCircleActive: {
    backgroundColor: colors.accent,
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
    color: '#43A047',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: colors.accent,
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
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accent + '20',
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
    color: colors.accent,
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
    backgroundColor: colors.accent,
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
    color: colors.accent,
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
    color: colors.accent,
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
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accent + '20',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    fontSize: 16,
    color: colors.accent,
    fontWeight: 'bold',
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
    borderColor: colors.accent,
    borderWidth: 2,
    backgroundColor: colors.accent + '20',
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
    color: colors.accent,
    fontWeight: 'bold',
  },
  amenityText: {
    ...typography.caption,
    color: colors.text,
    fontSize: 11,
    textAlign: 'center',
  },
  amenityTextActive: {
    color: colors.accent,
    fontWeight: '600',
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
    backgroundColor: colors.accent,
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

export default AddPropertyScreen;
