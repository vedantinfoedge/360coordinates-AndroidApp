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

      if (responseData && responseData.success && responseData.data) {
        const propData = responseData.data.property || responseData.data;

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

        propData.images = propertyImages;
        setProperty(propData);
        setCurrentImageIndex(0);
      } else {
        CustomAlert.alert('Error', 'Failed to load project details');
        navigation.goBack();
      }
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

  const formattedPrice = property.price ? formatters.price(parseFloat(property.price), false) : 'Price on request';
  const pricePerSqft = property.price_per_sqft != null && property.price_per_sqft !== ''
    ? formatters.price(Number(property.price_per_sqft), false) + ' / sq ft'
    : null;
  const bookingAmount = property.booking_amount != null && property.booking_amount !== ''
    ? formatters.price(Number(property.booking_amount), false)
    : null;

  const amenities = parseAmenities(property.amenities);
  const configurations = formatConfigurations(property.configurations);
  const approvedBanks = parseBanks(property.approved_banks);

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
            <Text style={styles.location}>{property.location || property.city || property.address || 'Location not specified'}</Text>
          </View>
          <Text style={styles.price}>{formattedPrice}</Text>
          {pricePerSqft && <Text style={styles.priceSub}>{pricePerSqft}</Text>}
          {bookingAmount && <Text style={styles.bookingLabel}>Booking amount: {bookingAmount}</Text>}
        </View>

        {/* Quick info: Project type, status, config, towers, units, floors, carpet area */}
        <View style={styles.quickInfo}>
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
          <Text style={styles.sectionTitle}>About this project</Text>
          <Text style={styles.description}>{property.description || 'No description available'}</Text>
        </View>

        {/* Project details: RERA, launch, possession, legal, banks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Project details</Text>
          <View style={styles.detailsGrid}>
            {renderDetail('RERA Number', property.rera_number)}
            {renderDetail('Project Status', property.project_status)}
            {renderDetail('Launch Date', formatDate(property.launch_date))}
            {renderDetail('Possession Date', formatDate(property.possession_date))}
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
          </View>
        </View>

        {/* Amenities */}
        {amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesGrid}>
              {amenities.map((a: string, i: number) => (
                <View key={i} style={styles.amenityItem}>
                  <Text style={styles.amenityIcon}>✓</Text>
                  <Text style={styles.amenityText}>{capitalizeAmenity(a)}</Text>
                </View>
              ))}
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
            {renderDetail('Sales Contact', property.sales_name)}
            {renderDetail('Sales Number', property.sales_number)}
            {renderDetail('Email', property.email_id)}
            {renderDetail('Mobile', property.mobile_number)}
            {renderDetail('WhatsApp', property.whatsapp_number)}
            {renderDetail('Alternative Number', property.alternative_number)}
          </View>
        </View>

        {/* Marketing */}
        {(property.project_highlights || property.usp) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marketing</Text>
            {property.project_highlights && (
              <>
                <Text style={styles.detailLabel}>Highlights</Text>
                <Text style={styles.description}>{property.project_highlights}</Text>
              </>
            )}
            {property.usp && (
              <>
                <Text style={[styles.detailLabel, {marginTop: spacing.md}]}>USP</Text>
                <Text style={styles.description}>{property.usp}</Text>
              </>
            )}
          </View>
        )}
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
  price: { fontSize: 28, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  priceSub: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
  bookingLabel: { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xs },
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
