import React, { useState, useEffect } from 'react';
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
import { colors, spacing, typography, borderRadius } from '../../theme';
import { TabIcon } from '../navigation/TabIcons';
import { propertyService } from '../../services/property.service';
import { getPropertyImageUrl, fixImageUrl } from '../../utils/imageHelper';
import { log } from '../../utils/debug';
import { formatters, capitalize } from '../../utils/formatters';
import { buyerService } from '../../services/buyer.service';
import { Share } from 'react-native';
import { MAP_CONFIG } from '../../config/mapbox.config';
import CustomAlert from '../../utils/alertHelper';
import { PG_HOSTEL_PROPERTY_TYPE, buildPGHostelFetchParams } from '../../utils/propertySearchParams';
import { useAuth } from '../../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Search params passed from FullscreenMapSearch / PropertyMapScreen */
export interface MapSearchParams {
  location?: string;
  city?: string;
  listingType?: 'all' | 'buy' | 'rent' | 'pg-hostel';
  propertyType?: string;
  budget?: string;
  minBudget?: number;
  maxBudget?: number;
  bedrooms?: string;
  area?: string;
}

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
  /** Search bar rendered above the map (shown when fullscreen). Only visible when provided. */
  fullscreenSearchBar?: React.ReactNode;
  /** Search params from FullscreenMapSearch - used to fetch filtered properties */
  searchParams?: MapSearchParams;
}

const categoryMap: { [key: string]: string } = {
  'Apartment': 'Residential',
  'Villa': 'Residential',
  'Independent House': 'Residential',
  'Bungalow': 'Residential',
  'Studio Apartment': 'Residential',
  'Penthouse': 'Residential',
  'Farm House': 'Residential',
  'Plot / Land': 'Land',
  'Commercial Office': 'Commercial',
  'Commercial Shop': 'Commercial',
  'Retail Space': 'Commercial',
  'Co-working Space': 'Commercial',
  'Warehouse / Godown': 'Commercial',
  'Industrial Property': 'Industrial',
  'PG / Hostel': PG_HOSTEL_PROPERTY_TYPE,
};

const PropertyMapView: React.FC<PropertyMapViewProps> = ({
  properties: initialProperties,
  onPropertyPress,
  initialCenter = MAP_CONFIG.DEFAULT_CENTER,
  initialZoom = 12,
  showListToggle = true,
  listingType = 'all',
  selectedPropertyId: propSelectedPropertyId,
  fullscreenSearchBar,
  searchParams,
}) => {
  const { isAuthenticated } = useAuth();
  const navigation = useNavigation<any>();
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

  const effectiveListingType = searchParams?.listingType || listingType;

  const searchParamsKey = searchParams
    ? `${searchParams.location}|${searchParams.city}|${searchParams.listingType}|${searchParams.propertyType}|${searchParams.minBudget}|${searchParams.maxBudget}|${searchParams.bedrooms}|${searchParams.area}`
    : '';

  useEffect(() => {
    if (!initialProperties) {
      loadProperties();
    } else {
      // Filter initial properties based on listing type
      let filtered = initialProperties;
      if (effectiveListingType === 'pg-hostel') {
        filtered = initialProperties.filter((prop: any) => {
          const propType = (prop.property_type || '').toLowerCase();
          return propType.includes('pg') ||
            propType.includes('hostel') ||
            propType === 'pg-hostel' ||
            prop.status === 'pg';
        });
      } else if (effectiveListingType === 'buy') {
        filtered = initialProperties.filter((prop: any) => prop.status === 'sale');
      } else if (effectiveListingType === 'rent') {
        filtered = initialProperties.filter((prop: any) => prop.status === 'rent');
      }
      setProperties(filtered);
    }
  }, [effectiveListingType, initialProperties, searchParamsKey]);

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
      // Same backend as website for PG: property_type 'PG / Hostel', available_for_bachelors
      const params: any = {
        limit: 50,
        latitude: centerLat,
        longitude: centerLng,
        radius: 5,
      };
      if (effectiveListingType === 'buy') {
        params.status = 'sale';
      } else if (effectiveListingType === 'rent') {
        params.status = 'rent';
      } else if (effectiveListingType === 'pg-hostel') {
        params.status = 'rent';
        params.property_type = 'PG / Hostel';
        params.available_for_bachelors = true;
      } else if (propertyStatus) {
        params.status = propertyStatus as 'sale' | 'rent' | 'pg';
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

      const lt = searchParams?.listingType ?? listingType;

      // Special handling for PG/Hostel: Fetch both "PG/Hostel" type AND "Available for Bachelors" (Union)
      if (lt === 'pg-hostel') {
        // Use helper to build params for both queries
        const { pgParams, bachelorsParams } = buildPGHostelFetchParams({
          limit: 50,
          location: searchParams?.location,
          city: searchParams?.city,
          min_price: searchParams?.minBudget ? searchParams.minBudget * 1000 : undefined, // Convert to backend units if needed, but helper handles passing through
          max_price: searchParams?.maxBudget ? searchParams.maxBudget * 1000 : undefined,
          budget: searchParams?.budget,
        });

        // Add any map-specific overrides if necessary, but helper should suffice for core filters
        // If specific property type is selected (e.g. 1RK vs 1BHK in PG context?), handle it? 
        // Current CompactSearchBar for PG passes propertyType='PG / Hostel' (fixed). 
        // If user selected '1RK', it comes in 'bedrooms'.
        if (searchParams?.bedrooms) {
          pgParams.bedrooms = searchParams.bedrooms;
          bachelorsParams.bedrooms = searchParams.bedrooms;
        }

        const [resPG, resBachelors] = await Promise.all([
          propertyService.getProperties(pgParams),
          propertyService.getProperties(bachelorsParams)
        ]);

        // Merge results by ID
        const byId = new Map<string, any>();
        const add = (list: any[]) => {
          if (!list || !Array.isArray(list)) return;
          list.forEach((p: any) => {
            const id = String(p.id ?? p.property_id ?? '');
            if (id && !byId.has(id)) {
              // Filter for valid coordinates
              if (p.latitude && p.longitude) {
                byId.set(id, p);
              }
            }
          });
        };

        if (resPG && resPG.success) {
          add(resPG.data?.properties || resPG.data);
        }
        if (resBachelors && resBachelors.success) {
          add(resBachelors.data?.properties || resBachelors.data);
        }

        const mergedProperties = Array.from(byId.values()).map((prop: any) => ({
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

        setProperties(mergedProperties);
        log.property(`Loaded ${mergedProperties.length} PG/Hostel properties for map (merged)`);

      } else {
        // Standard logic for Buy/Rent
        const params: any = { limit: 50 };

        if (searchParams) {
          // Use search params from FullscreenMapSearch
          if (lt === 'buy') params.status = 'sale';
          else if (lt === 'rent') params.status = 'rent';

          const loc = (searchParams.location || '').trim();
          const city = (searchParams.city || '').trim();
          if (loc) params.location = loc;
          if (city) params.city = city;
          if (!loc && city) params.location = city;

          const pt = searchParams.propertyType;
          if (pt && pt !== 'all') {
            // Specific type mapping to match backend expectations (same as SearchResultsScreen)
            const specificTypeMap: { [key: string]: string } = {
              'Apartment': 'apartment',
              'Villa': 'villa',
              'Independent House': 'independent-house',
              'Bungalow': 'bungalow',
              'Studio Apartment': 'studio-apartment',
              'Penthouse': 'penthouse',
              'Farm House': 'farm-house',
              'Plot / Land': 'plot-land',
              'Commercial Office': 'commercial-office',
              'Commercial Shop': 'commercial-shop',
              'Retail Space': 'retail-space',
              'Co-working Space': 'coworking-space',
              'Warehouse / Godown': 'warehouse-godown',
              'Industrial Property': 'industrial-property',
              'PG / Hostel': 'pg-hostel', // Should not happen in this block but safe to keep
            };

            // Try specific type first
            const specific = specificTypeMap[pt];
            if (specific) {
              params.property_type = specific;
            } else {
              // Fallback to broad category if no specific type match
              const category = categoryMap[pt];
              params.property_type = category || pt.toLowerCase().replace(/ /g, '-');
            }
          }

          const mn = searchParams.minBudget ?? 0;
          const mx = searchParams.maxBudget ?? (lt === 'buy' ? 1000 : 200);
          const maxForAny = 500; // Simplified check
          const hasBudgetFilter = mn > 0 || mx < maxForAny;
          if (hasBudgetFilter) {
            const mult = lt === 'buy' ? 100000 : 1000;
            params.min_price = String(Math.round(mn * mult));
            params.max_price = String(Math.round(mx * mult));
          }
          if (searchParams.bedrooms) params.bedrooms = searchParams.bedrooms;
          if (searchParams.area) params.area = searchParams.area;
        } else {
          // Legacy: listing type only (without searchParams from compact bar)
          if (lt === 'buy') params.status = 'sale';
          else if (lt === 'rent') params.status = 'rent';
        }

        const response = await propertyService.getProperties(params);

        if (response.success && response.data?.properties) {
          const formattedProperties = response.data.properties
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
          setProperties(formattedProperties);
          log.property(`Loaded ${formattedProperties.length} properties for map (filter: ${lt})`);
        }
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
      // Use buyerService.getPropertyDetails which returns is_favorite field
      const response = await buyerService.getPropertyDetails(propertyId);
      if (response && response.success && response.data?.property) {
        setIsFavorite(!!response.data.property.is_favorite);
      } else {
        setIsFavorite(false);
      }
    } catch (error) {
      console.error('[PropertyMapView] Error checking favorite status:', error);
      setIsFavorite(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedProperty) return;

    if (!isAuthenticated) {
      CustomAlert.alert(
        'Login Required',
        'Please login to add properties to your favorites.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Login',
            onPress: () => {
              // Navigate to Auth stack
              navigation.navigate('Auth', { screen: 'Login' });
            }
          }
        ]
      );
      return;
    }

    try {
      // Use buyerService.toggleFavorite which returns new state
      console.log('[PropertyMapView] Toggling favorite for:', selectedProperty.id);
      const response = await buyerService.toggleFavorite(selectedProperty.id);
      console.log('[PropertyMapView] Toggle response:', JSON.stringify(response));

      if (response && response.success) {
        // Toggle based on current state if backend doesn't return explicit boolean in correct format
        // But buyerService returns { data: { is_favorite: boolean } } usually
        if (response.data && typeof response.data.is_favorite === 'boolean') {
          setIsFavorite(response.data.is_favorite);
        } else {
          setIsFavorite(!isFavorite); // Fallback
        }

        CustomAlert.alert(
          'Success',
          // Note: if we just toggled !isFavorite, the new state is !initialState
          // We can use the updated state if we set it, or just use !isFavorite logic for the message (careful with closure)
          // Better to use the response data if available
          (response.data?.is_favorite ?? !isFavorite) ? 'Added to favorites' : 'Removed from favorites'
        );
      }
    } catch (error: any) {
      console.error('[PropertyMapView] Toggle favorite error:', error);
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
        <View style={styles.errorIconWrap}>
          <TabIcon name="map" color={colors.textSecondary} size={64} />
        </View>
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
            <View style={styles.toggleIconTextRow}>
              <TabIcon name="map" color={viewMode === 'map' ? colors.primary : colors.textSecondary} size={18} />
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'map' && styles.toggleTextActive,
                ]}>
                Map
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'list' && styles.toggleButtonActive,
            ]}
            onPress={() => setViewMode('list')}>
            <View style={styles.toggleIconTextRow}>
              <TabIcon name="list" color={viewMode === 'list' ? colors.primary : colors.textSecondary} size={18} />
              <Text
                style={[
                  styles.toggleText,
                  viewMode === 'list' && styles.toggleTextActive,
                ]}>
                List
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Map View */}
      {viewMode === 'map' && (
        <View style={styles.mapContainer}>
          {fullscreenSearchBar ? (
            <View style={styles.fullscreenSearchContainer}>
              {fullscreenSearchBar}
            </View>
          ) : null}
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
                      source={{ uri: fixImageUrl(selectedProperty.cover_image) }}
                      style={styles.popupCardImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.popupCardImagePlaceholder}>
                      <TabIcon name="camera" color={colors.textSecondary} size={32} />
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
                      <TabIcon name="close" color={colors.text} size={18} />
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
                      <TabIcon
                        name={isFavorite ? 'heart' : 'heart-outline'}
                        color={isFavorite ? '#E53935' : colors.primaryDark}
                        size={20}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.popupCardActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleShare();
                      }}>
                      <TabIcon name="link" color={colors.primaryDark} size={18} />
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
          renderItem={({ item }) => (
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
                <TabIcon name="chevron-right" color={colors.textSecondary} size={20} />
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
  fullscreenSearchContainer: {
    flexShrink: 0,
    zIndex: 10,
    paddingTop: 8,
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
    shadowOffset: { width: 0, height: 4 },
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
    shadowOffset: { width: 0, height: 1 },
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
  errorIconWrap: {
    marginBottom: spacing.md,
  },
  toggleIconTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
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

