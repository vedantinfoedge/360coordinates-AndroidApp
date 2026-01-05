import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

interface UpcomingProjectCardProps {
  name: string;
  city: string;
  onPress?: () => void;
}

const UpcomingProjectCard: React.FC<UpcomingProjectCardProps> = ({
  name,
  city,
  onPress,
}) => {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.content}>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.city}>{city}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginRight: 16,
    width: 200,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1A1A1A',
  },
  city: {
    fontSize: 14,
    color: '#666666',
  },
});

export default UpcomingProjectCard;

