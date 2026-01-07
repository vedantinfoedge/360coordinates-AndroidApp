import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../../theme';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSection {
  title: string;
  type: 'single' | 'multiple' | 'range' | 'text';
  options?: FilterOption[];
  min?: number;
  max?: number;
  unit?: string;
}

interface FilterSheetProps {
  visible: boolean;
  filters: FilterSection[];
  onApply: (filters: Record<string, any>) => void;
  onReset: () => void;
  onClose: () => void;
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  filters,
  onApply,
  onReset,
  onClose,
}) => {
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({});
  const [rangeValues, setRangeValues] = useState<Record<string, {min: number; max: number}>>({});

  const handleToggleFilter = (sectionTitle: string, value: string) => {
    setSelectedFilters(prev => {
      const current = prev[sectionTitle] || [];
      const isSelected = Array.isArray(current) && current.includes(value);
      
      if (isSelected) {
        return {
          ...prev,
          [sectionTitle]: current.filter((v: string) => v !== value),
        };
      } else {
        return {
          ...prev,
          [sectionTitle]: [...(Array.isArray(current) ? current : []), value],
        };
      }
    });
  };

  const handleSingleSelect = (sectionTitle: string, value: string) => {
    setSelectedFilters(prev => ({
      ...prev,
      [sectionTitle]: prev[sectionTitle] === value ? null : value,
    }));
  };

  const handleRangeChange = (sectionTitle: string, type: 'min' | 'max', value: string) => {
    setRangeValues(prev => ({
      ...prev,
      [sectionTitle]: {
        ...(prev[sectionTitle] || {min: 0, max: 0}),
        [type]: parseFloat(value) || 0,
      },
    }));
  };

  const handleApply = () => {
    const appliedFilters: Record<string, any> = {...selectedFilters};
    
    // Add range values
    Object.keys(rangeValues).forEach(key => {
      if (rangeValues[key].min > 0 || rangeValues[key].max > 0) {
        appliedFilters[`${key}_min`] = rangeValues[key].min;
        appliedFilters[`${key}_max`] = rangeValues[key].max;
      }
    });
    
    onApply(appliedFilters);
    onClose();
  };

  const handleReset = () => {
    setSelectedFilters({});
    setRangeValues({});
    onReset();
  };

  const renderFilterSection = (section: FilterSection) => {
    const currentValue = selectedFilters[section.title];
    const isSelected = (value: string) => {
      if (section.type === 'multiple') {
        return Array.isArray(currentValue) && currentValue.includes(value);
      }
      return currentValue === value;
    };

    return (
      <View key={section.title} style={styles.section}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        
        {section.type === 'single' && section.options && (
          <View style={styles.optionsContainer}>
            {section.options.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionChip,
                  isSelected(option.value) && styles.optionChipActive,
                ]}
                onPress={() => handleSingleSelect(section.title, option.value)}>
                <Text
                  style={[
                    styles.optionText,
                    isSelected(option.value) && styles.optionTextActive,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {section.type === 'multiple' && section.options && (
          <View style={styles.optionsContainer}>
            {section.options.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.optionChip,
                  isSelected(option.value) && styles.optionChipActive,
                ]}
                onPress={() => handleToggleFilter(section.title, option.value)}>
                <Text
                  style={[
                    styles.optionText,
                    isSelected(option.value) && styles.optionTextActive,
                  ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {section.type === 'range' && (
          <View style={styles.rangeContainer}>
            <View style={styles.rangeInputContainer}>
              <Text style={styles.rangeLabel}>Min {section.unit || ''}</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="0"
                keyboardType="numeric"
                value={rangeValues[section.title]?.min?.toString() || ''}
                onChangeText={value =>
                  handleRangeChange(section.title, 'min', value)
                }
              />
            </View>
            <Text style={styles.rangeSeparator}>-</Text>
            <View style={styles.rangeInputContainer}>
              <Text style={styles.rangeLabel}>Max {section.unit || ''}</Text>
              <TextInput
                style={styles.rangeInput}
                placeholder="0"
                keyboardType="numeric"
                value={rangeValues[section.title]?.max?.toString() || ''}
                onChangeText={value =>
                  handleRangeChange(section.title, 'max', value)
                }
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleReset}>
              <Text style={styles.resetText}>Reset</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {filters.map(renderFilterSection)}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.resetButton]}
              onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.applyButton]}
              onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  resetText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.text,
    fontWeight: '700',
  },
  closeText: {
    ...typography.h2,
    color: colors.text,
    fontWeight: 'bold',
  },
  content: {
    padding: spacing.lg,
    maxHeight: '70%',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  optionChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  optionChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
  },
  optionTextActive: {
    color: colors.surface,
    fontWeight: '600',
  },
  rangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  rangeInputContainer: {
    flex: 1,
  },
  rangeLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  rangeInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.background,
  },
  rangeSeparator: {
    ...typography.h3,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  applyButton: {
    backgroundColor: colors.primary,
  },
  applyButtonText: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
});

export default FilterSheet;

