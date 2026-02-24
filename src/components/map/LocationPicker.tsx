import React, {useState, useRef, useCallback} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Platform,
  Keyboard,
  FlatList,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MapViewComponent, {MapViewHandle} from './MapView';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {reverseGeocode} from '../../utils/geocoding';
import {MAPBOX_ACCESS_TOKEN} from '../../config/mapbox.config';
import {log} from '../../utils/debug';
import CustomAlert from '../../utils/alertHelper';
import {TabIcon} from '../navigation/TabIcons';

// Conditionally import Mapbox
let Camera: any = null;
let isMapboxAvailable = false;

try {
  const mapboxModule = require('@rnmapbox/maps');
  Camera = mapboxModule.Camera;
  isMapboxAvailable = true;
} catch (error) {
  console.warn('Mapbox not available:', error);
  isMapboxAvailable = false;
}

interface LocationPickerProps {
  visible: boolean;
  initialLocation?: {latitude: number; longitude: number};
  onLocationSelect: (location: {
    latitude: number;
    longitude: number;
    address?: string;
    context?: any[]; // Add context for state extraction
  }) => void;
  onClose: () => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({
  visible,
  initialLocation,
  onLocationSelect,
  onClose,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.longitude, initialLocation.latitude] : null,
  );
  const [address, setAddress] = useState<string>('');
  const [locationContext, setLocationContext] = useState<any[]>([]);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const mapViewRef = useRef<MapViewHandle>(null);

  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSearchLoading(true);
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=in&limit=5&types=place,locality,neighborhood,address,poi`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.features) {
        setSuggestions(data.features);
        setShowSuggestions(true);
      }
    } catch (error) {
      log.error('location', 'Search places error', error);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      searchPlaces(text);
    }, 350);
  }, [searchPlaces]);

  const handleSuggestionSelect = useCallback((feature: any) => {
    const [longitude, latitude] = feature.center;
    const coordinate: [number, number] = [longitude, latitude];
    setSearchText(feature.place_name);
    setSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
    if (mapViewRef.current) {
      mapViewRef.current.flyTo(coordinate, 15);
    }
    handleMapPress(coordinate);
  }, []);

  const handleResetBearing = useCallback(() => {
    if (mapViewRef.current) {
      mapViewRef.current.resetBearing();
    }
  }, []);

  const handleMapPress = async (coordinate: [number, number]) => {
    setSelectedLocation(coordinate);
    setLoadingAddress(true);
    
    try {
      // Reverse geocode to get address using Mapbox API
      const [longitude, latitude] = coordinate;
      const result = await reverseGeocode(latitude, longitude);
      
      if (result && result.placeName) {
        setAddress(result.placeName);
        setLocationContext(result.context || []); // Store context
      } else {
        // Fallback to coordinates if geocoding fails
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setLocationContext([]);
      }
    } catch (error) {
      log.error('location', 'Error getting address', error);
      const [longitude, latitude] = coordinate;
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      setLocationContext([]);
    } finally {
      setLoadingAddress(false);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      const [longitude, latitude] = selectedLocation;
      onLocationSelect({
        latitude,
        longitude,
        address: address || undefined,
        context: locationContext, // Pass context for state extraction
      });
      onClose();
    } else {
      CustomAlert.alert('Error', 'Please select a location on the map');
    }
  };

  const handleUseCurrentLocation = async () => {
    try {
      setLoadingAddress(true);
      
      // Note: react-native-geolocation-service handles permissions automatically
      // For Android, ensure ACCESS_FINE_LOCATION permission is in AndroidManifest.xml

      // Get current location
      Geolocation.getCurrentPosition(
        position => {
          const {latitude, longitude} = position.coords;
          const coordinate: [number, number] = [longitude, latitude];
          setSelectedLocation(coordinate);
          
          if (mapViewRef.current) {
            mapViewRef.current.flyTo(coordinate, 15);
          }
          
          // Get address
          handleMapPress(coordinate);
          log.location('Current location obtained', {latitude, longitude});
        },
        error => {
          log.error('location', 'Error getting current location', error);
          CustomAlert.alert(
            'Location Error',
            'Unable to get your current location. Please select a location on the map.',
          );
          setLoadingAddress(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    } catch (error) {
      log.error('location', 'Error in handleUseCurrentLocation', error);
      CustomAlert.alert('Error', 'Failed to get current location');
      setLoadingAddress(false);
    }
  };

  // Show error if Mapbox is not available
  if (!isMapboxAvailable) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
              <Text style={styles.cancelText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Location</Text>
            <View style={styles.cancelButton} />
          </View>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>🗺️</Text>
            <Text style={styles.errorTitle}>Map Not Available</Text>
            <Text style={styles.errorText}>
              Mapbox native module is not linked.{'\n'}
              Please rebuild the app after installing @rnmapbox/maps
            </Text>
            <Text style={styles.errorSubtext}>
              Run: npx react-native run-android
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Location</Text>
          <TouchableOpacity
            onPress={handleConfirm}
            style={[
              styles.confirmButton,
              !selectedLocation && styles.confirmButtonDisabled,
            ]}
            disabled={!selectedLocation}>
            <Text
              style={[
                styles.confirmText,
                !selectedLocation && styles.confirmTextDisabled,
              ]}>
              Confirm
            </Text>
          </TouchableOpacity>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapViewComponent
            ref={mapViewRef}
            initialCenter={selectedLocation || [73.8567, 18.5204]}
            initialZoom={15}
            onLocationSelect={handleMapPress}
            interactive={true}
            markers={
              selectedLocation
                ? [
                    {
                      id: 'selected',
                      coordinate: selectedLocation,
                      color: colors.primary,
                    },
                  ]
                : []
            }
          />

          {/* Search Bar Overlay */}
          <View style={styles.searchOverlay}>
            <View style={styles.searchBarContainer}>
              <TabIcon name="search" color={colors.textSecondary} size={18} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search city, area, or landmark..."
                placeholderTextColor={colors.textTertiary}
                value={searchText}
                onChangeText={handleSearchChange}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                returnKeyType="search"
                autoCorrect={false}
              />
              {searchLoading && (
                <ActivityIndicator size="small" color={colors.primary} />
              )}
              {searchText.length > 0 && !searchLoading && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchText('');
                    setSuggestions([]);
                    setShowSuggestions(false);
                  }}
                  hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <TabIcon name="close" color={colors.textSecondary} size={16} />
                </TouchableOpacity>
              )}
            </View>

            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={item => item.id}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.suggestionItem}
                      onPress={() => handleSuggestionSelect(item)}>
                      <TabIcon name="location" color={colors.primary} size={16} />
                      <Text style={styles.suggestionText} numberOfLines={2}>
                        {item.place_name}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}
          </View>

          {/* Compass Button */}
          <TouchableOpacity
            style={styles.compassButton}
            onPress={handleResetBearing}
            activeOpacity={0.8}>
            <TabIcon name="navigation" color={colors.primary} size={20} />
          </TouchableOpacity>
        </View>

        {/* Location Info */}
        <View style={styles.infoContainer}>
          {loadingAddress ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Text style={styles.infoLabel}>Selected Location:</Text>
              <Text style={styles.infoText}>
                {address || 'Tap on map to select location'}
              </Text>
              {selectedLocation && (
                <Text style={styles.coordinateText}>
                  {selectedLocation[1].toFixed(6)}, {selectedLocation[0].toFixed(6)}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleUseCurrentLocation}>
            <Text style={styles.actionButtonText}>📍 Use Current Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancelButton: {
    padding: spacing.xs,
  },
  cancelText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
  },
  confirmButton: {
    padding: spacing.xs,
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  confirmTextDisabled: {
    color: colors.textSecondary,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  searchOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? spacing.md : spacing.sm,
    left: spacing.md,
    right: spacing.md,
    zIndex: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.xs,
    gap: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
    paddingVertical: Platform.OS === 'ios' ? spacing.xs : 0,
    margin: 0,
  },
  suggestionsContainer: {
    marginTop: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.borderLight,
  },
  suggestionText: {
    flex: 1,
    ...typography.caption,
    color: colors.text,
  },
  compassButton: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 10,
  },
  infoContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  coordinateText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  actionsContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  actionButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  errorTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  errorSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
});

export default LocationPicker;
