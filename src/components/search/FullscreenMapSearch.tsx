import React from 'react';
import {View, StyleSheet} from 'react-native';
import CompactSearchBar, {
  CompactSearchBarProps,
  CompactSearchBarSearchParams,
} from './CompactSearchBar';

/**
 * Fullscreen map search: shows the full CompactSearchBar (location, listing type,
 * property type, budget, bedrooms/area) in a compact layout above the map.
 * Used when the map is in fullscreen mode so users can search without leaving the map.
 */
export type FullscreenMapSearchProps = CompactSearchBarProps;

const FullscreenMapSearch: React.FC<FullscreenMapSearchProps> = props => {
  return (
    <View style={styles.mapFullscreenCompactSearch}>
      <CompactSearchBar {...props} compact={true} />
    </View>
  );
};

export type {CompactSearchBarSearchParams};

const styles = StyleSheet.create({
  mapFullscreenCompactSearch: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    paddingTop: 30,
  },
});

export default FullscreenMapSearch;
