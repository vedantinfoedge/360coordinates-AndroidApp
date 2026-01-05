import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

const MapView = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Map View</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    fontSize: 16,
    color: '#666666',
  },
});

export default MapView;

