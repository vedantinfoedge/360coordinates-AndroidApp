import React, {useState, useEffect, useRef, useMemo} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image, Animated, ScrollView} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../theme';
import CustomAlert from '../utils/alertHelper';
import {capitalize} from '../utils/formatters';

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
}) => {
  const [favorite, setFavorite] = useState(isFavorite);
  const [imageError, setImageError] = useState(false);
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

  // Reset image error when image URL changes
  React.useEffect(() => {
    setImageError(false);
  }, [image]);

  const [imageErrorIndices, setImageErrorIndices] = useState<Set<number>>(new Set());
  const scrollViewRef = useRef<{scrollTo: (opts: {x: number; animated?: boolean}) => void} | null>(null);
  React.useEffect(() => {
    setImageErrorIndices(new Set());
    setCurrentIndex(0);
  }, [imageUrls.length]);

  const onImageContainerLayout = (e: {nativeEvent: {layout: {width: number}}}) => {
    const {width} = e.nativeEvent.layout;
    if (width > 0) setSlideWidth(width);
  };

  const onScrollEnd = (e: {nativeEvent: {contentOffset: {x: number}}}) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    if (slideWidth > 0) {
      const index = Math.round(offsetX / slideWidth);
      setCurrentIndex(Math.min(index, imageUrls.length - 1));
    }
  };

  const goToPrev = () => {
    if (currentIndex <= 0 || slideWidth <= 0) return;
    const nextIndex = currentIndex - 1;
    scrollViewRef.current?.scrollTo({x: nextIndex * slideWidth, animated: true});
    setCurrentIndex(nextIndex);
  };

  const goToNext = () => {
    if (currentIndex >= imageUrls.length - 1 || slideWidth <= 0) return;
    const nextIndex = currentIndex + 1;
    scrollViewRef.current?.scrollTo({x: nextIndex * slideWidth, animated: true});
    setCurrentIndex(nextIndex);
  };

  const handleFavoritePress = () => {
    // Optimistically update UI
    setFavorite(!favorite);
    if (onFavoritePress) {
      onFavoritePress();
    } else {
      // Default behavior
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

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      style={style}>
      <Animated.View
        style={[styles.card, style, {transform: [{scale: scaleAnim}]}]}>
        {/* Property Image - carousel when multiple images */}
        <View style={styles.imageContainer} onLayout={onImageContainerLayout}>
          {hasMultipleImages && slideWidth > 0 ? (
            <>
              <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={onScrollEnd}
                onScrollEndDrag={onScrollEnd}
                decelerationRate="fast"
                style={styles.imageCarousel}
                contentContainerStyle={styles.imageCarouselContent}>
                {imageUrls.map((uri, index) => (
                  <View key={`img-${index}`} style={[styles.slide, {width: slideWidth}]}>
                    {imageErrorIndices.has(index) ? (
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.imagePlaceholderText}>🏠</Text>
                        <Text style={styles.imagePlaceholderText}>No Image</Text>
                      </View>
                    ) : (
                      <Image
                        source={{uri}}
                        style={styles.image}
                        resizeMode="cover"
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
                onPress={(e: {stopPropagation: () => void}) => {
                  e.stopPropagation();
                  goToPrev();
                }}
                activeOpacity={0.8}
                disabled={currentIndex <= 0}>
                <Text style={[styles.navArrowText, currentIndex <= 0 && styles.navArrowDisabled]}>
                  ‹
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={(e: {stopPropagation: () => void}) => {
                  e.stopPropagation();
                  goToNext();
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
            <Image
              source={{uri: imageUrls[0]}}
              style={styles.image}
              resizeMode="cover"
              onError={() => {
                setImageError(true);
              }}
            />
          ) : imageUrls.length >= 1 && imageError ? (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>🏠</Text>
              <Text style={styles.imagePlaceholderText}>No Image</Text>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>🏠</Text>
              <Text style={styles.imagePlaceholderText}>No Image</Text>
            </View>
          )}

          {/* Action Buttons Overlay - Heart top-right, Share top-left (above arrows so taps hit buttons) */}
          <View style={styles.actionsOverlay} pointerEvents="box-none">
            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton]}
              onPress={(e: {stopPropagation: () => void}) => {
                e.stopPropagation();
                handleSharePress();
              }}
              activeOpacity={0.7}>
              <View style={styles.actionButtonContainer}>
                <Text style={styles.actionIcon}>🔗</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e: {stopPropagation: () => void}) => {
                e.stopPropagation();
                handleFavoritePress();
              }}
              activeOpacity={0.7}>
              <View style={styles.actionButtonContainer}>
                <Text style={styles.actionIcon}>
                  {favorite ? '❤️' : '🤍'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Type Badge */}
          <View
            style={[
              styles.badge,
              type === 'buy' ? styles.buyBadge : type === 'rent' ? styles.rentBadge : styles.pgBadge,
            ]}>
            <Text style={styles.badgeText}>
              {type === 'buy' ? 'Buy' : type === 'rent' ? 'Rent' : 'PG/Hostel'}
            </Text>
          </View>
        </View>

        {/* Property Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.name} numberOfLines={1}>
            {capitalize(name)}
          </Text>
          <Text style={styles.location} numberOfLines={1}>
            {location}
          </Text>
          <Text style={styles.price}>{price}</Text>
          
          {/* View Details Button */}
          <TouchableOpacity
            style={styles.viewDetailsButton}
            onPress={(e: {stopPropagation: () => void}) => {
              e.stopPropagation();
              if (onPress) {
                onPress();
              }
            }}
            activeOpacity={0.8}>
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Modern Airbnb-inspired card styling
const CARD_RADIUS = 16;
const CARD_SHADOW = {
  shadowColor: '#000',
  shadowOffset: {width: 0, height: 4},
  shadowOpacity: 0.08,
  shadowRadius: 16,
  elevation: 4,
};

const styles = StyleSheet.create({
  card: {
    width: 300,
    backgroundColor: colors.surface,
    borderRadius: CARD_RADIUS,
    marginRight: spacing.lg,
    overflow: 'hidden',
    ...CARD_SHADOW,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
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
  navArrow: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 11,
  },
  navArrowLeft: {
    left: 4,
  },
  navArrowRight: {
    right: 4,
  },
  navArrowText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#222',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    width: 32,
    height: 32,
    borderRadius: 16,
    textAlign: 'center',
    lineHeight: 30,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  navArrowDisabled: {
    opacity: 0.3,
  },
  dotsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dotActive: {
    backgroundColor: '#FFFFFF',
    width: 7,
    height: 7,
    borderRadius: 4,
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
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 20,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
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
    fontSize: 16,
  },
  badge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    zIndex: 5,
    pointerEvents: 'none',
  },
  buyBadge: {
    backgroundColor: colors.primary,
  },
  rentBadge: {
    backgroundColor: '#10B981',
  },
  pgBadge: {
    backgroundColor: '#F59E0B',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  infoContainer: {
    padding: 16,
    paddingTop: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    lineHeight: 22,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  viewDetailsButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});

export default PropertyCard;

