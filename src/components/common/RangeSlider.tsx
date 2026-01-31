import React, {useState, useRef, useCallback, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import {colors, spacing, borderRadius} from '../../theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const DEFAULT_SLIDER_WIDTH = SCREEN_WIDTH - spacing.lg * 4;
const THUMB_SIZE = 28;
const TRACK_HEIGHT = 6;

interface RangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  onValueChange: (min: number, max: number) => void;
  formatValue?: (value: number) => string;
  step?: number;
  showMarkers?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
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
  onDragStart,
  onDragEnd,
}) => {
  const [sliderWidth, setSliderWidth] = useState(DEFAULT_SLIDER_WIDTH);
  const [localMinValue, setLocalMinValue] = useState(minValue);
  const [localMaxValue, setLocalMaxValue] = useState(maxValue);
  const [activeThumb, setActiveThumb] = useState<'min' | 'max' | null>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startValue = useRef(0);

  // Sync with external values when not dragging
  useEffect(() => {
    if (!isDragging.current) {
      setLocalMinValue(minValue);
      setLocalMaxValue(maxValue);
    }
  }, [minValue, maxValue]);

  // Handle layout
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const {width} = event.nativeEvent.layout;
    if (width > 0) {
      setSliderWidth(width);
    }
  }, []);

  // Convert value to position
  const valueToPosition = useCallback(
    (value: number) => {
      if (max === min) return 0;
      return ((value - min) / (max - min)) * sliderWidth;
    },
    [min, max, sliderWidth],
  );

  // Positions
  const minThumbLeft = valueToPosition(localMinValue);
  const maxThumbLeft = valueToPosition(localMaxValue);
  const activeTrackLeft = minThumbLeft;
  const activeTrackWidth = maxThumbLeft - minThumbLeft;

  // Min thumb pan responder
  const minPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          isDragging.current = true;
          setActiveThumb('min');
          startX.current = evt.nativeEvent.pageX;
          startValue.current = localMinValue;
          onDragStart?.();
        },
        onPanResponderMove: (evt) => {
          const dx = evt.nativeEvent.pageX - startX.current;
          const deltaValue = (dx / sliderWidth) * (max - min);
          let newValue = startValue.current + deltaValue;
          newValue = Math.round(newValue / step) * step;
          newValue = Math.max(min, Math.min(newValue, localMaxValue - step));
          setLocalMinValue(newValue);
        },
        onPanResponderRelease: () => {
          isDragging.current = false;
          setActiveThumb(null);
          onValueChange(localMinValue, localMaxValue);
          onDragEnd?.();
        },
        onPanResponderTerminate: () => {
          isDragging.current = false;
          setActiveThumb(null);
          onDragEnd?.();
        },
      }),
    [localMinValue, localMaxValue, min, max, step, sliderWidth, onValueChange, onDragStart, onDragEnd],
  );

  // Max thumb pan responder
  const maxPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          isDragging.current = true;
          setActiveThumb('max');
          startX.current = evt.nativeEvent.pageX;
          startValue.current = localMaxValue;
          onDragStart?.();
        },
        onPanResponderMove: (evt) => {
          const dx = evt.nativeEvent.pageX - startX.current;
          const deltaValue = (dx / sliderWidth) * (max - min);
          let newValue = startValue.current + deltaValue;
          newValue = Math.round(newValue / step) * step;
          newValue = Math.max(localMinValue + step, Math.min(newValue, max));
          setLocalMaxValue(newValue);
        },
        onPanResponderRelease: () => {
          isDragging.current = false;
          setActiveThumb(null);
          onValueChange(localMinValue, localMaxValue);
          onDragEnd?.();
        },
        onPanResponderTerminate: () => {
          isDragging.current = false;
          setActiveThumb(null);
          onDragEnd?.();
        },
      }),
    [localMinValue, localMaxValue, min, max, step, sliderWidth, onValueChange, onDragStart, onDragEnd],
  );

  // Format display value
  const formatDisplayValue = useCallback(
    (value: number) => {
      return formatValue ? formatValue(value) : value.toString();
    },
    [formatValue],
  );

  return (
    <View style={styles.container}>
      {/* Input Fields Row - Airbnb Style */}
      <View style={styles.inputRow}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Minimum</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputValue}>{formatDisplayValue(localMinValue)}</Text>
          </View>
        </View>
        
        <View style={styles.inputSeparator}>
          <View style={styles.separatorLine} />
        </View>
        
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Maximum</Text>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputValue}>{formatDisplayValue(localMaxValue)}</Text>
          </View>
        </View>
      </View>

      {/* Slider Track */}
      <View style={styles.sliderWrapper} onLayout={onLayout}>
        <View style={styles.trackContainer}>
          {/* Background Track */}
          <View style={styles.track} />
          
          {/* Active Track */}
          <View
            style={[
              styles.activeTrack,
              {
                left: activeTrackLeft,
                width: Math.max(0, activeTrackWidth),
              },
            ]}
          />

          {/* Min Thumb */}
          <View
            style={[
              styles.thumbTouchArea,
              {left: minThumbLeft - THUMB_SIZE},
            ]}
            {...minPanResponder.panHandlers}>
            <View style={[styles.thumb, activeThumb === 'min' && styles.thumbActive]}>
              <View style={styles.thumbLine} />
              <View style={styles.thumbLine} />
            </View>
          </View>

          {/* Max Thumb */}
          <View
            style={[
              styles.thumbTouchArea,
              {left: maxThumbLeft - THUMB_SIZE / 2},
            ]}
            {...maxPanResponder.panHandlers}>
            <View style={[styles.thumb, activeThumb === 'max' && styles.thumbActive]}>
              <View style={styles.thumbLine} />
              <View style={styles.thumbLine} />
            </View>
          </View>
        </View>
      </View>

      {/* Range Labels */}
      {showMarkers && (
        <View style={styles.rangeLabelsRow}>
          <Text style={styles.rangeLabel}>{formatDisplayValue(min)}</Text>
          <Text style={styles.rangeLabel}>{formatDisplayValue(max)}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
  },
  // Input Fields - Airbnb/Zillow Style
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputWrapper: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  inputValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  inputSeparator: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
  },
  separatorLine: {
    width: 10,
    height: 2,
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
  },
  // Slider
  sliderWrapper: {
    height: 50,
    justifyContent: 'center',
    position: 'relative',
  },
  trackContainer: {
    height: TRACK_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    backgroundColor: colors.border,
    borderRadius: TRACK_HEIGHT / 2,
  },
  activeTrack: {
    position: 'absolute',
    height: TRACK_HEIGHT,
    backgroundColor: colors.primary,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumbTouchArea: {
    position: 'absolute',
    top: -22,
    width: THUMB_SIZE * 2,
    height: THUMB_SIZE * 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    shadowColor: colors.secondary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  thumbActive: {
    borderColor: colors.primaryDark,
    backgroundColor: colors.accentLighter,
    transform: [{scale: 1.1}],
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  thumbLine: {
    width: 2,
    height: 10,
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  rangeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  rangeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
});

export default RangeSlider;
