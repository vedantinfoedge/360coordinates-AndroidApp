import React, {useState, useRef, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  Animated,
} from 'react-native';
import {colors, spacing, typography, borderRadius} from '../../theme';
import LinearGradient from 'react-native-linear-gradient';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const SLIDER_WIDTH = SCREEN_WIDTH - spacing.lg * 4; // Account for padding

interface RangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onValueChange: (min: number, max: number) => void;
  formatValue?: (value: number) => string;
  step?: number;
  showMarkers?: boolean;
  gradientColors?: string[];
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  min,
  max,
  minValue,
  maxValue,
  onValueChange,
  formatValue,
  step = 1,
  showMarkers = true,
  gradientColors = [colors.accent, colors.primary, colors.secondary],
}) => {
  const sliderWidth = SLIDER_WIDTH;
  
  // Calculate positions
  const getPosition = useCallback(
    (value: number) => {
      if (max === min) return 0;
      return ((value - min) / (max - min)) * sliderWidth;
    },
    [min, max, sliderWidth],
  );

  // Use refs to track current values during drag (to avoid re-renders)
  const currentMinValue = useRef(minValue);
  const currentMaxValue = useRef(maxValue);
  const isDragging = useRef(false);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [minPosition, setMinPosition] = useState(getPosition(minValue));
  const [maxPosition, setMaxPosition] = useState(getPosition(maxValue));
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const [displayMinValue, setDisplayMinValue] = useState(minValue);
  const [displayMaxValue, setDisplayMaxValue] = useState(maxValue);

  const minThumbAnimated = useRef(new Animated.Value(getPosition(minValue))).current;
  const maxThumbAnimated = useRef(new Animated.Value(getPosition(maxValue))).current;

  // Update positions when values change externally (only when not dragging)
  useEffect(() => {
    if (!isDragging.current) {
      const newMinPos = getPosition(minValue);
      const newMaxPos = getPosition(maxValue);
      setMinPosition(newMinPos);
      setMaxPosition(newMaxPos);
      setDisplayMinValue(minValue);
      setDisplayMaxValue(maxValue);
      currentMinValue.current = minValue;
      currentMaxValue.current = maxValue;
      minThumbAnimated.setValue(newMinPos);
      maxThumbAnimated.setValue(newMaxPos);
    }
  }, [minValue, maxValue, getPosition, minThumbAnimated, maxThumbAnimated]);

  // Convert position to value
  const positionToValue = useCallback(
    (position: number) => {
      const clampedPosition = Math.max(0, Math.min(position, sliderWidth));
      const value = (clampedPosition / sliderWidth) * (max - min) + min;
      return Math.round(value / step) * step;
    },
    [min, max, sliderWidth, step],
  );

  // Debounced onValueChange to reduce parent re-renders
  const debouncedOnValueChange = useCallback(
    (newMin: number, newMax: number) => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      updateTimeoutRef.current = setTimeout(() => {
        onValueChange(newMin, newMax);
      }, 50); // Small delay to batch updates
    },
    [onValueChange],
  );

  // Update min value (optimized for smooth dragging)
  const updateMinValue = useCallback(
    (position: number) => {
      const newValue = positionToValue(position);
      const clampedValue = Math.max(min, Math.min(newValue, currentMaxValue.current - step));
      const newPosition = getPosition(clampedValue);
      
      // Update display immediately for smooth UI
      setMinPosition(newPosition);
      setDisplayMinValue(clampedValue);
      currentMinValue.current = clampedValue;
      minThumbAnimated.setValue(newPosition);
      
      // Debounce the parent update
      debouncedOnValueChange(clampedValue, currentMaxValue.current);
    },
    [min, step, positionToValue, getPosition, debouncedOnValueChange, minThumbAnimated],
  );

  // Update max value (optimized for smooth dragging)
  const updateMaxValue = useCallback(
    (position: number) => {
      const newValue = positionToValue(position);
      const clampedValue = Math.max(currentMinValue.current + step, Math.min(newValue, max));
      const newPosition = getPosition(clampedValue);
      
      // Update display immediately for smooth UI
      setMaxPosition(newPosition);
      setDisplayMaxValue(clampedValue);
      currentMaxValue.current = clampedValue;
      maxThumbAnimated.setValue(newPosition);
      
      // Debounce the parent update
      debouncedOnValueChange(currentMinValue.current, clampedValue);
    },
    [max, step, positionToValue, getPosition, debouncedOnValueChange, maxThumbAnimated],
  );

  // Min thumb pan responder
  const panResponderMin = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
        setActiveThumb('min');
        minThumbAnimated.setOffset(minPosition);
        minThumbAnimated.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = minPosition + gestureState.dx;
        updateMinValue(newPosition);
      },
      onPanResponderRelease: () => {
        const currentValue = minThumbAnimated._value + minThumbAnimated._offset;
        minThumbAnimated.flattenOffset();
        setActiveThumb(null);
        isDragging.current = false;
        // Final update on release
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        updateMinValue(currentValue);
        // Ensure final value is sent
        setTimeout(() => {
          onValueChange(currentMinValue.current, currentMaxValue.current);
        }, 100);
      },
    }),
  ).current;

  // Max thumb pan responder
  const panResponderMax = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        isDragging.current = true;
        setActiveThumb('max');
        maxThumbAnimated.setOffset(maxPosition);
        maxThumbAnimated.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const newPosition = maxPosition + gestureState.dx;
        updateMaxValue(newPosition);
      },
      onPanResponderRelease: () => {
        const currentValue = maxThumbAnimated._value + maxThumbAnimated._offset;
        maxThumbAnimated.flattenOffset();
        setActiveThumb(null);
        isDragging.current = false;
        // Final update on release
        if (updateTimeoutRef.current) {
          clearTimeout(updateTimeoutRef.current);
        }
        updateMaxValue(currentValue);
        // Ensure final value is sent
        setTimeout(() => {
          onValueChange(currentMinValue.current, currentMaxValue.current);
        }, 100);
      },
    }),
  ).current;

  // Calculate active track dimensions (memoized for performance)
  const activeTrackDimensions = useMemo(() => {
    return {
      width: Math.max(0, maxPosition - minPosition),
      left: minPosition,
    };
  }, [minPosition, maxPosition]);

  // Generate markers (memoized for performance)
  const markers = useMemo(() => {
    const markerCount = 10;
    return Array.from({length: markerCount + 1}, (_, i) => {
      return (i / markerCount) * sliderWidth;
    });
  }, [sliderWidth]);

  return (
    <View style={styles.container}>
      {/* Value Display */}
      <View style={styles.valueContainer}>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>Min</Text>
          <Text style={styles.valueText}>
            {formatValue ? formatValue(displayMinValue) : displayMinValue.toString()}
          </Text>
        </View>
        <View style={styles.valueBox}>
          <Text style={styles.valueLabel}>Max</Text>
          <Text style={styles.valueText}>
            {formatValue ? formatValue(displayMaxValue) : displayMaxValue.toString()}
          </Text>
        </View>
      </View>

      {/* Slider Track Container */}
      <View style={styles.sliderContainer}>
        {/* Markers Above */}
        {showMarkers && (
          <View style={styles.markersContainer}>
            {markers.map((position, index) => (
              <View
                key={`marker-${index}`}
                style={[
                  styles.marker,
                  {
                    left: position - 1,
                    height: index % 5 === 0 ? 8 : 4,
                  },
                ]}
              />
            ))}
          </View>
        )}

        {/* Track Background */}
        <View style={styles.trackBackground}>
          {/* Active Track with Gradient */}
          {activeTrackDimensions.width > 0 && (
            <View
              style={[
                styles.activeTrack,
                {
                  width: activeTrackDimensions.width,
                  left: activeTrackDimensions.left,
                },
              ]}>
              <LinearGradient
                colors={gradientColors}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
                style={styles.gradientTrack}
              />
            </View>
          )}

          {/* Min Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              styles.minThumb,
              activeThumb === 'min' && styles.thumbActive,
              {
                left: minThumbAnimated,
                transform: [{translateX: -12}],
              },
            ]}
            {...panResponderMin.panHandlers}>
            <View style={styles.thumbInner} />
          </Animated.View>

          {/* Max Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              styles.maxThumb,
              activeThumb === 'max' && styles.thumbActive,
              {
                left: maxThumbAnimated,
                transform: [{translateX: -12}],
              },
            ]}
            {...panResponderMax.panHandlers}>
            <View style={styles.thumbInner} />
          </Animated.View>
        </View>

        {/* Markers Below */}
        {showMarkers && (
          <View style={[styles.markersContainer, styles.markersBelow]}>
            {markers.map((position, index) => (
              <View
                key={`marker-below-${index}`}
                style={[
                  styles.marker,
                  styles.markerDot,
                  {
                    left: position - 2,
                  },
                ]}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  valueContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  valueBox: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderLight,
    shadowColor: colors.secondary,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  valueLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  valueText: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },
  sliderContainer: {
    height: 60,
    justifyContent: 'center',
    position: 'relative',
  },
  markersContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 12,
    flexDirection: 'row',
  },
  markersBelow: {
    top: 'auto',
    bottom: 0,
  },
  marker: {
    position: 'absolute',
    width: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
  },
  markerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textSecondary,
    opacity: 0.4,
  },
  trackBackground: {
    height: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: 4,
    position: 'relative',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: colors.secondary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  activeTrack: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradientTrack: {
    flex: 1,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.secondary,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 1)',
  },
  thumbActive: {
    transform: [{scale: 1.2}],
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowColor: colors.primary,
  },
  minThumb: {
    borderColor: colors.accent,
  },
  maxThumb: {
    borderColor: colors.primary,
  },
  thumbInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});

export default RangeSlider;
