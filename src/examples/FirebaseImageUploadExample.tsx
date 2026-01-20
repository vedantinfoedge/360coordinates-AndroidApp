/**
 * Firebase Image Upload Example Component
 * Based on the implementation guide
 * 
 * This is an example showing how to use the Firebase image upload service
 * in a React Native component.
 */

import React, {useState} from 'react';
import {View, Button, Image, Alert, StyleSheet, ScrollView} from 'react-native';
import {launchImageLibrary, ImagePickerResponse} from 'react-native-image-picker';
import {uploadImage, updateProperty, UploadImageResult} from '../services/firebaseImageUpload.service';

interface ImageItem {
  uri: string;
  type?: string;
  name: string;
  uploadedUrl?: string;
  uploading?: boolean;
  uploadResult?: UploadImageResult;
}

interface Props {
  propertyId: number | string;
}

const FirebaseImageUploadExample: React.FC<Props> = ({propertyId}) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [uploading, setUploading] = useState(false);

  const pickImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 10, // Allow multiple images
      },
      (response: ImagePickerResponse) => {
        if (response.didCancel || response.errorCode) {
          return;
        }

        if (response.assets && response.assets.length > 0) {
          const newImages: ImageItem[] = response.assets.map(asset => ({
            uri: asset.uri || '',
            type: asset.type,
            name: asset.fileName || 'image.jpg',
          }));
          setImages([...images, ...newImages]);
        }
      },
    );
  };

  const uploadImages = async () => {
    if (images.length === 0) {
      Alert.alert('Error', 'Please select at least one image');
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      // Upload each image
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        // Skip if already uploaded
        if (image.uploadedUrl) {
          uploadedUrls.push(image.uploadedUrl);
          continue;
        }

        // Mark as uploading
        setImages(prev => {
          const updated = [...prev];
          updated[i] = {...updated[i], uploading: true};
          return updated;
        });

        try {
          const result = await uploadImage(image.uri, propertyId, true);
          
          if (result.success && result.data?.url) {
            uploadedUrls.push(result.data.url);
            
            // Update image with result
            setImages(prev => {
              const updated = [...prev];
              updated[i] = {
                ...updated[i],
                uploadedUrl: result.data.url,
                uploading: false,
                uploadResult: result,
              };
              return updated;
            });
          } else {
            throw new Error(result.message || 'Upload failed');
          }
        } catch (error: any) {
          console.error(`Failed to upload image ${i + 1}:`, error);
          
          // Mark as failed
          setImages(prev => {
            const updated = [...prev];
            updated[i] = {
              ...updated[i],
              uploading: false,
            };
            return updated;
          });
          
          Alert.alert(
            'Upload Failed',
            `Failed to upload image ${i + 1}: ${error.message || 'Unknown error'}`,
          );
        }
      }

      // Update property with image URLs
      if (uploadedUrls.length > 0) {
        try {
          await updateProperty(propertyId, {images: uploadedUrls});
          Alert.alert('Success', 'Images uploaded successfully!');
        } catch (error: any) {
          console.error('Failed to update property:', error);
          Alert.alert(
            'Warning',
            'Images uploaded but failed to update property: ' + (error.message || 'Unknown error'),
          );
        }
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Button title="Pick Images" onPress={pickImage} />
      <Button
        title={uploading ? 'Uploading...' : 'Upload Images'}
        onPress={uploadImages}
        disabled={uploading || images.length === 0}
      />
      <View style={styles.imageContainer}>
        {images.map((img, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{uri: img.uri}} style={styles.image} />
            {img.uploading && <View style={styles.uploadingOverlay} />}
            {img.uploadedUrl && (
              <View style={styles.successBadge}>
                <Button title="✓" onPress={() => {}} />
              </View>
            )}
            {img.uploadResult && (
              <View style={styles.statusBadge}>
                <Button
                  title={img.uploadResult.data.moderation_status}
                  onPress={() => {}}
                />
              </View>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  imageWrapper: {
    width: 100,
    height: 100,
    margin: 8,
    position: 'relative',
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 8,
  },
  successBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'green',
    borderRadius: 12,
    width: 24,
    height: 24,
  },
  statusBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 4,
    padding: 4,
  },
});

export default FirebaseImageUploadExample;
