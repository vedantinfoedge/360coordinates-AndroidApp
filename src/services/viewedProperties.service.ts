/**
 * Viewed Properties Service
 * 
 * Manages the history of properties where users have clicked
 * "Chat with Owner" or "Show Owner Details"
 * 
 * Single credit consumption: If user uses either action, both become available
 * for that property without additional credit cost.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const VIEWED_PROPERTIES_KEY = 'viewed_properties_history';
const PROPERTY_UNLOCKED_PREFIX = 'property_unlocked_';

// Maximum number of properties to store in history
const MAX_HISTORY_SIZE = 50;

export interface ViewedProperty {
  propertyId: string | number;
  propertyTitle: string;
  propertyLocation?: string;
  propertyPrice?: string;
  ownerName: string;
  ownerPhone?: string;
  ownerEmail?: string;
  viewedAt: string; // ISO date string
  action: 'chat' | 'contact' | 'both'; // Which action was used first
}

/**
 * Check if a property has been unlocked (either chat or contact viewed)
 */
export const isPropertyUnlocked = async (propertyId: string | number): Promise<boolean> => {
  try {
    const key = `${PROPERTY_UNLOCKED_PREFIX}${propertyId}`;
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch (error) {
    console.error('[ViewedProperties] Error checking unlock status:', error);
    return false;
  }
};

/**
 * Mark a property as unlocked (used when user spends a credit)
 */
export const markPropertyUnlocked = async (propertyId: string | number): Promise<void> => {
  try {
    const key = `${PROPERTY_UNLOCKED_PREFIX}${propertyId}`;
    await AsyncStorage.setItem(key, 'true');
  } catch (error) {
    console.error('[ViewedProperties] Error marking property as unlocked:', error);
  }
};

/**
 * Add a property to the viewed history
 */
export const addViewedProperty = async (property: ViewedProperty): Promise<void> => {
  try {
    const history = await getViewedProperties();
    
    // Check if property already exists in history
    const existingIndex = history.findIndex(
      p => String(p.propertyId) === String(property.propertyId)
    );
    
    if (existingIndex !== -1) {
      // Update existing entry with new timestamp and potentially updated info
      history[existingIndex] = {
        ...history[existingIndex],
        ...property,
        viewedAt: new Date().toISOString(),
        action: history[existingIndex].action === property.action 
          ? property.action 
          : 'both',
      };
    } else {
      // Add new entry at the beginning
      history.unshift({
        ...property,
        viewedAt: new Date().toISOString(),
      });
    }
    
    // Limit history size
    const trimmedHistory = history.slice(0, MAX_HISTORY_SIZE);
    
    await AsyncStorage.setItem(VIEWED_PROPERTIES_KEY, JSON.stringify(trimmedHistory));
    console.log('[ViewedProperties] Added property to history:', property.propertyId);
  } catch (error) {
    console.error('[ViewedProperties] Error adding property to history:', error);
  }
};

/**
 * Get all viewed properties history
 */
export const getViewedProperties = async (): Promise<ViewedProperty[]> => {
  try {
    const stored = await AsyncStorage.getItem(VIEWED_PROPERTIES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Sort by viewedAt date (most recent first)
      return parsed.sort((a: ViewedProperty, b: ViewedProperty) => 
        new Date(b.viewedAt).getTime() - new Date(a.viewedAt).getTime()
      );
    }
    return [];
  } catch (error) {
    console.error('[ViewedProperties] Error getting viewed properties:', error);
    return [];
  }
};

/**
 * Remove a property from history
 */
export const removeViewedProperty = async (propertyId: string | number): Promise<void> => {
  try {
    const history = await getViewedProperties();
    const filtered = history.filter(
      p => String(p.propertyId) !== String(propertyId)
    );
    await AsyncStorage.setItem(VIEWED_PROPERTIES_KEY, JSON.stringify(filtered));
    console.log('[ViewedProperties] Removed property from history:', propertyId);
  } catch (error) {
    console.error('[ViewedProperties] Error removing property from history:', error);
  }
};

/**
 * Clear all viewed properties history
 */
export const clearViewedProperties = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(VIEWED_PROPERTIES_KEY);
    // Note: This doesn't clear individual property unlock flags
    // Those should persist so user doesn't get charged again
    console.log('[ViewedProperties] Cleared viewed properties history');
  } catch (error) {
    console.error('[ViewedProperties] Error clearing viewed properties:', error);
  }
};

/**
 * Get the count of viewed properties
 */
export const getViewedPropertiesCount = async (): Promise<number> => {
  try {
    const history = await getViewedProperties();
    return history.length;
  } catch (error) {
    console.error('[ViewedProperties] Error getting count:', error);
    return 0;
  }
};

export const viewedPropertiesService = {
  isPropertyUnlocked,
  markPropertyUnlocked,
  addViewedProperty,
  getViewedProperties,
  removeViewedProperty,
  clearViewedProperties,
  getViewedPropertiesCount,
};

export default viewedPropertiesService;
