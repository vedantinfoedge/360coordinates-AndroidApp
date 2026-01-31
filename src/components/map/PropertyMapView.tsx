import React, {useState, useEffect} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';
import MapViewComponent from './MapView';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {propertyService} from '../../services/property.service';
import {getPropertyImageUrl, fixImageUrl} from '../../utils/imageHelper';
import {log} from '../../utils/debug';
import {formatters, capitalize} from '../../utils/formatters';
import {favoriteService} from '../../services/favorite.service';
import {Share} from 'react-native';
import {MAP_CONFIG} from '../../config/mapbox.config';
import CustomAlert from '../../utils/alertHelper';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

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
  listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
  selectedPropertyId?: string | number; // Property ID to highlight on map
}

const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties: initialProperties,
  onPropertyPress,
  initialCenter = MAP_CONFIG.DEFAULT_CENTER,
  initialZoom = 12,
  showListToggle = true,
  listingType = 'all',
  selectedPropertyId: propSelectedPropertyId,
}) => {
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [loading, setLoading] = useState(!initialProperties);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    propSelectedPropertyId ? String(propSelectedPropertyId) : null
  );
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(initialCenter);
  const [mapZoom, setMapZoom] = useState<number>(initialZoom);
  
  // Store current property ID (from PropertyDetailsScreen) separately
  const currentPropertyId = propSelectedPropertyId ? String(propSelectedPropertyId) : null;

  useEffect(() => {
    if (!initialProperties) {
      loadProperties();
    } else {
      // Filter initial properties based on listing type
      let filtered = initialProperties;
      if (listingType === 'pg-hostel') {
        filtered = initialProperties.filter((prop: any) => {
          const propType = (prop.property_type || '').toLowerCase();
          return propType.includes('pg') || 
                 propType.includes('hostel') || 
                 propType === 'pg-hostel' ||
                 prop.status === 'pg';
        });
      } else if (listingType === 'buy') {
        filtered = initialProperties.filter((prop: any) => prop.status === 'sale');
      } else if (listingType === 'rent') {
        filtered = initialProperties.filter((prop: any) => prop.status === 'rent');
      }
      setProperties(filtered);
    }
  }, [listingType, initialProperties]);

  // Load selected property and center map on it
  useEffect(() => {
    if (propSelectedPropertyId) {
      loadSelectedPropertyAndRelated();
    }
  }, [propSelectedPropertyId]);

  const loadSelectedPropertyAndRelated = async () => {
    if (!propSelectedPropertyId) return;
    
    try {
      setLoading(true);
      
      // Load the selected property details
      const propertyResponse = await propertyService.getPropertyDetails(propSelectedPropertyId);
      const responseData = propertyResponse as any;
      
      if (responseData && responseData.success && responseData.data?.property) {
        const currentProperty = responseData.data.property;
        
        // If property has coordinates, center map on it
        if (currentProperty.latitude && currentProperty.longitude) {
          const lat = parseFloat(currentProperty.latitude);
          const lng = parseFloat(currentProperty.longitude);
          setMapCenter([lng, lat]);
          setMapZoom(14); // Zoom in closer for single property
          
          // Set as selected property
          const formattedProperty: Property = {
            id: currentProperty.id,
            title: currentProperty.title || currentProperty.property_title || 'Property',
            location: currentProperty.location || currentProperty.city || 'Location not specified',
            price: parseFloat(currentProperty.price || '0'),
            status: currentProperty.status || currentProperty.property_status || 'sale',
            latitude: lat,
            longitude: lng,
            cover_image: currentProperty.cover_image || currentProperty.image,
          };
          
          setSelectedProperty(formattedProperty);
          setSelectedPropertyId(String(currentProperty.id));
          checkFavoriteStatus(String(currentProperty.id));
          
          // Load related properties (same area, similar type) and pass current property
          await loadRelatedProperties(lat, lng, currentProperty.status || currentProperty.property_status, formattedProperty);
        }
      }
    } catch (error) {
      log.error('property', 'Error loading selected property', error);
      // Fallback to regular property loading
      loadProperties();
    } finally {
      setLoading(false);
    }
  };

  const loadRelatedProperties = async (centerLat: number, centerLng: number, propertyStatus?: string, currentProperty?: Property) => {
    try {
      // Build status filter based on listing type or property status
      let statusFilter: 'sale' | 'rent' | 'pg' | undefined = undefined;
      if (listingType === 'buy') {
        statusFilter = 'sale';
      } else if (listingType === 'rent') {
        statusFilter = 'rent';
      } else if (listingType === 'pg-hostel') {
        statusFilter = 'pg';
      } else if (propertyStatus) {
        statusFilter = propertyStatus as 'sale' | 'rent' | 'pg';
      }
      
      const params: any = {
        limit: 50,
        latitude: centerLat,
        longitude: centerLng,
        radius: 5, // 5km radius for related properties
      };
      
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const response = await propertyService.getProperties(params);
      
      if (response.success && response.data?.properties) {
        let formattedProperties = response.data.properties
          .filter((prop: any) => 
            prop.latitude && 
            prop.longitude &&
            String(prop.id) !== String(propSelectedPropertyId) // Exclude current property
          )
          .map((prop: any) => ({
            id: prop.id,
            title: prop.title || prop.property_title,
            location: prop.location || prop.city || 'Location not specified',
            price: parseFloat(prop.price || '0'),
            status: prop.status || prop.property_status || 'sale',
            property_type: prop.property_type || prop.type || '',
            latitude: parseFloat(prop.latitude),
            longitude: parseFloat(prop.longitude),
            cover_image: prop.cover_image || prop.image,
          }));
        
        // Always add current property to the list if provided (for pinning on map)
        if (currentProperty) {
          formattedProperties = [currentProperty, ...formattedProperties];
        }
        
        setProperties(formattedProperties);
        log.property(`Loaded ${formattedProperties.length} related properties for map (including current property)`);
      } else {
        // If no related properties found, still add current property to show it on map
        if (currentProperty) {
          setProperties([currentProperty]);
          log.property(`No related properties found, showing only current property on map`);
        }
      }
    } catch (error) {
      log.error('property', 'Error loading related properties', error);
      // Even if error occurs, show current property on map
      if (currentProperty) {
        setProperties([currentProperty]);
        log.property(`Error loading related properties, showing only current property on map`);
      }
    }
  };

  const loadProperties = async () => {
    try {
      setLoading(true);
      
      // Build status filter based on listing type
      let statusFilter: 'sale' | 'rent' | 'pg' | undefined = undefined;
      if (listingType === 'buy') {
        statusFilter = 'sale';
      } else if (listingType === 'rent') {
        statusFilter = 'rent';
      } else if (listingType === 'pg-hostel') {
        statusFilter = 'pg'; // PG/Hostel filter
      }
      
      const params: any = {limit: 50};
      if (statusFilter) {
        params.status = statusFilter;
      }
      
      const response = await propertyService.getProperties(params);
      
      if (response.success && response.data?.properties) {
        let formattedProperties = response.data.properties
          .filter((prop: any) => prop.latitude && prop.longitude)
          .map((prop: any) => ({
            id: prop.id,
            title: prop.title || prop.property_title,
            location: prop.location || prop.city || 'Location not specified',
            price: parseFloat(prop.price || '0'),
            status: prop.status || prop.property_status || 'sale',
            property_type: prop.property_type || prop.type || '',
            latitude: parseFloat(prop.latitude),
            longitude: parseFloat(prop.longitude),
            cover_image: prop.cover_image || prop.image,
          }));
        
        // Additional filter for PG/Hostel - ensure property_type matches
        if (listingType === 'pg-hostel') {
          formattedProperties = formattedProperties.filter((prop: any) => {
            const propType = (prop.property_type || '').toLowerCase();
            return propType.includes('pg') || 
                   propType.includes('hostel') || 
                   propType === 'pg-hostel' ||
                   prop.status === 'pg';
          });
        }
        
        setProperties(formattedProperties);
        log.property(`Loaded ${formattedProperties.length} properties for map (filter: ${listingType})`);
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
      setSelectedPropertyId(propertyId);
      setCurrentImageIndex(0);
      // Check if property is favorited
      checkFavoriteStatus(propertyId);
    }
  };

  const checkFavoriteStatus = async (propertyId: string) => {
    try {
      const response = await favoriteService.checkFavorite(propertyId);
      setIsFavorite(response?.success && response?.data?.is_favorite || false);
    } catch (error) {
      setIsFavorite(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedProperty) return;
    
    try {
      const response = await favoriteService.toggleFavorite(selectedProperty.id);
      if (response && response.success) {
        setIsFavorite(response.data?.is_favorite ?? !isFavorite);
      }
    } catch (error: any) {
      CustomAlert.alert('Error', error.message || 'Failed to update favorite');
    }
  };

  const handleShare = async () => {
    if (!selectedProperty) return;
    
    try {
      const shareMessage = `Check out this property: ${selectedProperty.title}\nLocation: ${selectedProperty.location}\nPrice: ${formatters.price(selectedProperty.price, selectedProperty.status === 'rent')}\n\nVisit us: https://360coordinates.com`;
      
      await Share.share({
        message: shareMessage,
        title: selectedProperty.title,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        CustomAlert.alert('Error', 'Failed to share property');
      }
    }
  };

  const getMarkerColor = (propertyId: string | number) => {
    const propIdStr = String(propertyId);
    
    // Green (#10B981) if it's the current property (from PropertyDetailsScreen)
    if (currentPropertyId && currentPropertyId === propIdStr) {
      return '#10B981'; // Green color for current property
    }
    
    // Orange (#F97316) if selected/clicked on map
    if (selectedPropertyId === propIdStr) {
      return '#F97316'; // Orange color for selected property
    }
    
    // Blue (#0077C0) for all other properties
    return '#0077C0'; // Blue color for other properties
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
    color: getMarkerColor(property.id),
    price: property.price || 0, // Ensure price is always a number
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
            initialCenter={mapCenter || initialCenter}
            initialZoom={mapZoom || initialZoom}
            markers={markers}
            interactive={true}
          />

          {/* Selected Property Card - Compact Popup (aside the pin) */}
          {selectedProperty && (
            <View style={styles.propertyCardOverlay}>
              <TouchableOpacity
                style={styles.overlayTouchable}
                activeOpacity={1}
                onPress={() => {
                  setSelectedProperty(null);
                  setSelectedPropertyId(null);
                }}
              />
              <TouchableOpacity
                style={styles.propertyCard}
                activeOpacity={1}
                onPress={() => {
                  // Navigate to property details when card is clicked
                  if (onPropertyPress) {
                    onPropertyPress(selectedProperty);
                  }
                  setSelectedProperty(null);
                  setSelectedPropertyId(null);
                }}>
                {/* Compact Image Section */}
                <View style={styles.popupCardImageContainer}>
                  {selectedProperty.cover_image ? (
                    <Image
                      source={{uri: fixImageUrl(selectedProperty.cover_image)}}
                      style={styles.popupCardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.popupCardImagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>📷</Text>
                    </View>
                  )}
                  
                  {/* Image Overlay - Compact */}
                  <View style={styles.popupCardImageOverlay}>
                    {/* Close Button - Top Right */}
                    <TouchableOpacity
                      style={styles.popupCardCloseBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setSelectedProperty(null);
                        setSelectedPropertyId(null);
                      }}>
                      <Text style={styles.closeButtonIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Compact Content Section */}
                <View style={styles.popupCardContent}>
                  <Text style={styles.popupCardTitle} numberOfLines={1}>
                    {capitalize(selectedProperty.title || 'Property')}
                  </Text>
                  <Text style={styles.popupCardDescription} numberOfLines={1}>
                    {selectedProperty.location || 'Location not specified'}
                  </Text>
                  <View style={styles.popupCardPriceSection}>
                    <Text style={styles.popupCardPrice}>
                      {formatters.price(selectedProperty.price, selectedProperty.status === 'rent')}
                    </Text>
                  </View>
                  {/* Action Buttons Row */}
                  <View style={styles.popupCardActionRow}>
                    <TouchableOpacity
                      style={[styles.popupCardActionBtn, isFavorite && styles.popupCardActionBtnActive]}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite();
                      }}>
                      <Text style={styles.actionButtonText}>{isFavorite ? '❤️' : '🤍'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.popupCardActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}>
                      <Text style={styles.actionButtonText}>🔗</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.popupCardViewBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        if (onPropertyPress) {
                          onPropertyPress(selectedProperty);
                        }
                      }}>
                      <Text style={styles.viewButtonText}>View</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
  propertyCardOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: spacing.md,
    paddingRight: spacing.md,
    zIndex: 1000,
    pointerEvents: 'box-none',
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: Math.min(280, SCREEN_WIDTH * 0.75),
    maxWidth: 280,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
    pointerEvents: 'auto',
  },
  // Compact Image Section (50% of card)
  popupCardImageContainer: {
    width: '100%',
    height: 140,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  popupCardImage: {
    width: '100%',
    height: '100%',
  },
  popupCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  imagePlaceholderText: {
    fontSize: 32,
  },
  popupCardImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    padding: 8,
  },
  popupCardCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Compact Content Section (50% of card)
  popupCardContent: {
    padding: spacing.sm,
    paddingTop: spacing.xs,
  },
  popupCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
    lineHeight: 16,
  },
  popupCardDescription: {
    fontSize: 11,
    color: '#717171',
    marginBottom: 6,
    lineHeight: 14,
  },
  popupCardPriceSection: {
    marginBottom: 8,
  },
  popupCardPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  popupCardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  popupCardActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  popupCardActionBtnActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  actionButtonText: {
    fontSize: 14,
  },
  popupCardViewBtn: {
    flex: 1,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  viewButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.surface,
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

