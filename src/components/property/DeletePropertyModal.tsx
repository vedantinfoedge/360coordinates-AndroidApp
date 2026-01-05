import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Modal from '../common/Modal';

interface DeletePropertyModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const DeletePropertyModal: React.FC<DeletePropertyModalProps> = ({
  visible,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Delete Property</Text>
      <Text style={styles.message}>
        Are you sure you want to delete this property? This action cannot be undone.
      </Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={onConfirm}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1A1A1A',
  },
  message: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  cancelButton: {
    padding: 12,
  },
  cancelText: {
    color: '#666666',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#E53935',
    padding: 12,
    borderRadius: 8,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DeletePropertyModal;

