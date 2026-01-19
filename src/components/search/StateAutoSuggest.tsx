import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {MAPBOX_ACCESS_TOKEN} from '../../config/mapbox.config';
import {colors, spacing, typography} from '../../theme';

interface StateSuggestion {
  id: string;
  name: string;
  placeName: string;
  coordinates?: [number, number];
}

interface StateAutoSuggestProps {
  query: string;
  onSelect: (state: StateSuggestion) => void;
  visible?: boolean;
  debounceMs?: number;
}

const StateAutoSuggest: React.FC<StateAutoSuggestProps> = ({
  query,
  onSelect,
  visible = true,
  debounceMs = 300,
}) => {
  const [suggestions, setSuggestions] = useState<StateSuggestion[]>([]);
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
      searchStates(query);
    }, debounceMs);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query]);

  const searchStates = async (searchQuery: string) => {
    try {
      setLoading(true);
      
      const encodedQuery = encodeURIComponent(searchQuery);
      // Filter by types=region to get states/regions only
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_ACCESS_TOKEN}&country=in&types=region&limit=30&autocomplete=true`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.features && Array.isArray(data.features)) {
        const formattedSuggestions: StateSuggestion[] = data.features.map(
          (feature: any, index: number) => ({
            id: feature.id || `state-${index}`,
            name: feature.text || feature.place_name,
            placeName: feature.place_name,
            coordinates: feature.center ? [feature.center[0], feature.center[1]] : undefined,
          }),
        );
        setSuggestions(formattedSuggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error('State autocomplete error:', error);
      setSuggestions([]);
      // Fallback to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (state: StateSuggestion) => {
    onSelect(state);
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
        <ScrollView
          style={styles.list}
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}>
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.id}
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
          ))}
        </ScrollView>
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

export default StateAutoSuggest;

