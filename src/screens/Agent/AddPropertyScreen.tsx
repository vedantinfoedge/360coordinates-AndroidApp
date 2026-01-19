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
} from 'react-native';
import {launchImageLibrary, ImagePickerResponse, MediaType} from 'react-native-image-picker';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
<<<<<<< Updated upstream
import {useRoute} from '@react-navigation/native';
=======
>>>>>>> Stashed changes
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

type AddPropertyScreenNavigationProp = BottomTabNavigationProp<
  AgentTabParamList,
  'AddProperty'
>;

type Props = {
  navigation: AddPropertyScreenNavigationProp;
};

type PropertyStatus = 'sell' | 'rent';

const AddPropertyScreen: React.FC<Props> = ({navigation}) => {
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
              <Text style={styles.headerTitle}>List Your Property</Text>
              <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Progress Steps */}
<<<<<<< Updated upstream
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={isUpcomingProject ? styles.progressContainerScroll : styles.progressContainerWrapper}
              contentContainerStyle={isUpcomingProject ? styles.progressContent : styles.progressContainer}>
=======
            <View style={styles.progressContainer}>
>>>>>>> Stashed changes
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
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                {currentStep === totalSteps ? (
                  <View style={styles.publishButtonInner}>
                    <Text style={styles.publishButtonIcon}>✓</Text>
                    <Text style={styles.publishButtonText}>Publish Listing</Text>
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
  progressContainerWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
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
    marginBottom: 2,
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
<<<<<<< Updated upstream
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
=======
>>>>>>> Stashed changes
});

export default AddPropertyScreen;
