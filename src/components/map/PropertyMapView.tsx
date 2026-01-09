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
import {formatters} from '../../utils/formatters';
import {favoriteService} from '../../services/favorite.service';
import {Share, Alert} from 'react-native';
import {MAP_CONFIG} from '../../config/mapbox.config';

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
}

const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties: initialProperties,
  onPropertyPress,
  initialCenter = MAP_CONFIG.DEFAULT_CENTER,
  initialZoom = 12,
  showListToggle = true,
  listingType = 'all',
}) => {
  const [properties, setProperties] = useState<Property[]>(initialProperties || []);
  const [loading, setLoading] = useState(!initialProperties);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      Alert.alert('Error', error.message || 'Failed to update favorite');
    }
  };

  const handleShare = async () => {
    if (!selectedProperty) return;
    
    try {
      const shareUrl = `https://demo1.indiapropertys.com/property/${selectedProperty.id}`;
      const shareMessage = `Check out this property: ${selectedProperty.title}\nLocation: ${selectedProperty.location}\nPrice: ${formatters.price(selectedProperty.price, selectedProperty.status === 'rent')}\n\nView more: ${shareUrl}`;
      
      await Share.share({
        message: shareMessage,
        title: selectedProperty.title,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share property');
      }
    }
  };

  const getMarkerColor = (propertyId: string | number) => {
    // Orange (#F97316) if selected, Purple (#8B5CF6) if not
    return selectedPropertyId === String(propertyId) ? '#F97316' : '#8B5CF6';
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
            initialCenter={initialCenter}
            initialZoom={initialZoom}
            markers={markers}
            interactive={true}
          />

          {/* Selected Property Card - Popup (as per guide) */}
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
                {/* Image Section (65% height) */}
                <View style={styles.popupCardImageContainer}>
                  {selectedProperty.cover_image ? (
                    <Image
                      source={{uri: fixImageUrl(selectedProperty.cover_image)}}
                      style={styles.popupCardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.popupCardImagePlaceholder}>
                      <Text style={styles.imagePlaceholderText}>No Image</Text>
                    </View>
                  )}
                  
                  {/* Image Overlay */}
                  <View style={styles.popupCardImageOverlay}>
                    {/* Left: Action Buttons */}
                    <View style={styles.popupCardActionButtons}>
                      <TouchableOpacity
                        style={[styles.popupCardHeartBtn, isFavorite && styles.popupCardHeartBtnActive]}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleToggleFavorite();
                        }}>
                        <Text style={styles.actionButtonIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.popupCardShareBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleShare();
                        }}>
                        <Text style={styles.actionButtonIcon}>🔗</Text>
                      </TouchableOpacity>
                    </View>
                    
                    {/* Right: Close Button */}
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
                
                {/* Content Section (35% height) */}
                <View style={styles.popupCardContent}>
                  <Text style={styles.popupCardTitle} numberOfLines={2}>
                    {selectedProperty.title?.toUpperCase() || 'PROPERTY'}
                  </Text>
                  <Text style={styles.popupCardDescription} numberOfLines={2}>
                    {selectedProperty.location || 'Location not specified'}
                  </Text>
                  <View style={styles.popupCardPriceSection}>
                    <Text style={styles.popupCardPrice}>
                      {formatters.price(selectedProperty.price, selectedProperty.status === 'rent')}
                    </Text>
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
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  overlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    maxHeight: 450,
    width: SCREEN_WIDTH < 768 ? '100%' : Math.min(380, SCREEN_WIDTH * 0.9),
    minWidth: SCREEN_WIDTH < 480 ? 280 : 320,
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  // Image Section (65% of card)
  popupCardImageContainer: {
    width: '100%',
    flex: 0,
    height: '65%',
    minHeight: 200,
    maxHeight: 270,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
  },
  popupCardImage: {
    width: '100%',
    height: '100%',
    minHeight: 200,
  },
  popupCardImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E0E0E0',
  },
  imagePlaceholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  popupCardImageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
  },
  popupCardActionButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  popupCardHeartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupCardHeartBtnActive: {
    backgroundColor: 'rgba(220, 38, 38, 0.8)',
  },
  popupCardShareBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupCardCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  closeButtonIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  // Content Section (35% of card)
  popupCardContent: {
    paddingTop: 10,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flex: 0,
    height: '35%',
    justifyContent: 'space-between',
  },
  popupCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 10,
    marginBottom: 3,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    lineHeight: 19.5,
    textTransform: 'uppercase',
  },
  popupCardDescription: {
    fontSize: 12,
    color: '#717171',
    marginTop: 3,
    marginBottom: 0,
    lineHeight: 16.8,
  },
  popupCardPriceSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginTop: 8,
  },
  popupCardPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
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

