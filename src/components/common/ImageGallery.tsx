import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  FlatList,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../../theme';

const {width: SCREEN_WIDTH, height: SCREEN_HEIGHT} = Dimensions.get('window');

interface ImageGalleryProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  visible,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleThumbnailPress = (index: number) => {
    setCurrentIndex(index);
  };

  if (!visible || images.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.counter}>
            {currentIndex + 1} / {images.length}
          </Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Main Image */}
        <View style={styles.imageContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setCurrentIndex(index);
            }}
            contentOffset={{x: currentIndex * SCREEN_WIDTH, y: 0}}>
            {images.map((image, index) => (
              <Image
                key={index}
                source={{uri: image}}
                style={styles.mainImage}
                resizeMode="contain"
              />
            ))}
          </ScrollView>

          {/* Navigation Buttons */}
          {currentIndex > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.prevButton]}
              onPress={handlePrevious}>
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
          )}
          {currentIndex < images.length - 1 && (
            <TouchableOpacity
              style={[styles.navButton, styles.nextButton]}
              onPress={handleNext}>
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <View style={styles.thumbnailContainer}>
            <FlatList
              data={images}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => `${index}`}
              renderItem={({item, index}) => (
                <TouchableOpacity
                  onPress={() => handleThumbnailPress(index)}
                  style={[
                    styles.thumbnail,
                    index === currentIndex && styles.thumbnailActive,
                  ]}>
                  <Image
                    source={{uri: item}}
                    style={styles.thumbnailImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.thumbnailList}
            />
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  counter: {
    ...typography.body,
    color: colors.surface,
    fontWeight: '600',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: colors.surface,
    fontWeight: 'bold',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  prevButton: {
    left: spacing.md,
  },
  nextButton: {
    right: spacing.md,
  },
  navButtonText: {
    fontSize: 32,
    color: colors.surface,
    fontWeight: 'bold',
  },
  thumbnailContainer: {
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingVertical: spacing.sm,
  },
  thumbnailList: {
    paddingHorizontal: spacing.md,
  },
  thumbnail: {
    width: 80,
    height: 80,
    marginRight: spacing.sm,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
});

export default ImageGallery;

