import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  Share,
  Platform,
  Linking,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {AgentStackParamList} from '../../navigation/AgentNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {propertyService} from '../../services/property.service';
import {validateAndProcessPropertyImages, PropertyImage} from '../../utils/imageHelper';
import AgentHeader from '../../components/AgentHeader';
import {useAuth} from '../../context/AuthContext';
import ImageGallery from '../../components/common/ImageGallery';
import {formatters, capitalize, capitalizeAmenity} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';
import {AMENITIES_LIST} from '../../utils/propertyTypeConfig';
import {geocodeLocation} from '../../utils/geocoding';
import PropertyMapView from '../../components/map/PropertyMapView';

type UpcomingProjectDetailsScreenNavigationProp = NativeStackNavigationProp<
  AgentStackParamList,
  'UpcomingProjectDetails'
>;

type UpcomingProjectDetailsScreenRouteProp = RouteProp<AgentStackParamList, 'UpcomingProjectDetails'>;

type Props = {
  navigation: UpcomingProjectDetailsScreenNavigationProp;
  route: UpcomingProjectDetailsScreenRouteProp;
};

const {width: SCREEN_WIDTH} = Dimensions.get('window');

// Helper: parse comma-separated string to array of labels (e.g. "1bhk,2bhk" -> ["1 BHK", "2 BHK"])
const formatConfigurations = (val: string | null | undefined): string[] => {
  if (!val || typeof val !== 'string') return [];
  return val.split(',').map(s => {
    const t = s.trim().toLowerCase();
    if (t === '1bhk') return '1 BHK';
    if (t === '2bhk') return '2 BHK';
    if (t === '3bhk') return '3 BHK';
    if (t === '4bhk') return '4 BHK';
    if (t === '5bhk') return '5+ BHK';
    if (t === 'villa') return 'Villa';
    if (t === 'plot') return 'Plot';
    return s.trim();
  }).filter(Boolean);
};

// Helper: parse amenities (array or comma-separated string)
const parseAmenities = (val: any): string[] => {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (val && typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// Helper: parse approved banks (comma-separated or array)
const parseBanks = (val: any): string[] => {
  if (Array.isArray(val)) return val.map(String).filter(Boolean);
  if (val && typeof val === 'string') return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
};

// BHK text from configurations (website: formatBhkType)
const formatBhkType = (configurations: string | string[] | null | undefined): string => {
  const arr = formatConfigurations(
    Array.isArray(configurations) ? (configurations as string[]).join(',') : (configurations as string)
  );
  return arr.length ? arr.join(', ') : '';
};

// Build a single formatted project object from API prop + upcoming_project_data (website parity)
const buildFormattedProject = (prop: any, propertyImages: PropertyImage[]): any => {
  let upcomingData: any = {};
  const raw = prop.upcoming_project_data;
  if (raw != null) {
    if (typeof raw === 'string') {
      try {
        upcomingData = JSON.parse(raw) || {};
      } catch (_) {
        upcomingData = {};
      }
    } else if (typeof raw === 'object' && !Array.isArray(raw)) {
      upcomingData = raw;
    }
  }
  const priceNum = typeof prop.price === 'number' ? prop.price : parseFloat(prop.price || '0');
  const priceRange = priceNum > 0 ? formatters.price(priceNum, false) : (prop.price_range || 'Price on request');
  const bhkType = formatBhkType(prop.configurations ?? upcomingData.configurations);
  return {
    id: prop.id,
    title: prop.title,
    location: prop.location || upcomingData.location,
    priceRange,
    bhkType,
    builder: prop.builder_name || prop.builder || upcomingData.builder_name || upcomingData.builder,
    builder_link: prop.builder_link || upcomingData.builder_link,
    description: prop.description,
    configurations: prop.configurations ?? upcomingData.configurations,
    amenities: prop.amenities ?? upcomingData.amenities,
    images: propertyImages,
    latitude: prop.latitude ?? upcomingData.latitude,
    longitude: prop.longitude ?? upcomingData.longitude,
    seller_id: prop.seller_id || prop.user_id,
    seller_name: prop.seller_name,
    seller_email: prop.seller_email,
    seller_phone: prop.seller_phone,
    property_type: prop.property_type || upcomingData.property_type,
    project_type: prop.project_type || upcomingData.project_type,
    project_status: prop.project_status ?? upcomingData.project_status,
    rera_number: prop.rera_number ?? upcomingData.rera_number,
    city: prop.city ?? upcomingData.city,
    area: prop.area ?? upcomingData.area,
    fullAddress: prop.fullAddress ?? prop.address ?? upcomingData.fullAddress ?? upcomingData.address,
    state: prop.state ?? upcomingData.state,
    pincode: prop.pincode ?? upcomingData.pincode,
    mapLink: prop.map_link ?? prop.mapLink ?? upcomingData.map_link ?? upcomingData.mapLink,
    carpet_area: prop.carpet_area ?? upcomingData.carpet_area,
    carpet_area_range: prop.carpet_area_range ?? upcomingData.carpet_area_range,
    number_of_towers: prop.number_of_towers ?? upcomingData.number_of_towers,
    total_units: prop.total_units ?? upcomingData.total_units,
    floors_count: prop.floors_count ?? upcomingData.floors_count,
    starting_price: prop.starting_price ?? prop.price ?? upcomingData.starting_price ?? upcomingData.price,
    price_per_sqft: prop.price_per_sqft ?? upcomingData.price_per_sqft,
    booking_amount: prop.booking_amount ?? upcomingData.booking_amount,
    launch_date: prop.launch_date ?? upcomingData.launch_date,
    possession_date: prop.possession_date ?? upcomingData.possession_date,
    rera_status: prop.rera_status ?? upcomingData.rera_status,
    land_ownership_type: prop.land_ownership_type ?? upcomingData.land_ownership_type,
    bank_approved: prop.bank_approved ?? upcomingData.bank_approved,
    approved_banks: prop.approved_banks ?? upcomingData.approved_banks,
    other_bank_names: prop.other_bank_names ?? upcomingData.other_bank_names,
    sales_name: prop.sales_name ?? upcomingData.sales_name,
    sales_number: prop.sales_number ?? upcomingData.sales_number,
    email_id: prop.email_id ?? upcomingData.email_id,
    mobile_number: prop.mobile_number ?? upcomingData.mobile_number,
    whatsapp_number: prop.whatsapp_number ?? upcomingData.whatsapp_number,
    alternative_number: prop.alternative_number ?? upcomingData.alternative_number,
    office_address: prop.office_address ?? upcomingData.office_address,
    project_highlights: prop.project_highlights ?? upcomingData.project_highlights,
    usp: prop.usp ?? upcomingData.usp,
    brochure: prop.brochure ?? upcomingData.brochure,
    brochure_url: prop.brochure_url ?? upcomingData.brochure_url,
    additional_address: prop.additional_address,
    cover_image: prop.cover_image,
    price: prop.price,
  };
};

// Map section: use project coords or geocode location/fullAddress; fallback to "View on Map" link
const UpcomingProjectMapSection: React.FC<{project: any}> = ({project}) => {
  const [coords, setCoords] = useState<{latitude: number; longitude: number} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const lat = project?.latitude != null ? Number(project.latitude) : NaN;
    const lng = project?.longitude != null ? Number(project.longitude) : NaN;
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      setCoords({latitude: lat, longitude: lng});
      setLoading(false);
      return;
    }
    const address = project?.location || project?.fullAddress || project?.address;
    if (!address || typeof address !== 'string') {
      setLoading(false);
      return;
    }
    geocodeLocation(address).then(result => {
      if (cancelled) return;
      if (result) setCoords({latitude: result.latitude, longitude: result.longitude});
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [project?.id, project?.latitude, project?.longitude, project?.location, project?.fullAddress, project?.address]);

  if (loading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Map</Text>
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.mapPlaceholderText}>Loading map...</Text>
        </View>
      </View>
    );
  }
  if (coords) {
    const mapProperty = {
      id: project.id,
      title: project.title || 'Project',
      location: project.location || '',
      price: typeof project.price === 'number' ? project.price : parseFloat(project.price || '0'),
      status: 'sale' as const,
      latitude: coords.latitude,
      longitude: coords.longitude,
      cover_image: project.cover_image,
    };
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Map</Text>
        <View style={styles.mapContainer}>
          <PropertyMapView
            properties={[mapProperty]}
            initialCenter={[coords.longitude, coords.latitude]}
            initialZoom={14}
            showListToggle={false}
            selectedPropertyId={project.id}
          />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Map</Text>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.mapPlaceholderText}>Location could not be displayed on map.</Text>
        {project.mapLink ? (
          <TouchableOpacity
            onPress={() => {
              const url = String(project.mapLink).startsWith('http') ? project.mapLink : `https://${project.mapLink}`;
              Linking.openURL(url).catch(() => CustomAlert.alert('Error', 'Could not open map link'));
            }}
            style={styles.mapLinkButton}>
            <Text style={styles.linkText}>View on Map</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
};

const UpcomingProjectDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const insets = useSafeAreaInsets();
  const {logout} = useAuth();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageGallery, setShowImageGallery] = useState(false);
  const imageScrollViewRef = useRef<ScrollView>(null);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadProjectDetails();
  }, [route.params.propertyId]);

  useEffect(() => {
    if (property && property.images && property.images.length > 0) {
      setCurrentImageIndex(0);
      setFailedImages(new Set());
      setTimeout(() => {
        imageScrollViewRef.current?.scrollTo({x: 0, animated: false});
      }, 100);
    }
  }, [property?.id]);

  const loadProjectDetails = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getPropertyDetails(route.params.propertyId);
      const responseData = response as any;

      if (!responseData?.success || !responseData?.data || !responseData.data.property) {
        CustomAlert.alert('Error', 'Project not found');
        navigation.goBack();
        return;
      }

      const propData = responseData.data.property;

      let propertyImages: PropertyImage[] = validateAndProcessPropertyImages(
        propData.images,
        propData.title || 'Project',
        propData.cover_image
      );

      if (propertyImages.length === 0) {
        propertyImages = [{
          id: 1,
          url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=500',
          alt: propData.title || 'Project image',
        }];
      }

      const formattedProject = buildFormattedProject(propData, propertyImages);
      formattedProject.images = propertyImages;
      setProperty(formattedProject);
      setCurrentImageIndex(0);
    } catch (error: any) {
      console.error('[UpcomingProjectDetails] Error loading project:', error);
      CustomAlert.alert('Error', error.message || 'Failed to load project details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!property) return;
    try {
      const priceText = property.price
        ? formatters.price(parseFloat(property.price), false)
        : 'Price on request';
      const shareMessage = `Check out this project!\n\n${property.title || 'Project'}\n📍 ${property.location || property.city || 'Location not specified'}\n💰 ${priceText}\n\n${property.description ? property.description.substring(0, 100) + '...' : ''}\n\nVisit us: https://360coordinates.com`;
      await Share.share({message: shareMessage, title: property.title || 'Project'});
    } catch (e: any) {
      if (e.message !== 'User did not share') {
        CustomAlert.alert('Error', 'Failed to share. Please try again.');
      }
    }
  };

  if (loading || !property) {
    return (
      <View style={styles.container}>
        <AgentHeader
          onProfilePress={() => navigation.navigate('AgentTabs' as never, {screen: 'Profile'} as never)}
          onSupportPress={() => navigation.navigate('Support' as never)}
          onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading project details...</Text>
        </View>
      </View>
    );
  }

  const propertyImages: PropertyImage[] = property.images && Array.isArray(property.images) && property.images.length > 0
    ? property.images.filter((img: any): img is PropertyImage => img && typeof img === 'object' && img.url && typeof img.url === 'string' && img.url.trim() !== '')
    : [];

  const priceRangeText = property.priceRange || (property.price ? formatters.price(parseFloat(String(property.price)), false) : 'Price on request');
  const pricePerSqft = property.price_per_sqft != null && property.price_per_sqft !== ''
    ? formatters.price(Number(property.price_per_sqft), false) + ' / sq ft'
    : null;
  const bookingAmount = property.booking_amount != null && property.booking_amount !== ''
    ? formatters.price(Number(property.booking_amount), false)
    : null;

  const amenities = parseAmenities(property.amenities);
  const configurations = formatConfigurations(property.configurations);
  const approvedBanks = parseBanks(property.approved_banks);
  const bhkTypeText = property.bhkType ?? formatBhkType(property.configurations);

  const renderDetail = (label: string, value: string | number | null | undefined) => {
    if (value == null || value === '') return null;
    return (
      <View style={styles.detailItem} key={label}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{String(value)}</Text>
      </View>
    );
  };

  const formatDate = (d: any) => {
    if (!d) return null;
    if (typeof d === 'string') {
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? d : parsed.toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <AgentHeader
        onProfilePress={() => navigation.navigate('AgentTabs' as never, {screen: 'Profile'} as never)}
        onSupportPress={() => navigation.navigate('Support' as never)}
        onSubscriptionPress={() => (navigation as any).navigate('Subscription')}
        onLogoutPress={logout}
      />

      <View style={[styles.actionButtonsTop, {top: insets.top + 60}]}>
        <TouchableOpacity style={styles.shareButtonTop} onPress={handleShare} activeOpacity={0.7}>
          <View style={styles.actionButtonInner}>
            <Text style={styles.shareIcon}>🔗</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Image carousel */}
        <View style={styles.imageCarouselContainer}>
          {propertyImages.length > 0 ? (
            <>
              <ScrollView
                ref={imageScrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={e => {
                  const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                  if (index >= 0 && index < propertyImages.length) setCurrentImageIndex(index);
                }}
                scrollEventThrottle={16}
                style={styles.imageCarousel}
                contentContainerStyle={{...styles.imageCarouselContent, width: SCREEN_WIDTH * propertyImages.length}}
                snapToInterval={SCREEN_WIDTH}
                snapToAlignment="center">
                {propertyImages.map((image: PropertyImage, index: number) => (
                  <TouchableOpacity
                    key={image.id}
                    style={styles.imageContainer}
                    onPress={() => { setCurrentImageIndex(index); setShowImageGallery(true); }}
                    activeOpacity={0.9}>
                    {failedImages.has(image.id) ? (
                      <View style={[styles.image, styles.imagePlaceholder]}>
                        <Text style={styles.imagePlaceholderText}>🏗️</Text>
                        <Text style={styles.imagePlaceholderSubtext}>Image unavailable</Text>
                      </View>
                    ) : (
                      <Image
                        source={{uri: image.url}}
                        style={styles.image}
                        resizeMode="cover"
                        onError={() => setFailedImages(prev => new Set(prev).add(image.id))}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {propertyImages.length > 1 && (
                <View style={styles.imageIndicators}>
                  {propertyImages.map((_, index) => (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setCurrentImageIndex(index);
                        imageScrollViewRef.current?.scrollTo({x: index * SCREEN_WIDTH, animated: true});
                      }}
                      activeOpacity={0.7}>
                      <View style={[styles.indicator, index === currentImageIndex && styles.indicatorActive]} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          ) : (
            <View style={styles.imageContainer}>
              <View style={[styles.image, styles.imagePlaceholder]}>
                <Text style={styles.imagePlaceholderText}>🏗️</Text>
                <Text style={styles.imagePlaceholderSubtext}>No images</Text>
              </View>
            </View>
          )}
        </View>

        {/* Header: Title, badge, location, price */}
        <View style={styles.headerSection}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{capitalize(property.title || 'Project')}</Text>
            <View style={styles.upcomingBadge}>
              <Text style={styles.upcomingBadgeText}>Upcoming Project</Text>
            </View>
          </View>
          <View style={styles.locationContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.location}>{property.location || property.city || property.fullAddress || property.address || 'Location not specified'}</Text>
          </View>
          <Text style={styles.priceLabel}>Price Range</Text>
          <Text style={styles.price}>{priceRangeText}</Text>
          {pricePerSqft && <Text style={styles.priceSub}>{pricePerSqft}</Text>}
          {bookingAmount && <Text style={styles.bookingLabel}>Booking amount: {bookingAmount}</Text>}
        </View>

        {/* Quick info: Configuration (BHK), Status Upcoming, area, towers, units, floors, carpet area */}
        <View style={styles.quickInfo}>
          {bhkTypeText ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🏠</Text>
              <Text style={styles.infoText}>{bhkTypeText}</Text>
            </View>
          ) : null}
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>📋</Text>
            <Text style={styles.infoText}>Upcoming</Text>
          </View>
          {(property.property_type || property.project_type) && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🏢</Text>
              <Text style={styles.infoText}>{capitalize(String(property.property_type || property.project_type))}</Text>
            </View>
          )}
          {property.project_status && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📋</Text>
              <Text style={styles.infoText}>{String(property.project_status)}</Text>
            </View>
          )}
          {property.area != null && property.area !== '' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📐</Text>
              <Text style={styles.infoText}>{property.area} sq ft</Text>
            </View>
          )}
          {property.number_of_towers != null && property.number_of_towers !== '' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🏗️</Text>
              <Text style={styles.infoText}>{property.number_of_towers} Tower{Number(property.number_of_towers) !== 1 ? 's' : ''}</Text>
            </View>
          )}
          {property.total_units != null && property.total_units !== '' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>🏠</Text>
              <Text style={styles.infoText}>{property.total_units} Units</Text>
            </View>
          )}
          {property.floors_count != null && property.floors_count !== '' && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📐</Text>
              <Text style={styles.infoText}>{property.floors_count} Floors</Text>
            </View>
          )}
          {(property.carpet_area || property.carpet_area_range) && (
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>📏</Text>
              <Text style={styles.infoText}>{property.carpet_area || property.carpet_area_range}</Text>
            </View>
          )}
        </View>

        {/* Configurations */}
        {configurations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Configurations</Text>
            <View style={styles.chipRow}>
              {configurations.map((c, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this place</Text>
          <Text style={styles.description}>{property.description || 'No description available'}</Text>
        </View>

        {/* Project details grid: only when value exists (website order) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project Details</Text>
          <View style={styles.detailsGrid}>
            {renderDetail('Builder / Developer', property.builder)}
            {renderDetail('Project Type', property.property_type || property.project_type)}
            {renderDetail('Project Status', property.project_status)}
            {renderDetail('RERA Number', property.rera_number)}
            {bhkTypeText && renderDetail('Configuration', bhkTypeText)}
            {renderDetail('Carpet Area Range', property.carpet_area_range || property.carpet_area)}
            {renderDetail('Number of Towers', property.number_of_towers)}
            {renderDetail('Total Units', property.total_units)}
            {renderDetail('Floors', property.floors_count)}
            {renderDetail('Location', property.location)}
            {renderDetail('City', property.city)}
            {renderDetail('State', property.state)}
            {renderDetail('Address', property.fullAddress || property.address || property.additional_address)}
            {renderDetail('Pincode', property.pincode)}
            {property.starting_price != null && property.starting_price !== '' && renderDetail('Starting Price', formatters.price(Number(property.starting_price), false))}
            {pricePerSqft && renderDetail('Price per Sqft', pricePerSqft)}
            {bookingAmount && renderDetail('Booking Amount', bookingAmount)}
            {renderDetail('Expected Launch', formatDate(property.launch_date))}
            {renderDetail('Possession', formatDate(property.possession_date))}
            {renderDetail('RERA Status', property.rera_status)}
            {renderDetail('Land Ownership', property.land_ownership_type)}
            {renderDetail('Bank Approved', property.bank_approved)}
            {approvedBanks.length > 0 && (
              <View style={styles.detailItemFull}>
                <Text style={styles.detailLabel}>Approved Banks</Text>
                <Text style={styles.detailValue}>{approvedBanks.join(', ')}</Text>
              </View>
            )}
            {property.other_bank_names && renderDetail('Other Banks', property.other_bank_names)}
            {property.mapLink ? (
              <View style={styles.detailItemFull}>
                <Text style={styles.detailLabel}>Map Link</Text>
                <TouchableOpacity onPress={() => {
                  const url = String(property.mapLink).startsWith('http') ? property.mapLink : `https://${property.mapLink}`;
                  Linking.openURL(url).catch(() => CustomAlert.alert('Error', 'Could not open map link'));
                }}>
                  <Text style={[styles.detailValue, styles.linkText]}>View on Map</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>

        {/* Amenities - What this place offers (with icons from AMENITIES_LIST) */}
        {amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What this place offers</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((a: string, i: number) => {
                const id = String(a).trim().toLowerCase().replace(/\s+/g, '_');
                const matched = AMENITIES_LIST.find(
                  x => x.id === id || x.id === a || x.label.toLowerCase() === String(a).toLowerCase()
                );
                const icon = matched?.icon ?? '✓';
                return (
                  <View key={i} style={styles.amenityItem}>
                    <Text style={styles.amenityIcon}>{icon}</Text>
                    <Text style={styles.amenityText}>{capitalizeAmenity(matched?.label ?? a)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Location / Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.address}>
            {[property.location, property.area, property.city, property.state].filter(Boolean).join(', ') || property.address || property.fullAddress || 'Address not available'}
          </Text>
          {property.additional_address && <Text style={styles.addressSub}>{property.additional_address}</Text>}
          {property.pincode && <Text style={styles.addressSub}>Pincode: {property.pincode}</Text>}
          {property.latitude != null && property.longitude != null && (
            <Text style={styles.coordinates}>Coordinates: {property.latitude}, {property.longitude}</Text>
          )}
        </View>

        {/* Contact & Sales */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Sales</Text>
          <View style={styles.detailsGrid}>
            {renderDetail('Sales Person Name', property.sales_name)}
            {renderDetail('Phone', property.sales_number)}
            {renderDetail('Mobile', property.mobile_number)}
            {renderDetail('Email', property.email_id)}
            {renderDetail('WhatsApp', property.whatsapp_number)}
            {renderDetail('Alternative Number', property.alternative_number)}
            {renderDetail('Office Address', property.office_address)}
          </View>
        </View>

        {/* Project Highlights */}
        {property.project_highlights && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Highlights</Text>
            <Text style={styles.description}>{property.project_highlights}</Text>
          </View>
        )}

        {/* Unique Selling Points */}
        {property.usp && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Unique Selling Points</Text>
            <Text style={styles.description}>{property.usp}</Text>
          </View>
        )}

        {/* Project Brochure */}
        {(property.brochure_url || property.brochure) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Project Brochure</Text>
            <TouchableOpacity
              style={styles.brochureButton}
              onPress={() => {
                const url = property.brochure_url || property.brochure;
                const href = String(url).startsWith('http') ? url : `https://${url}`;
                Linking.openURL(href).catch(() => CustomAlert.alert('Error', 'Could not open brochure'));
              }}>
              <Text style={styles.brochureButtonText}>📑 Download Brochure</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Map */}
        <UpcomingProjectMapSection project={property} />
      </ScrollView>

      <View style={[styles.actionButtons, {paddingBottom: insets.bottom}]}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => navigation.navigate('EditProperty', {propertyId: property.id})}>
          <Text style={styles.editButtonText}>✏️ Edit Project</Text>
        </TouchableOpacity>
      </View>

      <ImageGallery
        visible={showImageGallery}
        images={propertyImages.map(img => img.url)}
        initialIndex={currentImageIndex}
        onClose={() => setShowImageGallery(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  loadingText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 100 },
  imageCarouselContainer: { height: 300, position: 'relative' },
  imageCarousel: { height: 300 },
  imageCarouselContent: { alignItems: 'center' },
  imageContainer: { width: SCREEN_WIDTH, height: 300 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 48, marginBottom: spacing.xs },
  imagePlaceholderSubtext: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
  imageIndicators: { position: 'absolute', bottom: spacing.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, zIndex: 3 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  indicatorActive: { backgroundColor: colors.surface, width: 24 },
  actionButtonsTop: { position: 'absolute', right: spacing.md, zIndex: 100, flexDirection: 'row', gap: spacing.sm, elevation: 10 },
  shareButtonTop: { zIndex: 101, elevation: 10 },
  actionButtonInner: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.9)', justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 4 },
  shareIcon: { fontSize: 18 },
  headerSection: { backgroundColor: colors.surface, padding: spacing.xl, borderBottomWidth: 1, borderBottomColor: colors.border },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm, flexWrap: 'wrap' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, flex: 1, lineHeight: 32 },
  upcomingBadge: { backgroundColor: colors.accent, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.md },
  upcomingBadgeText: { ...typography.caption, color: colors.surface, fontWeight: '600', fontSize: 11 },
  locationContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm, gap: spacing.xs },
  locationIcon: { fontSize: 16 },
  location: { fontSize: 16, color: colors.textSecondary, flex: 1 },
  priceLabel: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs, textTransform: 'uppercase', fontWeight: '600' },
  price: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  priceSub: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  bookingLabel: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  linkText: { color: colors.primary, textDecorationLine: 'underline', fontWeight: '600' },
  brochureButton: { backgroundColor: colors.surfaceSecondary, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  brochureButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  mapContainer: { height: 220, borderRadius: borderRadius.md, overflow: 'hidden', backgroundColor: colors.surfaceSecondary },
  mapPlaceholder: { height: 120, backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  mapPlaceholderText: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  mapLinkButton: { paddingVertical: spacing.sm },
  quickInfo: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.surface, padding: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.sm },
  infoCard: { flex: 1, minWidth: '30%', alignItems: 'center', backgroundColor: colors.surfaceSecondary, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  infoIcon: { fontSize: 20, marginBottom: spacing.xs },
  infoText: { ...typography.caption, color: colors.text, fontSize: 12, fontWeight: '600', textAlign: 'center' },
  section: { backgroundColor: colors.surface, padding: spacing.xl, marginTop: spacing.lg, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.md, paddingBottom: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.primary + '30' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.surfaceSecondary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.round },
  chipText: { ...typography.caption, color: colors.text, fontWeight: '600', fontSize: 13 },
  description: { ...typography.body, color: colors.textSecondary, lineHeight: 24, fontSize: 15 },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  detailItem: { width: '47%', padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border },
  detailItemFull: { width: '100%', padding: spacing.md, backgroundColor: colors.surfaceSecondary, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginTop: spacing.xs },
  detailLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs, fontSize: 12, fontWeight: '500', textTransform: 'uppercase' },
  detailValue: { ...typography.body, color: colors.text, fontWeight: '600', fontSize: 14 },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  amenityItem: { flexDirection: 'row', alignItems: 'center', width: '47%', backgroundColor: colors.surfaceSecondary, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, gap: spacing.sm },
  amenityIcon: { fontSize: 16, color: colors.primary, fontWeight: 'bold' },
  amenityText: { ...typography.body, color: colors.text, fontSize: 14, fontWeight: '500' },
  address: { ...typography.body, color: colors.textSecondary, lineHeight: 24, marginBottom: spacing.xs },
  addressSub: { ...typography.body, color: colors.textSecondary, lineHeight: 22, fontSize: 14, marginTop: spacing.xs },
  coordinates: { ...typography.caption, color: colors.textSecondary, fontSize: 12, fontStyle: 'italic', marginTop: spacing.xs },
  actionButtons: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexDirection: 'row', gap: spacing.md },
  editButton: { flex: 1, backgroundColor: colors.primary, borderRadius: borderRadius.lg, paddingVertical: spacing.lg, alignItems: 'center', justifyContent: 'center', minHeight: 52 },
  editButtonText: { ...typography.body, color: colors.surface, fontWeight: '700', fontSize: 16 },
});

export default UpcomingProjectDetailsScreen;
