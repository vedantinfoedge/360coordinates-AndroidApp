import React, {useState} from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import Dropdown from '../../components/common/Dropdown';
import {propertyService} from '../../services/property.service';
import {moderationService} from '../../services/moderation.service';

type AddPropertyScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'AddProperty'
>;

type Props = {
  navigation: AddPropertyScreenNavigationProp;
};

type PropertyType = 'sell' | 'rent';
type PropertyCategory = 'apartment' | 'villa' | 'house' | 'rowhouse' | '';

const amenitiesList = [
  {id: 'parking', label: 'Parking', icon: '🚗'},
  {id: 'lift', label: 'Lift', icon: '🛗'},
  {id: 'security', label: '24x7 Security', icon: '👮'},
  {id: 'power', label: 'Power Backup', icon: '⚡'},
  {id: 'gym', label: 'Gym', icon: '🏋️'},
  {id: 'pool', label: 'Swimming Pool', icon: '🏊'},
  {id: 'garden', label: 'Garden', icon: '🌳'},
  {id: 'clubhouse', label: 'Club House', icon: '🏛️'},
  {id: 'playarea', label: "Children's Play Area", icon: '🛝'},
  {id: 'cctv', label: 'CCTV', icon: '📹'},
  {id: 'intercom', label: 'Intercom', icon: '📞'},
  {id: 'firesafety', label: 'Fire Safety', icon: '🔥'},
  {id: 'water', label: '24x7 Water', icon: '💧'},
  {id: 'gas', label: 'Gas Pipeline', icon: '🔥'},
  {id: 'wifi', label: 'WiFi', icon: '📶'},
  {id: 'ac', label: 'Air Conditioning', icon: '❄️'},
];

const AddPropertyScreen: React.FC<Props> = ({navigation}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyTitle, setPropertyTitle] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('sell');
  const [propertyCategory, setPropertyCategory] = useState<PropertyCategory>('');
  const [location, setLocation] = useState('');
  const [bedrooms, setBedrooms] = useState<number | null>(null);
  const [bathrooms, setBathrooms] = useState<number | null>(null);
  const [balconies, setBalconies] = useState<number | null>(null);
  const [builtUpArea, setBuiltUpArea] = useState('');
  const [carpetArea, setCarpetArea] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [facing, setFacing] = useState('');
  const [propertyAge, setPropertyAge] = useState('');
  const [furnishing, setFurnishing] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [expectedPrice, setExpectedPrice] = useState('');
  const [priceNegotiable, setPriceNegotiable] = useState(false);
  const [maintenance, setMaintenance] = useState('');

  const totalSteps = 5;
  const steps = [
    {id: 1, name: 'Basic Info', icon: '📝'},
    {id: 2, name: 'Property Details', icon: '🏠'},
    {id: 3, name: 'Amenities', icon: '✨'},
    {id: 4, name: 'Photos', icon: '📷'},
    {id: 5, name: 'Pricing', icon: '💰'},
  ];

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
      quality: 0.8,
      selectionLimit: 10 - photos.length,
      includeBase64: false,
    };

    launchImageLibrary(options, (response: ImagePickerResponse) => {
      if (response.didCancel) {
        return;
      }

      if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick image');
        return;
      }

      if (response.assets && response.assets.length > 0) {
        const newPhotos = response.assets
          .map(asset => asset.uri)
          .filter((uri): uri is string => uri !== undefined);
        
        if (photos.length + newPhotos.length > 10) {
          Alert.alert('Limit Reached', 'You can upload maximum 10 photos');
          setPhotos([...photos, ...newPhotos.slice(0, 10 - photos.length)]);
        } else {
          setPhotos([...photos, ...newPhotos]);
        }
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
      if (!propertyCategory) {
        Alert.alert('Error', 'Please select property type');
        return;
      }
    }
    if (currentStep === 2) {
      if (!location.trim()) {
        Alert.alert('Error', 'Please enter location');
        return;
      }
      if (bedrooms === null) {
        Alert.alert('Error', 'Please select number of bedrooms');
        return;
      }
      if (bathrooms === null) {
        Alert.alert('Error', 'Please select number of bathrooms');
        return;
      }
      if (!builtUpArea.trim()) {
        Alert.alert('Error', 'Please enter built-up area');
        return;
      }
    }
    if (currentStep === 3) {
      if (!description.trim()) {
        Alert.alert('Error', 'Please enter property description');
        return;
      }
    }
    if (currentStep === 5) {
      if (!expectedPrice.trim()) {
        Alert.alert('Error', 'Please enter expected price');
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

      // Map property category to database property_type
      const propertyTypeMap: {[key: string]: string} = {
        'apartment': 'Apartment',
        'villa': 'Villa / Banglow',
        'house': 'Row House/ Farm House',
        'rowhouse': 'Row House/ Farm House',
      };

      const propertyData = {
        title: propertyTitle,
        status: propertyType === 'sell' ? 'sale' : 'rent',
        property_type: propertyTypeMap[propertyCategory] || propertyCategory,
        location: location,
        bedrooms: bedrooms?.toString() || null,
        bathrooms: bathrooms?.toString() || null,
        balconies: balconies?.toString() || null,
        area: parseFloat(builtUpArea) || 0,
        carpet_area: carpetArea ? parseFloat(carpetArea) : null,
        total_floors: totalFloors ? parseInt(totalFloors) : null,
        floor: null, // Can be added later
        facing: facing || null,
        age: propertyAge || null,
        furnishing: furnishing || null,
        description: description || null,
        price: parseFloat(expectedPrice.replace(/[^0-9.]/g, '')) || 0,
        price_negotiable: priceNegotiable ? 1 : 0,
        maintenance_charges: maintenance ? parseFloat(maintenance.replace(/[^0-9.]/g, '')) : null,
        deposit_amount: null, // Can be added later
        amenities: selectedAmenities,
      };

      // Create property first
      const response = await propertyService.createProperty(propertyData);
      
      if (response.success) {
        const propertyId = response.data?.property_id || response.data?.id || response.data?.property?.id;
        
        // Upload images with moderation if property was created and images are available
        // As per guide: Upload image with moderation FIRST, image URLs are already full URLs from backend
        if (propertyId && photos.length > 0) {
          try {
            const uploadedImageUrls: string[] = [];
            const uploadResults = await Promise.all(
              photos.map(photoUri => moderationService.uploadWithModeration(photoUri, propertyId))
            );
            
            // Check moderation_status: 'SAFE' as per guide
            // Main fix: Use 'success' instead of 'approved' and verify moderation_status === 'SAFE'
            const approved = uploadResults.filter(r => 
              (r.status === 'success' || r.status === 'approved') && 
              (r.moderation_status === 'SAFE' || r.moderation_status === 'APPROVED')
            ).length;
            const pending = uploadResults.filter(r => 
              r.status === 'pending' || 
              (r.status === 'success' && r.moderation_status === 'PENDING')
            ).length;
            const rejected = uploadResults.filter(r => 
              r.status === 'rejected' || 
              r.status === 'failed' ||
              r.moderation_status === 'UNSAFE'
            ).length;
            
            // Collect approved/pending image URLs (already full URLs from backend)
            // Only collect if status is 'success' and moderation_status is 'SAFE' or 'APPROVED'
            uploadResults.forEach(result => {
              const isApproved = (result.status === 'success' || result.status === 'approved') && 
                                 (result.moderation_status === 'SAFE' || result.moderation_status === 'APPROVED');
              const isPending = result.status === 'pending' || 
                               (result.status === 'success' && result.moderation_status === 'PENDING');
              
              if ((isApproved || isPending) && result.image_url) {
                uploadedImageUrls.push(result.image_url);
              }
            });
            
            if (uploadedImageUrls.length > 0) {
              console.log('[AddProperty] Images saved:', uploadedImageUrls);
            }
            
            if (rejected > 0) {
              Alert.alert(
                'Image Moderation',
                `${rejected} image(s) were rejected. ${approved} approved, ${pending} pending review.`
              );
            } else if (pending > 0) {
              Alert.alert(
                'Image Moderation',
                `${pending} image(s) are pending admin review. ${approved} approved.`
              );
            } else {
              console.log('[AddProperty] All images uploaded and approved successfully');
            }
          } catch (imageError: any) {
            console.error('[AddProperty] Error uploading images:', imageError);
            Alert.alert('Warning', 'Property created but some images failed to upload. You can add images later.');
          }
        }
        
        Alert.alert('Success', 'Property listed successfully!', [
          {text: 'OK', onPress: () => navigation.goBack()},
        ]);
      } else {
        Alert.alert('Error', response.message || 'Failed to create property');
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
                  onPress={() => setPropertyType('sell')}>
                  {propertyType === 'sell' ? (
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
                  onPress={() => setPropertyType('rent')}>
                  {propertyType === 'rent' ? (
                    <LinearGradient
                      colors={['#8B5CF6', '#6D28D9']}
                      start={{x: 0, y: 0}}
                      end={{x: 1, y: 0}}
                      style={styles.typeButtonGradient}>
                      <Text style={styles.typeButtonIcon}>🔑</Text>
                      <Text style={styles.typeButtonTextSelected}>Rent / Lease</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.typeButtonUnselected}>
                      <Text style={styles.typeButtonIcon}>🔑</Text>
                      <Text style={styles.typeButtonText}>Rent / Lease</Text>
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
                <TouchableOpacity
                  style={[
                    styles.propertyTypeButton,
                    propertyCategory === 'apartment' && styles.propertyTypeButtonActive,
                  ]}
                  onPress={() => setPropertyCategory('apartment')}>
                  <Text style={styles.propertyTypeIcon}>🏢</Text>
                  <Text
                    style={[
                      styles.propertyTypeText,
                      propertyCategory === 'apartment' && styles.propertyTypeTextActive,
                    ]}>
                    Apartment
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.propertyTypeButton,
                    propertyCategory === 'villa' && styles.propertyTypeButtonActive,
                  ]}
                  onPress={() => setPropertyCategory('villa')}>
                  <Text style={styles.propertyTypeIcon}>🏡</Text>
                  <Text
                    style={[
                      styles.propertyTypeText,
                      propertyCategory === 'villa' && styles.propertyTypeTextActive,
                    ]}>
                    Villa / Banglow
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.propertyTypeButton,
                    propertyCategory === 'house' && styles.propertyTypeButtonActive,
                  ]}
                  onPress={() => setPropertyCategory('house')}>
                  <Text style={styles.propertyTypeIcon}>🏠</Text>
                  <Text
                    style={[
                      styles.propertyTypeText,
                      propertyCategory === 'house' && styles.propertyTypeTextActive,
                    ]}>
                    Independent House
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.propertyTypeButton,
                    propertyCategory === 'rowhouse' && styles.propertyTypeButtonActive,
                  ]}
                  onPress={() => setPropertyCategory('rowhouse')}>
                  <Text style={styles.propertyTypeIcon}>🏘️</Text>
                  <Text
                    style={[
                      styles.propertyTypeText,
                      propertyCategory === 'rowhouse' && styles.propertyTypeTextActive,
                    ]}>
                    Row House/ Farm House
                  </Text>
                </TouchableOpacity>
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
              <TextInput
                style={styles.input}
                placeholder="Enter locality, area or landmark"
                placeholderTextColor={colors.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Property Location on Map (Optional)</Text>
              <TouchableOpacity style={styles.mapButton}>
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
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Bedrooms <Text style={styles.required}>*</Text>
              </Text>
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
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Bathrooms <Text style={styles.required}>*</Text>
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>
                Built-up Area <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.areaInputContainer}>
                <TextInput
                  style={[styles.input, styles.areaInput]}
                  placeholder="Enter area"
                  placeholderTextColor={colors.textSecondary}
                  value={builtUpArea}
                  onChangeText={setBuiltUpArea}
                  keyboardType="numeric"
                />
                <Text style={styles.areaUnit}>sq.ft</Text>
              </View>
            </View>

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

            <Dropdown
              label="Facing"
              placeholder="Select facing direction"
              options={[
                {label: 'North', value: 'north'},
                {label: 'South', value: 'south'},
                {label: 'East', value: 'east'},
                {label: 'West', value: 'west'},
                {label: 'North-East', value: 'north-east'},
                {label: 'North-West', value: 'north-west'},
                {label: 'South-East', value: 'south-east'},
                {label: 'South-West', value: 'south-west'},
              ]}
              value={facing}
              onSelect={setFacing}
            />

            <Dropdown
              label="Property Age"
              placeholder="Select property age"
              options={[
                {label: 'Under Construction', value: 'under-construction'},
                {label: '0-1 Years', value: '0-1'},
                {label: '1-5 Years', value: '1-5'},
                {label: '5-10 Years', value: '5-10'},
                {label: '10-15 Years', value: '10-15'},
                {label: '15-20 Years', value: '15-20'},
                {label: '20+ Years', value: '20+'},
              ]}
              value={propertyAge}
              onSelect={setPropertyAge}
            />

            <Dropdown
              label="Furnishing"
              placeholder="Select furnishing status"
              options={[
                {label: 'Unfurnished', value: 'unfurnished'},
                {label: 'Semi-Furnished', value: 'semi-furnished'},
                {label: 'Fully Furnished', value: 'fully-furnished'},
              ]}
              value={furnishing}
              onSelect={setFurnishing}
            />
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
                {amenitiesList.map(amenity => (
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
                placeholder="Describe your property in detail. Mention unique features, nearby landmarks, connectivity, etc."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>{description.length}/1000</Text>
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
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoPreviewItem}>
                    <Image source={{uri: photo}} style={styles.photoPreviewImage} />
                    <TouchableOpacity
                      style={styles.photoRemoveButton}
                      onPress={() => {
                        setPhotos(prev => prev.filter((_, i) => i !== index));
                      }}>
                      <Text style={styles.photoRemoveText}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
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
                Expected Price <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[styles.input, styles.priceInput]}
                  placeholder="Enter expected price"
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
                  {propertyCategory === 'apartment'
                    ? 'Apartment'
                    : propertyCategory === 'villa'
                    ? 'Villa / Banglow'
                    : propertyCategory === 'house'
                    ? 'Independent House'
                    : propertyCategory === 'rowhouse'
                    ? 'Row House/ Farm House'
                    : 'N/A'}
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
});

export default AddPropertyScreen;
