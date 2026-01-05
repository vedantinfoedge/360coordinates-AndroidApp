import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

interface LocationPickerProps {
  onLocationSelect: (location: {lat: number; lng: number}) => void;
}

const LocationPicker: React.FC<LocationPickerProps> = ({onLocationSelect}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.button}
        onPress={() => onLocationSelect({lat: 0, lng: 0})}>
        <Text style={styles.buttonText}>Pick Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#8B5CF6',
    padding: 16,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationPicker;

