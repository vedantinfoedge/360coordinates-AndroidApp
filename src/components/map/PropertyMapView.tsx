import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import MapViewComponent from './MapView';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {propertyService} from '../../services/property.service';
import {getPropertyImageUrl} from '../../utils/imageHelper';
import {log} from '../../utils/debug';
import {MAP_CONFIG} from '../../config/mapbox.config';

// Check if Mapbox is available
let isMapboxAvailable = false;
try {
  require('@rnmapbox/maps');
  isMapboxAvailable = true;
} catch (error) {
  console.warn('Mapbox not available:', error);
  isMapboxAvailable = false;
}

interface Property {
  id: string | number;
  title: string;
  location: string;
  price: number;
  status: 'sale' | 'rent';
  latitude: number;
  longitude: number;
  cover_image?: string;
}

interface PropertyMapViewProps {
  properties?: Property[];
  onPropertyPress?: (property: Property) => void;
  initialCenter?: [number, number];
  initialZoom?: number;
  showListToggle?: boolean;
}

const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties: initialProperties,
  onPropertyPress,
  initialCenter = MAP_CONFIG.DEFAULT_CENTER,
  initialZoom = 12,
  showListToggle = true,
}) => {
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [loading, setLoading] = useState(!initialProperties);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    if (!initialProperties) {
      loadProperties();
    }
  }, []);

  const loadProperties = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getProperties({limit: 50});
      
      if (response.success && response.data?.properties) {
        const formattedProperties = response.data.properties
          .filter((prop: any) => prop.latitude && prop.longitude)
          .map((prop: any) => ({
            id: prop.id,
            title: prop.title || prop.property_title,
            location: prop.location || prop.city || 'Location not specified',
            price: parseFloat(prop.price || '0'),
            status: prop.status || prop.property_status || 'sale',
            latitude: parseFloat(prop.latitude),
            longitude: parseFloat(prop.longitude),
            cover_image: prop.cover_image || prop.image,
          }));
        
        setProperties(formattedProperties);
        log.property(`Loaded ${formattedProperties.length} properties for map`);
      }
    } catch (error) {
      log.error('property', 'Error loading properties for map', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (propertyId: string) => {
    const property = properties.find(p => String(p.id) === propertyId);
    if (property) {
      setSelectedProperty(property);
      if (onPropertyPress) {
        onPropertyPress(property);
      }
    }
  };

  const getMarkerColor = (status: string) => {
    return status === 'sale' ? MAP_CONFIG.MARKER_COLORS.SALE : MAP_CONFIG.MARKER_COLORS.RENT;
  };

  // Format price for marker display (as per guide: ₹X.XL format)
  const formatPriceForMarker = (price: number) => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)}Cr`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)}L`;
    } else if (price >= 1000) {
      return `₹${(price / 1000).toFixed(1)}K`;
    }
    return `₹${price}`;
  };

  const markers = properties.map(property => ({
    id: String(property.id),
    coordinate: [property.longitude, property.latitude] as [number, number],
    title: property.title,
    description: `${property.location} - ₹${property.price.toLocaleString('en-IN')}`,
    color: getMarkerColor(property.status),
    price: property.price,
    onPress: () => handleMarkerPress(String(property.id)),
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading properties...</Text>
      </View>
    );
  }

  // Show error if Mapbox is not available
  if (!isMapboxAvailable) {
    return (
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
    );
  }

  return (
    <View style={styles.container}>
      {/* Toggle Button */}
      {showListToggle && (
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'map' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('map')}>
            <Text
              style={[
                styles.toggleText,
                viewMode === 'map' && styles.toggleTextActive,
              ]}>
              🗺️ Map
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'list' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('list')}>
            <Text
              style={[
                styles.toggleText,
                viewMode === 'list' && styles.toggleTextActive,
              ]}>
              📋 List
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          <MapViewComponent
            initialCenter={initialCenter}
            initialZoom={initialZoom}
            markers={markers}
            interactive={true}
          />

          {/* Selected Property Card */}
          {selectedProperty && (
            <View style={styles.propertyCard}>
              <Text style={styles.propertyTitle} numberOfLines={1}>
                {selectedProperty.title}
              </Text>
              <Text style={styles.propertyLocation} numberOfLines={1}>
                {selectedProperty.location}
              </Text>
              <Text style={styles.propertyPrice}>
                ₹{selectedProperty.price.toLocaleString('en-IN')}
                {selectedProperty.status === 'rent' && '/month'}
              </Text>
              <TouchableOpacity
                style={styles.viewButton}
                onPress={() => {
                  if (onPropertyPress) {
                    onPropertyPress(selectedProperty);
                  }
                  setSelectedProperty(null);
                }}>
                <Text style={styles.viewButtonText}>View Details</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <FlatList
          data={properties}
          keyExtractor={item => String(item.id)}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.listItem}
              onPress={() => {
                if (onPropertyPress) {
                  onPropertyPress(item);
                }
              }}>
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.listItemLocation} numberOfLines={1}>
                  {item.location}
                </Text>
                <Text style={styles.listItemPrice}>
                  ₹{item.price.toLocaleString('en-IN')}
                  {item.status === 'rent' && '/month'}
                </Text>
              </View>
              <View style={styles.listItemArrow}>
                <Text style={styles.arrowText}>→</Text>
              </View>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    ...typography.body,
    color: colors.textSecondary,
  },
  toggleContainer: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggleButton: {
    flex: 1,
    padding: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
  },
  toggleButtonActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
  },
  propertyCard: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  propertyTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  propertyLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  propertyPrice: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  viewButton: {
    backgroundColor: colors.primary,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  viewButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  listContent: {
    padding: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  listItemContent: {
    flex: 1,
  },
  listItemTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  listItemLocation: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  listItemPrice: {
    ...typography.body,
    color: colors.accent,
    fontWeight: '600',
  },
  listItemArrow: {
    justifyContent: 'center',
    paddingLeft: spacing.md,
  },
  arrowText: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
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
});

export default PropertyMapView;

