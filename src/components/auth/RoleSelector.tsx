import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {colors, spacing, borderRadius, typography} from '../../theme';
import {UserRole} from '../../context/AuthContext';

interface RoleOption {
  role: UserRole;
  label: string;
  icon: string;
  description: string;
}

const roles: RoleOption[] = [
  {
    role: 'buyer',
    label: 'Buyer/Tenant',
    icon: '🏠',
    description: 'Looking for properties',
  },
  {
    role: 'seller',
    label: 'Seller/Owner',
    icon: '🏢',
    description: 'List your properties',
  },
  {
    role: 'agent',
    label: 'Agent/Builder',
    icon: '🏗️',
    description: 'Manage properties & clients',
  },
];

interface RoleSelectorProps {
  selected: UserRole | null;
  onChange: (role: UserRole) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({selected, onChange}) => {
  return (
    <View style={styles.container}>
      {roles.map(roleOption => {
        const isSelected = selected === roleOption.role;
        return (
          <TouchableOpacity
            key={roleOption.role}
            style={[
              styles.option,
              isSelected && styles.optionSelected,
            ]}
            onPress={() => onChange(roleOption.role)}
            activeOpacity={0.7}>
            <View style={styles.optionContent}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>{roleOption.icon}</Text>
              </View>
              <View style={styles.textContainer}>
                <Text
                  style={[
                    styles.label,
                    isSelected && styles.labelSelected,
                  ]}>
                  {roleOption.label}
                </Text>
                <Text
                  style={[
                    styles.description,
                    isSelected && styles.descriptionSelected,
                  ]}>
                  {roleOption.description}
                </Text>
              </View>
              <View
                style={[
                  styles.radio,
                  isSelected && styles.radioSelected,
                ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  option: {
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceSecondary,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 24,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  labelSelected: {
    color: colors.primary,
  },
  description: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  descriptionSelected: {
    color: colors.text,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
});

export default RoleSelector;

