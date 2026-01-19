import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../theme';
import {useAuth} from '../context/AuthContext';
import BuyerHeader from '../components/BuyerHeader';
import {propertySearchService} from '../services/propertySearch.service';
import {fixImageUrl} from '../utils/imageHelper';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Property {
  id: string | number;
  title: string;
  location: string;
  city?: string;
  price: number | string;
  cover_image?: string;
  bedrooms?: number;
  bathrooms?: number;
}

const SearchScreen: React.FC<Props> = ({navigation}) => {
  const {logout} = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load initial properties when component mounts
    loadInitialProperties();
  }, []);

  const loadInitialProperties = async () => {
    try {
      setLoading(true);
      // Load recent approved properties
      const {propertyService} = await import('../services/property.service');
      const response = await propertyService.getProperties({
        status: 'approved',
        limit: 20,
      });
      
      if (response && response.success) {
        const propertiesData = response.data?.properties || response.data || [];
        const formatted = propertiesData.map((prop: any) => ({
          id: prop.id?.toString() || prop.property_id?.toString() || '',
          title: prop.title || prop.property_title || 'Untitled Property',
          location: prop.location || prop.city || 'Location not specified',
          city: prop.city,
          price: typeof prop.price === 'number' 
            ? `₹${prop.price.toLocaleString('en-IN')}` 
            : prop.price || 'Price not available',
          cover_image: fixImageUrl(prop.cover_image || prop.image || ''),
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
        }));
        setFilteredProperties(formatted);
      }
    } catch (error: any) {
      console.error('Error loading initial properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    if (query.trim() === '') {
      loadInitialProperties();
      return;
    }
    
    // Debounce search - wait 500ms after user stops typing
    const timeout = setTimeout(async () => {
      try {
        setLoading(true);
        const results = await propertySearchService.search(query);
        
        const formatted = results.map((prop: any) => ({
          id: prop.id?.toString() || prop.property_id?.toString() || '',
          title: prop.title || prop.property_title || 'Untitled Property',
          location: prop.location || prop.city || 'Location not specified',
          city: prop.city,
          price: typeof prop.price === 'number' 
            ? `₹${prop.price.toLocaleString('en-IN')}` 
            : prop.price || 'Price not available',
          cover_image: fixImageUrl(prop.cover_image || prop.image || ''),
          bedrooms: prop.bedrooms,
          bathrooms: prop.bathrooms,
        }));
        
        setFilteredProperties(formatted);
      } catch (error: any) {
        console.error('Error searching properties:', error);
        Alert.alert('Error', 'Failed to search properties. Please try again.');
      } finally {
        setLoading(false);
      }
    }, 500);
    
    setSearchTimeout(timeout);
  };

  const renderProperty = ({item}: {item: Property}) => {
    const priceText = typeof item.price === 'number' 
      ? `₹${item.price.toLocaleString('en-IN')}` 
      : item.price;
      
    return (
      <TouchableOpacity
        style={styles.propertyCard}
        onPress={() => navigation.navigate('PropertyDetails', {propertyId: String(item.id)})}>
        {item.cover_image ? (
          <Image source={{uri: item.cover_image}} style={styles.propertyImage} />
        ) : (
          <View style={styles.propertyImagePlaceholder}>
            <Text style={styles.placeholderText}>No Image</Text>
          </View>
        )}
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.propertyLocation} numberOfLines={1}>{item.location}</Text>
          <Text style={styles.propertyPrice}>{priceText}</Text>
          {(item.bedrooms || item.bathrooms) && (
            <Text style={styles.propertyDetails}>
              {item.bedrooms ? `${item.bedrooms} BHK` : ''} 
              {item.bedrooms && item.bathrooms ? ' • ' : ''}
              {item.bathrooms ? `${item.bathrooms} Bath` : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <BuyerHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search properties..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      {loading && filteredProperties.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : filteredProperties.length > 0 ? (
        <FlatList
          data={filteredProperties}
          renderItem={renderProperty}
          keyExtractor={item => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No properties found</Text>
          <Text style={styles.emptySubtext}>Try a different search term</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchContainer: {
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
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
  propertyDetails: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  propertyImage: {
    width: '100%',
    height: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyText: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
  },
});

export default SearchScreen;

