import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, Image} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../theme';

interface PropertyCardProps {
  image?: string;
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
  name,
  location,
  price,
  type,
  onPress,
  onFavoritePress,
  onSharePress,
  isFavorite = false,
  style,
}) => {
  const [favorite, setFavorite] = useState(isFavorite);
  const [imageError, setImageError] = useState(false);

  // Sync favorite state when prop changes
  React.useEffect(() => {
    setFavorite(isFavorite);
  }, [isFavorite]);

  // Reset image error when image URL changes
  React.useEffect(() => {
    setImageError(false);
  }, [image]);

  const handleFavoritePress = () => {
    // Optimistically update UI
    setFavorite(!favorite);
    if (onFavoritePress) {
      onFavoritePress();
    } else {
      // Default behavior
      Alert.alert(
        favorite ? 'Removed from Favorites' : 'Added to Favorites',
        `${name} has been ${favorite ? 'removed from' : 'added to'} your favorites.`,
      );
    }
  };

  const handleSharePress = () => {
    if (onSharePress) {
      onSharePress();
    } else {
      // Default behavior
      Alert.alert('Share Property', `Share ${name} - ${location} - ${price}`);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.8}>
      {/* Property Image */}
      <View style={styles.imageContainer}>
        {image && !imageError ? (
          <Image
            source={{uri: image}}
            style={styles.image}
            resizeMode="cover"
            onError={() => {
              console.warn('[PropertyCard] Failed to load image:', image);
              setImageError(true);
            }}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Text style={styles.imagePlaceholderText}>🏠</Text>
            <Text style={styles.imagePlaceholderText}>No Image</Text>
          </View>
        )}

        {/* Action Buttons Overlay */}
        <View style={styles.actionsOverlay}>
          {/* Favorite Button */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={e => {
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

          {/* Share Button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.shareButton]}
            onPress={e => {
              e.stopPropagation();
              handleSharePress();
            }}
            activeOpacity={0.7}>
            <View style={styles.actionButtonContainer}>
              <Text style={styles.actionIcon}>🔗</Text>
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
          {name}
        </Text>
        <Text style={styles.location} numberOfLines={1}>
          {location}
        </Text>
        <Text style={styles.price}>{price}</Text>
        
        {/* View Details Button */}
        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={e => {
            e.stopPropagation();
            if (onPress) {
              onPress();
            }
          }}
          activeOpacity={0.8}>
          <Text style={styles.viewDetailsText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: 280,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginRight: spacing.md,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    position: 'relative',
    height: 180,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  actionsOverlay: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  shareButton: {
    marginLeft: 'auto',
  },
  actionButtonContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    zIndex: 5,
  },
  buyBadge: {
    backgroundColor: colors.text,
  },
  rentBadge: {
    backgroundColor: colors.text,
  },
  pgBadge: {
    backgroundColor: colors.text,
  },
  badgeText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
  },
  infoContainer: {
    padding: spacing.md,
  },
  name: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  location: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  viewDetailsButton: {
    backgroundColor: colors.text,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  viewDetailsText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default PropertyCard;

