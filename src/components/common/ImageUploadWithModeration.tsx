import React, {useState} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../../theme';
import {moderationService, ImageUploadResult} from '../../services/moderation.service';
import {formatDetectionShort} from '../../services/detection.service';
import CustomAlert from '../../utils/alertHelper';

interface ImageWithModeration {
  uri: string;
  moderationStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'checking';
  moderationReason?: string;
  imageUrl?: string;
  detection?: ImageUploadResult['detection']; // Detection details
}

interface ImageUploadWithModerationProps {
  images: ImageWithModeration[];
  onImagesChange: (images: ImageWithModeration[]) => void;
  maxImages?: number;
  propertyId?: number | string;
  showModerationStatus?: boolean;
  onImageValidated?: (image: ImageWithModeration, result: ImageUploadResult) => void;
}

const ImageUploadWithModeration: React.FC<ImageUploadWithModerationProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  propertyId,
  showModerationStatus = true,
  onImageValidated,
}) => {
  const [validatingIndex, setValidatingIndex] = useState<number | null>(null);

  const validateImageThroughModeration = async (
    imageUri: string,
    index: number,
  ): Promise<ImageUploadResult> => {
    try {
      setValidatingIndex(index);
      
      // Update image status to checking
      const updatedImages = [...images];
      updatedImages[index] = {
        ...updatedImages[index],
        moderationStatus: 'checking',
      };
      onImagesChange(updatedImages);

      // Call moderation endpoint
      const result = await moderationService.uploadWithModeration(imageUri, propertyId);

      // Update image with moderation result including detection details
      const finalImages = [...images];
      finalImages[index] = {
        ...finalImages[index],
        moderationStatus:
          result.moderation_status === 'APPROVED' || result.moderation_status === 'SAFE'
            ? 'APPROVED'
            : result.moderation_status === 'REJECTED' || result.moderation_status === 'UNSAFE'
            ? 'REJECTED'
            : 'PENDING',
        moderationReason: result.moderation_reason,
        imageUrl: result.image_url,
        detection: result.detection, // Include detection details
      };
      onImagesChange(finalImages);

      // Callback for parent component
      if (onImageValidated) {
        onImageValidated(finalImages[index], result);
      }

      // Show alert for rejected images with detection details
      if (result.status === 'rejected' || result.moderation_status === 'REJECTED') {
        let alertMessage = result.moderation_reason || result.message || 'Image does not meet quality standards';
        
        // Add detection details if available
        if (result.detection) {
          const detectionParts: string[] = [];
          if (result.detection.humanDetected) {
            detectionParts.push(`👤 Human detected (${result.detection.facesCount + result.detection.humanObjectsCount} detections)`);
          }
          if (result.detection.animalDetected) {
            detectionParts.push(`🐾 Animal detected: ${result.detection.detectedAnimals.join(', ')}`);
          }
          
          if (detectionParts.length > 0) {
            alertMessage += '\n\n' + detectionParts.join('\n');
          }
        }
        
        CustomAlert.alert('Image Rejected', alertMessage);
      } else if (result.status === 'pending' || result.moderation_status === 'PENDING') {
        let alertMessage = 'This image is pending admin review and will be approved shortly.';
        
        // Add detection details if available
        if (result.detection && (result.detection.humanDetected || result.detection.animalDetected)) {
          const detectionParts: string[] = [];
          if (result.detection.humanDetected) {
            detectionParts.push(`👤 Human detected (${result.detection.facesCount + result.detection.humanObjectsCount} detections)`);
          }
          if (result.detection.animalDetected) {
            detectionParts.push(`🐾 Animal detected: ${result.detection.detectedAnimals.join(', ')}`);
          }
          alertMessage += '\n\nDetected: ' + detectionParts.join(', ');
        }
        
        CustomAlert.alert('Image Pending Review', alertMessage);
      }

      return result;
    } catch (error: any) {
      console.error('Image moderation error:', error);
      
      // Update image status to rejected on error
      const errorImages = [...images];
      errorImages[index] = {
        ...errorImages[index],
        moderationStatus: 'REJECTED',
        moderationReason: error.message || 'Failed to validate image',
      };
      onImagesChange(errorImages);

      CustomAlert.alert('Validation Error', error.message || 'Failed to validate image');
      
      return {
        status: 'rejected',
        message: error.message || 'Failed to validate image',
      };
    } finally {
      setValidatingIndex(null);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return colors.success || '#4CAF50';
      case 'REJECTED':
        return colors.error;
      case 'PENDING':
        return colors.warning || '#FF9800';
      case 'checking':
        return colors.textSecondary;
      default:
        return 'transparent';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return '✓ Approved';
      case 'REJECTED':
        return '✗ Rejected';
      case 'PENDING':
        return '⏳ Pending';
      case 'checking':
        return 'Checking...';
      default:
        return '';
    }
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  return (
    <View style={styles.container}>
      {images.map((image, index) => (
        <View key={index} style={styles.imageContainer}>
          <Image source={{uri: image.uri}} style={styles.image} />
          
          {showModerationStatus && image.moderationStatus && (
            <View
              style={[
                styles.statusBadge,
                {backgroundColor: getStatusColor(image.moderationStatus)},
              ]}>
              {validatingIndex === index ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.statusText}>
                  {getStatusText(image.moderationStatus)}
                </Text>
              )}
            </View>
          )}

          {/* Detection Details Badge */}
          {image.detection && (image.detection.humanDetected || image.detection.animalDetected) && (
            <View style={styles.detectionBadge}>
              <Text style={styles.detectionText} numberOfLines={1}>
                {image.detection.humanDetected ? '👤 ' : ''}
                {image.detection.animalDetected ? '🐾 ' : ''}
                {formatDetectionShort(image.detection)}
              </Text>
            </View>
          )}

          {/* Moderation Reason */}
          {image.moderationReason && image.moderationStatus === 'REJECTED' && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonText} numberOfLines={2}>
                {image.moderationReason}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeImage(index)}>
            <Text style={styles.removeButtonText}>×</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
  },
  imageContainer: {
    width: '30%',
    aspectRatio: 1,
    margin: spacing.xs,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  statusBadge: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 80,
    alignItems: 'center',
  },
  statusText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 10,
    fontWeight: '600',
  },
  detectionBadge: {
    position: 'absolute',
    bottom: 28, // Above reason container
    left: spacing.xs,
    right: spacing.xs,
    backgroundColor: 'rgba(255, 152, 0, 0.9)', // Orange warning color
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  detectionText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 9,
    fontWeight: '600',
  },
  reasonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.xs,
  },
  reasonText: {
    ...typography.caption,
    color: colors.surface,
    fontSize: 9,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 20,
  },
});

export default ImageUploadWithModeration;
export type {ImageWithModeration};

