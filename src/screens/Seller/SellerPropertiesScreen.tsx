import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {colors, spacing, typography, borderRadius} from '../../theme';
import Button from '../../components/common/Button';
import {propertyService} from '../../services/property.service';
import {fixImageUrl} from '../../utils/imageHelper';

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

interface Property {
  id: string;
  title: string;
  location: string;
  price: string;
  status: 'active' | 'pending' | 'sold';
}

const SellerPropertiesScreen: React.FC<Props> = ({navigation}) => {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyProperties();
  }, []);

  const loadMyProperties = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getMyProperties();
      if (response.success) {
        // Handle exact backend response structure
        const propertiesData = response.data?.properties || response.data || [];
        if (Array.isArray(propertiesData)) {
          // Fix image URLs
          const fixedProperties = propertiesData.map((prop: any) => ({
            ...prop,
            cover_image: fixImageUrl(prop.cover_image),
          }));
          setProperties(fixedProperties);
        } else {
          setProperties([]);
        }
      }
    } catch (error) {
      console.error('Error loading properties:', error);
      Alert.alert('Error', 'Failed to load properties');
    } finally {
      setLoading(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'sold':
        return colors.textSecondary;
      default:
        return colors.textSecondary;
    }
  };

  const handleEdit = (propertyId: string) => {
    // Navigate to edit property screen
    navigation.navigate('AddProperty' as never);
    // In real app, pass propertyId to edit screen
  };

  const handleDelete = async (propertyId: string) => {
    Alert.alert(
      'Delete Property',
      'Are you sure you want to delete this property?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await propertyService.deleteProperty(propertyId.toString());
              if (response.success) {
                Alert.alert('Success', 'Property deleted successfully');
                loadMyProperties(); // Reload list
              } else {
                Alert.alert('Error', response.message || 'Failed to delete property');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete property');
            }
          },
        },
      ],
    );
  };

  const handleViewDetails = (propertyId: string) => {
    navigation.navigate('PropertyDetails', {propertyId});
  };

  const renderProperty = ({item}: {item: any}) => (
    <View style={styles.propertyCard}>
      <TouchableOpacity
        style={styles.propertyContent}
        onPress={() => handleViewDetails(item.id)}>
        {item.cover_image ? (
          <Image source={{uri: fixImageUrl(item.cover_image)}} style={styles.propertyImage} />
        ) : (
          <View style={styles.propertyImagePlaceholder}>
            <Text style={styles.placeholderText}>Property Image</Text>
          </View>
        )}
        <View style={styles.propertyInfo}>
          <View style={styles.propertyHeader}>
            <Text style={styles.propertyTitle}>{item.title}</Text>
            <View
              style={[styles.statusBadge, {backgroundColor: getStatusColor(item.is_active ? 'active' : 'sold')}]}>
              <Text style={styles.statusText}>{item.is_active ? 'ACTIVE' : 'INACTIVE'}</Text>
            </View>
          </View>
          <Text style={styles.propertyLocation}>{item.location}</Text>
          <Text style={styles.propertyPrice}>
            {item.status === 'sale' 
              ? `₹${parseFloat(item.price).toLocaleString()}` 
              : `₹${parseFloat(item.price).toLocaleString()}/month`}
          </Text>
          <View style={styles.propertyStats}>
            <Text style={styles.statText}>👁️ {item.views_count || 0}</Text>
            <Text style={styles.statText}>💬 {item.inquiry_count || 0}</Text>
            <Text style={styles.statText}>❤️ {item.favorite_count || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEdit(item.id)}>
          <Text style={styles.actionButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewDetails(item.id)}>
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.id)}>
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Properties</Text>
        <Button
          title="+ Add Property"
          onPress={() => navigation.navigate('AddProperty' as never)}
          variant="primary"
        />
      </View>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading properties...</Text>
        </View>
      ) : (
        <FlatList
          data={properties}
          renderItem={renderProperty}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={loadMyProperties}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No properties listed</Text>
              <Text style={styles.emptySubtext}>
                Add your first property to get started
              </Text>
              <Button
                title="Add Property"
                onPress={() => navigation.navigate('AddProperty' as never)}
                variant="primary"
                fullWidth
              />
            </View>
          }
          showsVerticalScrollIndicator={false}
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
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  propertyTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  statusText: {
    ...typography.small,
    color: colors.surface,
    fontWeight: '600',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
  },
  propertyContent: {
    flexDirection: 'row',
  },
  actionButtons: {
    flexDirection: 'row',
    padding: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.sm,
    marginHorizontal: spacing.xs,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: colors.info,
  },
  viewButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
  },
  actionButtonText: {
    ...typography.caption,
    color: colors.surface,
    fontWeight: '600',
  },
  deleteButtonText: {
    color: colors.surface,
  },
  propertyImage: {
    width: 120,
    height: 200,
    resizeMode: 'cover',
  },
  propertyStats: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.md,
  },
  statText: {
    ...typography.caption,
    color: colors.textSecondary,
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
});

export default SellerPropertiesScreen;

