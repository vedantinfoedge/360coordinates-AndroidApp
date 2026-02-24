import React, {useEffect, useImperativeHandle, useRef, useState, forwardRef} from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import {MAP_CONFIG, initializeMapbox, MAPBOX_ACCESS_TOKEN} from '../../config/mapbox.config';
import {colors, spacing, typography} from '../../theme';
import {log} from '../../utils/debug';
import CustomAlert from '../../utils/alertHelper';

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

export interface MapViewHandle {
  getPointInView: (coordinate: [number, number]) => Promise<[number, number] | null>;
  flyTo: (center: [number, number], zoom?: number) => void;
  resetBearing: () => void;
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
    price?: number; // Price is optional (not needed for location picker)
    onPress?: () => void;
  }>;
  onLocationSelect?: (coordinate: [number, number]) => void;
  showUserLocation?: boolean;
  interactive?: boolean;
  style?: any;
}

const MapViewComponent = forwardRef<MapViewHandle, MapViewProps>(function MapViewComponent(
  {
    initialCenter = MAP_CONFIG.DEFAULT_CENTER,
    initialZoom = MAP_CONFIG.DEFAULT_ZOOM,
    markers = [],
    onLocationSelect,
    showUserLocation = false,
    interactive = true,
    style,
  },
  ref,
) {
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const cameraRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  useImperativeHandle(
    ref,
    () => ({
      getPointInView: async (coordinate: [number, number]): Promise<[number, number] | null> => {
        if (!mapRef.current?.getPointInView) return null;
        try {
          const point = await mapRef.current.getPointInView(coordinate);
          return point ? [point[0], point[1]] : null;
        } catch {
          return null;
        }
      },
      flyTo: (center: [number, number], zoom?: number) => {
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            centerCoordinate: center,
            zoomLevel: zoom ?? 15,
            animationDuration: 1000,
            animationMode: 'flyTo',
          });
        }
      },
      resetBearing: () => {
        if (cameraRef.current) {
          cameraRef.current.setCamera({
            heading: 0,
            animationDuration: 500,
            animationMode: 'easeTo',
          });
        }
      },
    }),
    [],
  );

  useEffect(() => {
    initializeMapbox();
    requestLocationPermission();
  }, []);

  // Animate camera when center or zoom changes (e.g. after location search)
  useEffect(() => {
    if (!loading && cameraRef.current && initialCenter) {
      cameraRef.current.setCamera({
        centerCoordinate: initialCenter,
        zoomLevel: initialZoom ?? MAP_CONFIG.DEFAULT_ZOOM,
        animationDuration: 800,
        animationMode: 'flyTo',
      });
    }
  }, [initialCenter, initialZoom, loading]);

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
      (position: any) => {
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
      (error: any) => {
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
      CustomAlert.alert(marker.title, marker.description || '');
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
        ref={mapRef}
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
          CustomAlert.alert('Error', 'Failed to load map. Please check your internet connection.');
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

        {/* Property markers with price tags (website style) or simple markers */}
        {markers.map(marker => {
          // Default blue (#0077C0), Selected orange (#F97316)
          const markerColor = marker.color || '#0077C0';
          const isSelected = markerColor === '#F97316';
          const hasPrice = marker.price !== undefined && marker.price !== null;
          
          // If marker has a price, show price tag
          if (hasPrice) {
            // Format price for marker - show exact price with proper formatting
            const formatPrice = (price: number) => {
              if (!price || price === 0) return '₹0';
              // Format with Indian number system (lakhs, crores)
              if (price >= 10000000) {
                const crores = price / 10000000;
                return crores % 1 === 0 ? `${crores.toFixed(0)}Cr` : `${crores.toFixed(1)}Cr`;
              } else if (price >= 100000) {
                const lakhs = price / 100000;
                return lakhs % 1 === 0 ? `${lakhs.toFixed(0)}L` : `${lakhs.toFixed(1)}L`;
              } else if (price >= 1000) {
                const thousands = price / 1000;
                return thousands % 1 === 0 ? `${thousands.toFixed(0)}K` : `${thousands.toFixed(1)}K`;
              }
              return price.toLocaleString('en-IN');
            };
            
            const priceText = formatPrice(marker.price!);
            
            return (
              <PointAnnotation
                key={marker.id}
                id={marker.id}
                coordinate={marker.coordinate}
                anchor={{x: 0.5, y: 0.5}}
                onSelected={() => handleMarkerPress(marker.id)}>
                <View style={[styles.priceTagMarker, isSelected && styles.priceTagMarkerSelected]}>
                  <View style={[styles.priceTag, {backgroundColor: markerColor}]}>
                    <Text style={styles.priceTagText} numberOfLines={1} adjustsFontSizeToFit={true} minimumFontScale={0.8}>
                      ₹{priceText}
                    </Text>
                  </View>
                </View>
              </PointAnnotation>
            );
          }
          
          // If no price, show modern pin marker (for location picker, etc.)
          return (
            <PointAnnotation
              key={marker.id}
              id={marker.id}
              coordinate={marker.coordinate}
              anchor={{x: 0.5, y: 1}}
              onSelected={() => handleMarkerPress(marker.id)}>
              <View style={styles.pinContainer}>
                <View style={[styles.pinHead, {backgroundColor: markerColor}]}>
                  <View style={styles.pinInnerCircle} />
                </View>
                <View style={[styles.pinTail, {borderTopColor: markerColor}]} />
                <View style={styles.pinShadow} />
              </View>
            </PointAnnotation>
          );
        })}
      </Mapbox.MapView>
    </View>
  );
});

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
  // Price tag marker (website style)
  priceTagMarker: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  priceTagMarkerSelected: {
    zIndex: 100, // Selected markers on top
  },
  priceTag: {
    backgroundColor: '#0077C0', // Default blue
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20, // Pill-shaped
    minWidth: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  priceTagText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
    textAlign: 'center',
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
  pinContainer: {
    alignItems: 'center',
    width: 40,
    height: 52,
  },
  pinHead: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0077C0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 2,
  },
  pinInnerCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderTopWidth: 14,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#0077C0',
    marginTop: -4,
    zIndex: 1,
  },
  pinShadow: {
    width: 14,
    height: 6,
    borderRadius: 7,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginTop: 2,
  },
});

export default MapViewComponent;
