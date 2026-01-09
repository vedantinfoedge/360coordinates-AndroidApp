import React, {useState, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import MapViewComponent from './MapView';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {reverseGeocode} from '../../utils/geocoding';
import {log} from '../../utils/debug';

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
  onLocationSelect: (location: {latitude: number; longitude: number; address?: string}) => void;
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
  const [loadingAddress, setLoadingAddress] = useState(false);
  const cameraRef = useRef<any>(null);

  const handleMapPress = async (coordinate: [number, number]) => {
    setSelectedLocation(coordinate);
    setLoadingAddress(true);
    
    try {
      // Reverse geocode to get address using Mapbox API
      const [longitude, latitude] = coordinate;
      const result = await reverseGeocode(latitude, longitude);
      
      if (result && result.placeName) {
        setAddress(result.placeName);
      } else {
        // Fallback to coordinates if geocoding fails
        setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
      }
    } catch (error) {
      log.error('location', 'Error getting address', error);
      const [longitude, latitude] = coordinate;
      setAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
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
      });
      onClose();
    } else {
      Alert.alert('Error', 'Please select a location on the map');
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
          
          // Update camera
          if (cameraRef.current) {
            cameraRef.current.setCamera({
              centerCoordinate: coordinate,
              zoomLevel: 15,
              animationDuration: 1000,
            });
          }
          
          // Get address
          handleMapPress(coordinate);
          log.location('Current location obtained', {latitude, longitude});
        },
        error => {
          log.error('location', 'Error getting current location', error);
          Alert.alert(
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
      Alert.alert('Error', 'Failed to get current location');
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
            initialCenter={selectedLocation || [77.2090, 28.6139]}
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
