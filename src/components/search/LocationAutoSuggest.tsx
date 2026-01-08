import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import {MAPBOX_ACCESS_TOKEN} from '../../config/mapbox.config';
import {colors, spacing, typography} from '../../theme';

interface LocationSuggestion {
  id: string;
  name: string;
  placeName: string;
  coordinates?: [number, number];
  context?: any[];
}

interface LocationAutoSuggestProps {
  query: string;
  onSelect: (location: LocationSuggestion) => void;
  visible?: boolean;
  debounceMs?: number;
}

const LocationAutoSuggest: React.FC<LocationAutoSuggestProps> = ({
  query,
  onSelect,
  visible = true,
  debounceMs = 300,
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Don't search if query is too short
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Debounce API calls
    debounceTimer.current = setTimeout(() => {
      searchLocations(query);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const searchLocations = async (searchQuery: string) => {
    try {
      setLoading(true);
      
      const encodedQuery = encodeURIComponent(searchQuery);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=in&limit=30&autocomplete=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && Array.isArray(data.features)) {
        const formattedSuggestions: LocationSuggestion[] = data.features.map(
          (feature: any, index: number) => ({
            id: feature.id || `location-${index}`,
            name: feature.text || feature.place_name,
            placeName: feature.place_name,
            coordinates: feature.center ? [feature.center[0], feature.center[1]] : undefined,
            context: feature.context || [],
          }),
        );
        setSuggestions(formattedSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('Location autocomplete error:', error);
      setSuggestions([]);
      // Fallback to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (location: LocationSuggestion) => {
    onSelect(location);
    setSuggestions([]); // Clear suggestions after selection
  };

  if (!visible || (!query || query.length < 2)) {
    return null;
  }

  if (suggestions.length === 0 && !loading) {
    return null;
  }

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : (
        <FlatList
          data={suggestions}
          keyExtractor={item => item.id}
          renderItem={({item}) => (
            <TouchableOpacity
              style={styles.suggestion}
              onPress={() => handleSelect(item)}>
              <Text style={styles.suggestionText} numberOfLines={1}>
                {item.name}
              </Text>
              {item.placeName !== item.name && (
                <Text style={styles.suggestionSubtext} numberOfLines={1}>
                  {item.placeName}
                </Text>
              )}
            </TouchableOpacity>
          )}
          style={styles.list}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  list: {
    maxHeight: 300,
  },
  suggestion: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  suggestionSubtext: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});

export default LocationAutoSuggest;

