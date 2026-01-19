import React, {useState, useMemo} from 'react';
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
  Dimensions,
} from 'react-native';
import {launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import Dropdown from '../../components/common/Dropdown';
import {propertyService} from '../../services/property.service';
import {moderationService} from '../../services/moderation.service';
import LocationAutoSuggest from '../../components/search/LocationAutoSuggest';
import StateAutoSuggest from '../../components/search/StateAutoSuggest';
import LocationPicker from '../../components/map/LocationPicker';
import {
  GuidePropertyType,
  getPropertyTypeConfig,
  getAvailableAmenitiesForPropertyType,
  PROPERTY_TYPES,
  AMENITIES_LIST,
} from '../../utils/propertyTypeConfig';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type AddPropertyScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddProperty'
>;

type Props = {
  navigation: AddPropertyScreenNavigationProp;
};

type PropertyStatus = 'sale' | 'rent';

const AddPropertyScreen: React.FC<Props> = ({navigation}) => {
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
    // Validation based on guide specifications
    if (currentStep === 1) {
      if (!propertyTitle.trim()) {
        Alert.alert('Error', 'Please enter property title');
        return;
      }
      if (propertyTitle.trim().length > 255) {
        Alert.alert('Error', 'Title must be less than 255 characters');
        return;
      }
      if (!propertyType) {
        Alert.alert('Error', 'Please select property type');
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
        Alert.alert('Error', `Please enter ${fieldVisibility.areaLabel.toLowerCase()}`);
        return;
      }
      const areaValue = parseFloat(builtUpArea);
      if (isNaN(areaValue) || areaValue <= 0) {
        Alert.alert('Error', `${fieldVisibility.areaLabel} must be a positive number`);
        return;
      }
      if (fieldVisibility.showFurnishing && !furnishing) {
        Alert.alert('Error', 'Please select furnishing status');
        return;
      }
    }
    if (currentStep === 3) {
      if (!description.trim()) {
        Alert.alert('Error', 'Please enter property description');
        return;
      }
      if (description.trim().length < 100) {
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
        Alert.alert('Error', propertyStatus === 'sale' ? 'Please enter expected price' : 'Please enter monthly rent');
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

      // Collect images as base64 strings (auto-approved, skip moderation)
      // According to guide: images can be sent as URLs or base64 strings in the request body
      // For now, we're using base64 strings for all approved images
      const imageBase64Strings = photos
        .filter(p => p.moderationStatus === 'APPROVED' && p.base64) // Only include approved images with base64
        .map(p => p.base64!)
        .filter((base64): base64 is string => base64 !== undefined && base64 !== null);
      
      console.log('[AddProperty] Total photos:', photos.length, 'Approved photos with base64:', imageBase64Strings.length);

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
        amenities: selectedAmenities,
        // Include images as base64 strings in the request (as per guide)
        images: imageBase64Strings.length > 0 ? imageBase64Strings : undefined,
      };

      console.log('[AddProperty] Creating property with endpoint: /seller/properties/add.php');
      console.log('[AddProperty] Images included as base64:', imageBase64Strings.length);
      console.log('[AddProperty] Property data:', JSON.stringify({...propertyData, images: `[${imageBase64Strings.length} base64 images]`}, null, 2));

      // Create property with images included in request (as per guide)
      // Use 'seller' userType to use correct endpoint
      const response: any = await propertyService.createProperty(propertyData, 'seller');
      
      console.log('[AddProperty] Property creation response:', JSON.stringify(response, null, 2));
      
      if (response && response.success) {
        // Property created successfully with images (all auto-approved)
        const imageCount = imageBase64Strings.length;
        const propertyData = response.data?.property || response.data;
        
        // Log returned property data to verify images were saved
        if (propertyData) {
          console.log('[AddProperty] Property created with ID:', propertyData.id || propertyData.property_id);
          console.log('[AddProperty] Property cover_image:', propertyData.cover_image);
          console.log('[AddProperty] Property images array:', propertyData.images);
          
          if (!propertyData.cover_image && propertyData.images && propertyData.images.length > 0) {
            console.warn('[AddProperty] Warning: Property created but cover_image not set. First image:', propertyData.images[0]);
          }
          if (imageCount > 0 && (!propertyData.cover_image && !propertyData.images)) {
            console.error('[AddProperty] Error: Images were sent but not returned in response!');
          }
        }
        
        Alert.alert(
          'Success', 
          `Property listed successfully!${imageCount > 0 ? ` ${imageCount} image(s) included.` : ''}`, 
          [{text: 'OK', onPress: () => navigation.goBack()}]
        );
      } else {
        const errorMessage = response?.message || response?.error?.message || 'Failed to create property';
        console.error('[AddProperty] Property creation failed:', errorMessage);
        console.error('[AddProperty] Full error response:', JSON.stringify(response, null, 2));
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>I want to <Text style={styles.required}>*</Text></Text>
              <View style={styles.typeButtonsContainer}>
                <TouchableOpacity
                  style={styles.typeButton}
                  onPress={() => setPropertyStatus('sale')}>
                  {propertyStatus === 'sale' ? (
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
                    if (locationData.context) {
                      const stateContext = locationData.context.find((ctx: any) => ctx.id?.startsWith('region'));
                      if (stateContext) {
                        setState(stateContext.text || stateContext.name);
                      }
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

            <LocationPicker
              visible={locationPickerVisible}
              initialLocation={latitude && longitude ? {latitude, longitude} : undefined}
              onLocationSelect={(locationData) => {
                setLatitude(locationData.latitude);
                setLongitude(locationData.longitude);
                if (locationData.address) {
                  setLocation(locationData.address);
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
                required={fieldVisibility.furnishingRequired}
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
                {propertyType === 'sell' ? 'Expected Price' : 'Monthly Rent'} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder={propertyType === 'sell' ? 'Enter expected price' : 'Enter monthly rent'}
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
  numberButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
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
    color: '#8B5CF6',
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
  studioButtonText: {
    ...typography.body,
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  hintText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});

export default AddPropertyScreen;
