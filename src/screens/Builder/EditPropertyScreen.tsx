import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {BuilderTabParamList} from '../../components/navigation/BuilderTabNavigator';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {useAuth} from '../../context/AuthContext';
import BuilderHeader from '../../components/BuilderHeader';
import {propertyService} from '../../services/property.service';
import {sellerService} from '../../services/seller.service';
import {formatters} from '../../utils/formatters';
import CustomAlert from '../../utils/alertHelper';

type EditPropertyScreenNavigationProp = NativeStackNavigationProp<
  BuilderTabParamList,
  'EditProperty'
>;

type EditPropertyScreenRouteProp = RouteProp<BuilderTabParamList, 'EditProperty'>;

type Props = {
  navigation: EditPropertyScreenNavigationProp;
  route: EditPropertyScreenRouteProp;
};

const EditPropertyScreen: React.FC<Props> = ({navigation, route}) => {
  const {logout} = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [property, setProperty] = useState<any>(null);
  
  // Form fields
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('');
  
  // Check if property can be fully edited
  const [canFullEdit, setCanFullEdit] = useState(false);
  const [isProject, setIsProject] = useState(false);

  useEffect(() => {
    loadProperty();
  }, [route.params.propertyId]);

  const loadProperty = async () => {
    try {
      setLoading(true);
      const response = await propertyService.getPropertyDetails(route.params.propertyId);
      
      if (response && response.success && response.data) {
        const propData = response.data.property || response.data;
        setProperty(propData);
        setTitle(propData.title || propData.property_title || '');
        setPrice(String(propData.price || ''));
        setLocation(propData.location || propData.city || propData.address || '');
        
        // Check if it's a project (upcoming)
        const projectType = propData.project_type || propData.property_type;
        const isUpcoming = projectType === 'upcoming' || projectType === 'Upcoming Project';
        setIsProject(isUpcoming);
        
        // Check if property was created within 24 hours
        const createdAt = propData.created_at || propData.created_date || propData.date_created;
        let within24Hours = false;
        
        if (createdAt) {
          const createdDate = new Date(createdAt);
          const now = new Date();
          const diffMs = now.getTime() - createdDate.getTime();
          const diffHours = diffMs / (1000 * 60 * 60);
          within24Hours = diffHours < 24;
        }
        
        // Projects can always be fully edited, regular properties only within 24 hours
        setCanFullEdit(isUpcoming || within24Hours);
      } else {
        CustomAlert.alert('Error', 'Failed to load property details');
        navigation.goBack();
      }
    } catch (error: any) {
      console.error('Error loading property:', error);
      CustomAlert.alert('Error', error.message || 'Failed to load property details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      CustomAlert.alert('Error', 'Title is required');
      return;
    }
    if (!price.trim() || isNaN(parseFloat(price))) {
      CustomAlert.alert('Error', 'Valid price is required');
      return;
    }
    if (!location.trim()) {
      CustomAlert.alert('Error', 'Location is required');
      return;
    }

    try {
      setSaving(true);
      
      // Prepare update data based on edit permissions
      const updateData: any = {
        title: title.trim(),
        price: parseFloat(price),
        location: location.trim(),
      };
      
      // Only include other fields if full edit is allowed
      if (canFullEdit && property) {
        // Add other editable fields here if needed
        // For now, we're only allowing title, price, location
        // You can expand this based on your requirements
      }
      
      const response = await sellerService.updateProperty(route.params.propertyId, updateData);
      
      if (response && response.success) {
        CustomAlert.alert('Success', 'Project updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      } else {
        CustomAlert.alert('Error', (response && response.message) || 'Failed to update project');
      }
    } catch (error: any) {
      console.error('Error updating project:', error);
      CustomAlert.alert('Error', error.message || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <BuilderHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={logout}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading project...</Text>
        </View>
      </View>
    );
  }

  if (!property) {
    return (
      <View style={styles.container}>
        <BuilderHeader
          onProfilePress={() => navigation.navigate('Profile')}
          onSupportPress={() => navigation.navigate('Support')}
          onLogoutPress={logout}
        />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Project not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <BuilderHeader
        onProfilePress={() => navigation.navigate('Profile')}
        onSupportPress={() => navigation.navigate('Support')}
        onLogoutPress={logout}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Edit Project</Text>
          {!canFullEdit && (
            <View style={styles.restrictionBadge}>
              <Text style={styles.restrictionText}>
                Limited Edit: Only title, price, and location can be changed
              </Text>
            </View>
          )}
          {isProject && (
            <View style={styles.projectBadge}>
              <Text style={styles.projectText}>Project - Full editing allowed</Text>
            </View>
          )}
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Project Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Enter project title"
              editable={true}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Price *</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="Enter price"
              keyboardType="numeric"
              editable={true}
            />
            <Text style={styles.hint}>
              Current: {formatters.price(parseFloat(property.price || '0'), property.status === 'rent')}
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location *</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter location"
              editable={true}
            />
          </View>

          {!canFullEdit && (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ⚠️ This project was created more than 24 hours ago. You can only edit the title, price, and location.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color={colors.surface} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
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
    ...typography.h2,
    color: colors.text,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  restrictionBadge: {
    backgroundColor: colors.warning + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  restrictionText: {
    ...typography.caption,
    color: colors.warning,
    fontSize: 12,
  },
  projectBadge: {
    backgroundColor: colors.success + '20',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
  },
  projectText: {
    ...typography.caption,
    color: colors.success,
    fontSize: 12,
  },
  form: {
    marginBottom: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.text,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    fontSize: 12,
  },
  infoBox: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default EditPropertyScreen;
