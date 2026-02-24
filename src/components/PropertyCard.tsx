import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, ScrollView } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme';
import { TabIcon } from './navigation/TabIcons';
import { scale, verticalScale, moderateScale } from '../utils/responsive';
import CustomAlert from '../utils/alertHelper';
import { capitalize } from '../utils/formatters';

interface PropertyCardProps {
  image?: string;
  images?: string[];
  name: string;
  location: string;
  price: string;
  type: 'buy' | 'rent' | 'pg-hostel';
  onPress?: () => void;
  onFavoritePress?: () => void;
  onSharePress?: () => void;
  isFavorite?: boolean;
  property?: any; // Full property object for compatibility
  style?: any; // Optional style prop for card container
  /** Called when user starts interacting with the image carousel (swipe or arrow). Pause parent scroll animation. */
  onImageCarouselScrollStart?: () => void;
  /** Called when user finishes interacting with the image carousel. Resume parent scroll after delay. */
  /** Called when user finishes interacting with the image carousel. Resume parent scroll after delay. */
  onImageCarouselScrollEnd?: () => void;
  /** Whether to hide the Buy/Rent badge (useful for projects where we want to show status instead) */
  hideTypeBadge?: boolean;
}

const PropertyCard: React.FC<PropertyCardProps> = ({
  image,
  images: imagesProp,
  name,
  location,
  price,
  type,
  onPress,
  onFavoritePress,
  onSharePress,
  isFavorite = false,
  property,
  style,
  onImageCarouselScrollStart,
  onImageCarouselScrollEnd,
  hideTypeBadge = false,
}) => {
  const [favorite, setFavorite] = useState(isFavorite);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slideWidth, setSlideWidth] = useState(0);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Build list of image URLs: cover first when provided, then rest of images (no duplicates)
  const imageUrls = useMemo(() => {
    const list: string[] = [];
    const seen = new Set<string>();
    const add = (url: string) => {
      const u = String(url).trim();
      if (u && !seen.has(u)) {
        seen.add(u);
        list.push(url);
      }
    };
    if (image) add(image);
    if (imagesProp && imagesProp.length > 0) {
      imagesProp.forEach((url) => add(url));
    }
    return list;
  }, [imagesProp, image]);

  const hasMultipleImages = imageUrls.length > 1;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  // Sync favorite state when prop changes
  React.useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  // Reset image error and loaded state when image URL changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [image, imageUrls.length, imageUrls[0]]);

  const [imageErrorIndices, setImageErrorIndices] = useState<Set<number>>(new Set());
  const scrollViewRef = useRef<{ scrollTo: (opts: { x: number; animated?: boolean }) => void } | null>(null);
  React.useEffect(() => {
    setImageErrorIndices(new Set());
    setCurrentIndex(0);
  }, [imageUrls.length]);

  const onImageContainerLayout = (e: { nativeEvent: { layout: { width: number } } }) => {
    const { width } = e.nativeEvent.layout;
    if (width > 0) setSlideWidth(width);
  };

  const onScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    if (slideWidth > 0) {
      const index = Math.round(offsetX / slideWidth);
      setCurrentIndex(Math.min(index, imageUrls.length - 1));
    }
  };

  const goToPrev = () => {
    if (currentIndex <= 0 || slideWidth <= 0) return;
    const nextIndex = currentIndex - 1;
    scrollViewRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: true });
    setCurrentIndex(nextIndex);
  };

  const goToNext = () => {
    if (currentIndex >= imageUrls.length - 1 || slideWidth <= 0) return;
    const nextIndex = currentIndex + 1;
    scrollViewRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: true });
    setCurrentIndex(nextIndex);
  };

  const handleFavoritePress = () => {
    if (onFavoritePress) {
      // Parent handles API - don't optimistically update; use isFavorite from parent as source of truth
      onFavoritePress();
    } else {
      // Default behavior when no handler
      setFavorite(!favorite);
      CustomAlert.alert(
        favorite ? 'Removed from Favorites' : 'Added to Favorites',
        `${name} has been ${favorite ? 'removed from' : 'added to'} your favorites.`,
      );
    }
  };

  const handleSharePress = () => {
    console.log('[PropertyCard] Share button pressed');
    if (onSharePress) {
      onSharePress();
    } else {
      // Default behavior
      CustomAlert.alert('Share Property', `Share ${name} - ${location} - ${price}`);
    }
  };

  // Project Status Badge
  const getProjectStatusBadgeStyle = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PRE-LAUNCH': return styles.preLaunchBadge;
      case 'UNDER CONSTRUCTION': return styles.underConstructionBadge;
      case 'COMPLETED': return styles.completedBadge;
      default: return styles.defaultProjectBadge;
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={style}>
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        {/* Property Image - carousel when multiple images */}
        <View style={styles.imageContainer} onLayout={onImageContainerLayout}>
          {hasMultipleImages && slideWidth > 0 ? (
            <>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={() => onImageCarouselScrollStart?.()}
                onMomentumScrollEnd={(e: any) => {
                  onScrollEnd(e);
                  onImageCarouselScrollEnd?.();
                }}
                onScrollEndDrag={(e: any) => {
                  onScrollEnd(e);
                  onImageCarouselScrollEnd?.();
                }}
                decelerationRate="fast"
                style={styles.imageCarousel}
                contentContainerStyle={styles.imageCarouselContent}>
                {imageUrls.map((uri, index) => (
                  <View key={`img-${index}`} style={[styles.slide, { width: slideWidth }]}>
                    {imageErrorIndices.has(index) ? (
                      <View style={styles.imagePlaceholder}>
                        <TabIcon name="home" color={colors.textSecondary} size={36} />
                        <Text style={styles.imagePlaceholderText}>No Image</Text>
                      </View>
                    ) : (
                      <Image
                        source={{ uri }}
                        style={styles.image}
                        resizeMode="cover"
                        onLoadEnd={() => index === 0 && setImageLoaded(true)}
                        onError={() => {
                          setImageErrorIndices(prev => new Set(prev).add(index));
                        }}
                      />
                    )}
                  </View>
                ))}
              </ScrollView>
              {/* Left / Right navigator arrows */}
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={(e: { stopPropagation: () => void }) => {
                  e.stopPropagation();
                  onImageCarouselScrollStart?.();
                  goToPrev();
                  setTimeout(() => onImageCarouselScrollEnd?.(), 400);
                }}
                activeOpacity={0.8}
                disabled={currentIndex <= 0}>
                <Text style={[styles.navArrowText, currentIndex <= 0 && styles.navArrowDisabled]}>
                  ‹
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={(e: { stopPropagation: () => void }) => {
                  e.stopPropagation();
                  onImageCarouselScrollStart?.();
                  goToNext();
                  setTimeout(() => onImageCarouselScrollEnd?.(), 400);
                }}
                activeOpacity={0.8}
                disabled={currentIndex >= imageUrls.length - 1}>
                <Text style={[
                  styles.navArrowText,
                  currentIndex >= imageUrls.length - 1 && styles.navArrowDisabled,
                ]}>
                  ›
                </Text>
              </TouchableOpacity>
              <View style={styles.dotsContainer}>
                {imageUrls.map((_, index) => (
                  <View
                    key={`dot-${index}`}
                    style={[
                      styles.dot,
                      index === currentIndex && styles.dotActive,
                    ]}
                  />
                ))}
              </View>
            </>
          ) : imageUrls.length >= 1 && !imageError ? (
            <>
              {!imageLoaded && (
                <View style={styles.imagePlaceholder} pointerEvents="none">
                  <TabIcon name="home" color={colors.textSecondary} size={36} />
                </View>
              )}
              <Image
                source={{ uri: imageUrls[0] }}
                style={[styles.image, !imageLoaded && styles.imageWhileLoading]}
                resizeMode="cover"
                onLoadEnd={() => setImageLoaded(true)}
                onError={() => {
                  setImageError(true);
                }}
              />
            </>
          ) : imageUrls.length >= 1 && imageError ? (
            <View style={styles.imagePlaceholder}>
              <TabIcon name="home" color={colors.textSecondary} size={36} />
              <Text style={styles.imagePlaceholderText}>No Image</Text>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <TabIcon name="home" color={colors.textSecondary} size={36} />
              <Text style={styles.imagePlaceholderText}>No Image</Text>
            </View>
          )}

          {/* Action Buttons Overlay - Heart top-right, Share top-left (above arrows so taps hit buttons) */}
          <View style={styles.actionsOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={(e: { stopPropagation: () => void }) => {
                e.stopPropagation();
                handleSharePress();
              }}
              activeOpacity={0.7}>
              <View style={styles.actionButtonContainer}>
                <TabIcon name="link" color={colors.textSecondary} size={18} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e: { stopPropagation: () => void }) => {
                e.stopPropagation();
                handleFavoritePress();
              }}
              activeOpacity={0.7}>
              <View style={styles.actionButtonContainer}>
                <TabIcon
                  name={(onFavoritePress ? isFavorite : favorite) ? 'heart' : 'heart-outline'}
                  color={(onFavoritePress ? isFavorite : favorite) ? '#E53935' : colors.textSecondary}
                  size={20}
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* Type Badge - Only show if not hidden */}
          {!hideTypeBadge && (
            <View
              style={[
                styles.badge,
                type === 'buy' ? styles.buyBadge : type === 'rent' ? styles.rentBadge : styles.pgBadge,
              ]}>
              <Text style={styles.badgeText}>
                {type === 'buy' ? 'Buy' : type === 'rent' ? 'Rent' : 'PG/Hostel'}
              </Text>
            </View>
          )}

          {/* Project Status Badge */}
          {property?.project_status && (
            <View style={[styles.badge, styles.projectBadge, getProjectStatusBadgeStyle(property.project_status)]}>
              <Text style={styles.badgeText}>
                {property.project_status}
              </Text>
            </View>
          )}
        </View>

        {/* Property Info */}
        <View style={styles.infoContainer}>
          <View style={styles.infoTop}>
            <Text style={styles.name} numberOfLines={1}>
              {capitalize(name)}
            </Text>
            <View style={styles.locationRow}>
              <TabIcon name="location" color={colors.error} size={14} />
              <Text style={styles.location} numberOfLines={1}>
                {location}
              </Text>
            </View>
            {(() => {
              const tags: string[] = [];
              if (property?.propertyType) {
                const typeMap: Record<string, string> = {
                  apartment: 'Apartment', villa: 'Villa', 'farm-house': 'Farm House',
                  bungalow: 'Bungalow', 'independent-house': 'Independent House',
                  'studio-apartment': 'Studio Apartment', penthouse: 'Penthouse',
                  'plot-land': 'Plot / Land', residential: 'Residential', land: 'Land',
                  commercial: 'Commercial', 'pg-hostel': 'PG / Hostel',
                };
                const pt = String(property.propertyType).toLowerCase().replace(/\s+/g, '-');
                tags.push(typeMap[pt] || pt.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));
              }
              const avail = (property?.availabilityStatus || property?.property_status || '').toString().toLowerCase();
              if (avail && (avail.includes('available') || avail.includes('ready') || avail.includes('completed'))) {
                tags.push('Ready to Move');
              }
              if (property?.area) {
                const a = String(property.area).trim();
                if (a && !tags.includes(a)) tags.push(a);
              }
              if (tags.length === 0) return null;
              const getTagStyle = (t: string) => {
                const lower = t.toLowerCase();
                if (lower.includes('ready') || lower.includes('available') || lower.includes('move')) return [styles.featureTag, styles.featureTagGreen];
                if (lower.includes('under') || lower.includes('construction')) return [styles.featureTag, styles.featureTagAmber];
                return styles.featureTag;
              };
              const getTagTextStyle = (t: string) => {
                const lower = t.toLowerCase();
                if (lower.includes('ready') || lower.includes('available') || lower.includes('move')) return [styles.featureTagText, styles.featureTagGreenText];
                if (lower.includes('under') || lower.includes('construction')) return [styles.featureTagText, styles.featureTagAmberText];
                return styles.featureTagText;
              };
              return (
                <View style={styles.featureTagsRow}>
                  {tags.slice(0, 3).map((tag, i) => (
                    <View key={i} style={getTagStyle(tag)}>
                      <Text style={getTagTextStyle(tag)}>{tag}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
          </View>
          <View style={styles.infoBottom}>
            <Text style={styles.price}>{price}</Text>
            <TouchableOpacity
              style={styles.viewDetailsButton}
              onPress={(e: { stopPropagation: () => void }) => {
                e.stopPropagation();
                if (onPress) onPress();
              }}
              activeOpacity={0.8}>
              <Text style={styles.viewDetailsText}>View Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

const CARD_RADIUS = 20;
const CARD_SHADOW = {
  shadowColor: '#0077C0',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.10,
  shadowRadius: 18,
  elevation: 4,
  backgroundColor: '#fff',
  borderWidth: 1,
  borderColor: colors.borderRef,
};

const IMAGE_HEIGHT = verticalScale(170);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: CARD_RADIUS,
    overflow: 'hidden',
    ...CARD_SHADOW,
    marginBottom: verticalScale(14),
  },
  imageContainer: {
    position: 'relative',
    height: IMAGE_HEIGHT,
    overflow: 'hidden',
    backgroundColor: colors.surfaceSecondary,
  },
  imageCarousel: {
    flex: 1,
    height: '100%',
  },
  imageCarouselContent: {
    alignItems: 'stretch',
  },
  slide: {
    height: '100%',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageWhileLoading: {
    position: 'absolute',
    opacity: 0,
  },
  navArrow: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  navArrowLeft: {
    right: 'auto',
    left: 10,
  },
  navArrowRight: {
    right: 10,
    left: 'auto',
  },
  navArrowText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
    textAlign: 'center',
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: verticalScale(12),
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(6),
    zIndex: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 14,
    height: 5,
    borderRadius: 3,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.surfaceSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionsOverlay: {
    position: 'absolute',
    top: verticalScale(12),
    left: scale(12),
    right: scale(12),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  shareButton: {
    marginRight: 'auto',
  },
  actionButtonContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: moderateScale(16),
  },
  badge: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 5,
    pointerEvents: 'none',
  },
  projectBadge: {
    bottom: 'auto',
    top: 12,
    left: 'auto',
    right: 12,
  },
  buyBadge: {
    backgroundColor: colors.primary,
  },
  rentBadge: {
    backgroundColor: '#1D242B',
  },
  pgBadge: {
    backgroundColor: '#1D242B',
  },
  // Project Status Colors
  preLaunchBadge: {
    backgroundColor: '#8B5CF6', // Purple
  },
  underConstructionBadge: {
    backgroundColor: '#F59E0B', // Amber
  },
  completedBadge: {
    backgroundColor: '#10B981', // Emerald
  },
  defaultProjectBadge: {
    backgroundColor: colors.primary, // Blue
  },
  badgeText: {
    fontSize: 9,
    fontFamily: typography.fontBold,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  infoContainer: {
    paddingHorizontal: scale(14),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(12),
    justifyContent: 'space-between',
  },
  infoTop: {
    marginBottom: verticalScale(6),
  },
  infoBottom: {
    gap: verticalScale(6),
  },
  name: {
    fontSize: moderateScale(13),
    fontFamily: typography.fontExtraBold,
    color: colors.text,
    lineHeight: moderateScale(17),
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: verticalScale(6),
  },
  location: {
    flex: 1,
    fontSize: moderateScale(12),
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: moderateScale(16),
  },
  featureTagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(6),
  },
  featureTag: {
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(3),
    borderRadius: borderRadius.round,
    backgroundColor: colors.primaryXlight,
  },
  featureTagText: {
    fontSize: moderateScale(11),
    fontWeight: '500',
    color: colors.primary,
  },
  featureTagGreen: {
    backgroundColor: colors.successLight,
  },
  featureTagGreenText: {
    color: '#16A34A',
  },
  featureTagAmber: {
    backgroundColor: colors.warningLight,
  },
  featureTagAmberText: {
    color: '#D97706',
  },
  price: {
    fontSize: moderateScale(16),
    fontFamily: typography.fontExtraBold,
    color: colors.primary,
  },
  viewDetailsButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: scale(12),
    paddingVertical: verticalScale(9),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  viewDetailsText: {
    fontSize: moderateScale(13),
    fontFamily: typography.fontBold,
    color: '#FFFFFF',
  },
});

export default PropertyCard;

