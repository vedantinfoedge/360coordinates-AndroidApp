import React from 'react';
import {View, TextInput, StyleSheet} from 'react-native';

interface CompactSearchBarProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
}

const CompactSearchBar: React.FC<CompactSearchBarProps> = ({
  placeholder = 'Search...',
  value,
  onChangeText,
}) => {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  input: {
    padding: 8,
    fontSize: 14,
    color: '#1A1A1A',
  },
});

export default CompactSearchBar;

