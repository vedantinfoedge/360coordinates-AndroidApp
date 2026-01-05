import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../../navigation/AppNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';

type PropertyDetailsScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PropertyDetails'
>;

type PropertyDetailsScreenRouteProp = RouteProp<
  RootStackParamList,
  'PropertyDetails'
>;

type Props = {
  navigation: PropertyDetailsScreenNavigationProp;
  route: PropertyDetailsScreenRouteProp;
};

// Dummy property data
const getPropertyDetails = (id: string) => {
  const properties: Record<string, any> = {
    '1': {
      title: 'Modern Apartment',
      location: 'New York, NY',
      price: '$250,000',
      bedrooms: 2,
      bathrooms: 1,
      area: '1,200 sq ft',
      year: '2020',
      description:
        'Beautiful modern apartment in the heart of New York. Features include hardwood floors, updated kitchen, and spacious living area. Close to public transportation and shopping.',
      features: [
        'Hardwood Floors',
        'Updated Kitchen',
        'Central AC',
        'Parking Available',
        'Pet Friendly',
      ],
    },
    '2': {
      title: 'Luxury Villa',
      location: 'Los Angeles, CA',
      price: '$850,000',
      bedrooms: 4,
      bathrooms: 3,
      area: '3,500 sq ft',
      year: '2018',
      description:
        'Stunning luxury villa with panoramic views. Features include private pool, gourmet kitchen, home theater, and spacious master suite. Perfect for entertaining.',
      features: [
        'Private Pool',
        'Gourmet Kitchen',
        'Home Theater',
        'Wine Cellar',
        'Smart Home System',
      ],
    },
    '3': {
      title: 'Cozy House',
      location: 'Chicago, IL',
      price: '$320,000',
      bedrooms: 3,
      bathrooms: 2,
      area: '2,100 sq ft',
      year: '2015',
      description:
        'Charming family home in a quiet neighborhood. Features include large backyard, finished basement, and updated bathrooms. Great for families.',
      features: [
        'Large Backyard',
        'Finished Basement',
        'Updated Bathrooms',
        'Two-Car Garage',
        'Fireplace',
      ],
    },
  };

  return (
    properties[id] || {
      title: 'Property',
      location: 'Location',
      price: '$0',
      bedrooms: 0,
      bathrooms: 0,
      area: '0 sq ft',
      year: '2020',
      description: 'Property description',
      features: [],
    }
  );
};

const PropertyDetailsScreen: React.FC<Props> = ({navigation, route}) => {
  const {propertyId} = route.params;
  const property = getPropertyDetails(propertyId);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.imagePlaceholder}>
        <Text style={styles.placeholderText}>Property Image Gallery</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>{property.title}</Text>
          <Text style={styles.location}>{property.location}</Text>
          <Text style={styles.price}>{property.price}</Text>
        </View>

        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bedrooms</Text>
              <Text style={styles.detailValue}>{property.bedrooms}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Bathrooms</Text>
              <Text style={styles.detailValue}>{property.bathrooms}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Area</Text>
              <Text style={styles.detailValue}>{property.area}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Year Built</Text>
              <Text style={styles.detailValue}>{property.year}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{property.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          {property.features.map((feature: string, index: number) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureText}>• {feature}</Text>
            </View>
          ))}
        </View>

        {/* Map Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>📍</Text>
              <Text style={styles.mapPlaceholderLabel}>Property Location</Text>
              <Text style={styles.mapPlaceholderAddress}>{property.location}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.chatButton}
          onPress={() => {
            // Navigate to chat screen
            navigation.navigate('Chat' as any, {
              screen: 'ChatConversation',
              params: {
                userId: 'owner-1',
                userName: 'Property Owner',
              },
            });
          }}>
          <Text style={styles.chatButtonText}>💬 Chat with Owner</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  imagePlaceholder: {
    height: 300,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  content: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  location: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  price: {
    ...typography.h2,
    color: colors.accent,
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  detailItem: {
    width: '48%',
    marginBottom: spacing.md,
  },
  detailLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  featureItem: {
    marginBottom: spacing.xs,
  },
  featureText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  mapContainer: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  mapPlaceholder: {
    height: 250,
    backgroundColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  mapPlaceholderText: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  mapPlaceholderLabel: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  mapPlaceholderAddress: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  chatButton: {
    backgroundColor: colors.cta,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  chatButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});

export default PropertyDetailsScreen;

