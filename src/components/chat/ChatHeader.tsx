import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';

interface ChatHeaderProps {
  name: string;
  onBack?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({name, onBack}) => {
  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.name}>{name}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backIcon: {
    fontSize: 24,
    marginRight: 16,
    color: '#1A1A1A',
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
});

export default ChatHeader;

