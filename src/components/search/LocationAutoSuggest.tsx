import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

interface LocationAutoSuggestProps {
  suggestions: string[];
  onSelect: (location: string) => void;
}

const LocationAutoSuggest: React.FC<LocationAutoSuggestProps> = ({
  suggestions,
  onSelect,
}) => {
  return (
    <View style={styles.container}>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={index}
          style={styles.suggestion}
          onPress={() => onSelect(suggestion)}>
          <Text style={styles.suggestionText}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestion: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  suggestionText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
});

export default LocationAutoSuggest;

