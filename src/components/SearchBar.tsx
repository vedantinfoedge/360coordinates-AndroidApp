import React from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../theme';

interface SearchBarProps {
  placeholder?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  onSearchPress?: () => void;
  navigation?: any;
}

const SearchBar: React.FC<SearchBarProps> = ({
  placeholder = 'Search by city, locality, project',
  value,
  onChangeText,
  onSearchPress,
  navigation,
}) => {
  const handleSearch = () => {
    if (onSearchPress) {
      onSearchPress();
    } else if (navigation) {
      navigation.navigate('SearchResults', {searchQuery: value || ''});
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        {/* Location Icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>📍</Text>
        </View>

        {/* Search Input */}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          value={value}
          onChangeText={onChangeText}
          onSubmitEditing={handleSearch}
        />

        {/* Search Icon */}
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          activeOpacity={0.7}>
          <Text style={styles.searchIcon}>🔍</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    padding: spacing.xs,
  },
  icon: {
    fontSize: 18,
  },
  input: {
    flex: 1,
    ...typography.body,
    color: colors.text,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  searchButton: {
    padding: spacing.xs,
  },
  searchIcon: {
    fontSize: 18,
  },
});

export default SearchBar;

