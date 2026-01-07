import React, {useEffect, useRef, useState} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  Alert,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {MAP_CONFIG, initializeMapbox, MAPBOX_ACCESS_TOKEN} from '../../config/mapbox.config';
import {colors, spacing, typography} from '../../theme';
import {log} from '../../utils/debug';

// Conditionally import Mapbox to prevent crashes if not linked
let Mapbox: any = null;
let Camera: any = null;
let PointAnnotation: any = null;
let isMapboxAvailable = false;

try {
  const mapboxModule = require('@rnmapbox/maps');
  Mapbox = mapboxModule.default;
  Camera = mapboxModule.Camera;
  PointAnnotation = mapboxModule.PointAnnotation;
  isMapboxAvailable = true;
  
  // Set access token if available
  if (MAPBOX_ACCESS_TOKEN && MAPBOX_ACCESS_TOKEN !== 'YOUR_MAPBOX_ACCESS_TOKEN_HERE') {
    Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
  }
} catch (error) {
  console.warn('Mapbox not available. Please rebuild the app after installing @rnmapbox/maps:', error);
  isMapboxAvailable = false;
}

interface MapViewProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  markers?: Array<{
    id: string;
    coordinate: [number, number];
    title?: string;
    description?: string;
    color?: string;
    price?: number;
    onPress?: () => void;
  }>;
  onLocationSelect?: (coordinate: [number, number]) => void;
  showUserLocation?: boolean;
  interactive?: boolean;
  style?: any;
}

const MapViewComponent: React.FC<MapViewProps> = ({
  initialCenter = MAP_CONFIG.DEFAULT_CENTER,
  initialZoom = MAP_CONFIG.DEFAULT_ZOOM,
  markers = [],
  onLocationSelect,
  showUserLocation = false,
  interactive = true,
  style,
}) => {
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    initializeMapbox();
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          log.location('Location permission granted');
          if (showUserLocation) {
            getCurrentLocation();
          }
        } else {
          log.warn('location', 'Location permission denied');
        }
      } catch (err) {
        log.error('location', 'Error requesting location permission', err);
      }
    } else if (showUserLocation) {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    const Geolocation = require('react-native-geolocation-service').default;
    
    Geolocation.getCurrentPosition(
      position => {
        const {latitude, longitude} = position.coords;
        const coordinate: [number, number] = [longitude, latitude];
        setUserLocation(coordinate);
        
        // Update camera to user location
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: coordinate,
            zoomLevel: 15,
            animationDuration: 1000,
          });
        }
        
        log.location('Current location obtained', {latitude, longitude});
      },
      error => {
        log.error('location', 'Error getting current location', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      },
    );
  };

  const handleMapPress = (feature: any) => {
    if (onLocationSelect && interactive) {
      const coordinate: [number, number] = feature.geometry.coordinates;
      onLocationSelect(coordinate);
      log.location('Location selected', coordinate);
    }
  };

  const handleMarkerPress = (markerId: string) => {
    const marker = markers.find(m => m.id === markerId);
    if (marker?.onPress) {
      marker.onPress();
    } else if (marker?.title) {
      Alert.alert(marker.title, marker.description || '');
    }
  };

  // Show error if Mapbox is not available
  if (!isMapboxAvailable) {
    return (
      <View style={[styles.container, style]}>
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
    );
  }

  return (
    <View style={[styles.container, style]}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      
      <Mapbox.MapView
        style={styles.map}
        styleURL={MAP_CONFIG.STYLE_URL}
        onPress={handleMapPress}
        onDidFinishLoadingMap={() => {
          setLoading(false);
          log.location('Map loaded successfully');
        }}
        onDidFailLoadingMap={(error: any) => {
          setLoading(false);
          log.error('location', 'Map failed to load', error);
          Alert.alert('Error', 'Failed to load map. Please check your internet connection.');
        }}>
        <Camera
          ref={cameraRef}
          centerCoordinate={initialCenter}
          zoomLevel={initialZoom}
          animationMode="flyTo"
          animationDuration={2000}
        />

        {/* User location */}
        {showUserLocation && userLocation && (
          <PointAnnotation
            id="user-location"
            coordinate={userLocation}
            anchor={{x: 0.5, y: 0.5}}>
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationDot} />
            </View>
          </PointAnnotation>
        )}

        {/* Property markers with price labels (as per guide) */}
        {markers.map(marker => {
          // Format price for marker (₹X.XL format)
          const formatPrice = (price: number) => {
            if (price >= 10000000) {
              return `₹${(price / 10000000).toFixed(1)}Cr`;
            } else if (price >= 100000) {
              return `₹${(price / 100000).toFixed(1)}L`;
            } else if (price >= 1000) {
              return `₹${(price / 1000).toFixed(1)}K`;
            }
            return `₹${price}`;
          };
          
          const priceText = marker.price ? formatPrice(marker.price) : '';
          
          return (
            <PointAnnotation
              key={marker.id}
              id={marker.id}
              coordinate={marker.coordinate}
              anchor={{x: 0.5, y: 1}}
              onSelected={() => handleMarkerPress(marker.id)}>
              <View style={styles.markerContainer}>
                {priceText ? (
                  <View style={[styles.marker, {backgroundColor: marker.color || colors.primary}]}>
                    <Text style={styles.markerText}>{priceText}</Text>
                  </View>
                ) : (
                  <View style={[styles.marker, {backgroundColor: marker.color || colors.primary}]}>
                    <View style={styles.markerInner} />
                  </View>
                )}
                <View style={styles.markerDot} />
              </View>
            </PointAnnotation>
          );
        })}
      </Mapbox.MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  },
  errorSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: spacing.sm,
    color: colors.textSecondary,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.surface,
    minWidth: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerText: {
    color: colors.surface,
    fontWeight: 'bold',
    fontSize: 12,
  },
  markerInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.surface,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userLocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
  },
});

export default MapViewComponent;
