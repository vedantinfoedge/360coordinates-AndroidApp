import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Property {
  id: string;
  title: string;
  location: string;
  price: string;
}

const favoriteProperties: Property[] = [
  {
    id: '1',
    title: 'Luxury 3BHK Apartment',
    location: 'Bandra West, Mumbai',
    price: '₹2.5 Cr',
  },
  {
    id: '2',
    title: 'Modern Villa',
    location: 'Whitefield, Bangalore',
    price: '₹4.2 Cr',
  },
  {
    id: '3',
    title: 'Spacious 2BHK',
    location: 'Gurgaon Sector 43',
    price: '₹35,000/month',
  },
];

const FavoritesScreen: React.FC<Props> = ({navigation}) => {
  const renderProperty = ({item}: {item: Property}) => (
    <TouchableOpacity
      style={styles.propertyCard}
      onPress={() => navigation.navigate('PropertyDetails', {propertyId: item.id})}>
      <View style={styles.propertyImagePlaceholder}>
        <Text style={styles.placeholderText}>Property Image</Text>
      </View>
      <View style={styles.propertyInfo}>
        <Text style={styles.propertyTitle}>{item.title}</Text>
        <Text style={styles.propertyLocation}>{item.location}</Text>
        <Text style={styles.propertyPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  if (favoriteProperties.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No favorites yet</Text>
        <Text style={styles.emptySubtext}>
          Start exploring properties and add them to your favorites
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={favoriteProperties}
        renderItem={renderProperty}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContent: {
    padding: spacing.md,
  },
  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  propertyImagePlaceholder: {
    height: 200,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  propertyInfo: {
    padding: spacing.md,
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default FavoritesScreen;

