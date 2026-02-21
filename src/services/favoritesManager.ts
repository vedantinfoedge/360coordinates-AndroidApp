/**
 * FavoritesManager - Local cache for favorite property IDs (mirrors website's localStorage.propertyFavorites)
 *
 * Website flow:
 * - localStorage.propertyFavorites – array of property IDs
 * - Used for: quick UI state before API call, fallback if API fails, faster perceived updates
 *
 * Typical sequence:
 * - On load → show from FavoritesManager.isFavorite(propertyId)
 * - If logged in → call favoritesAPI.list() and use its result (sync cache)
 * - On heart click → call favoritesAPI.toggle(propertyId)
 * - On success → update state and localStorage
 * - On API error → fallback to local toggle and localStorage
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_CACHE_KEY = '@propertyFavorites';

/**
 * Get cached favorite property IDs from AsyncStorage
 */
export async function getCachedFavoriteIds(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(FAVORITES_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((id: any) => Number(id)).filter((n: number) => !isNaN(n));
  } catch {
    return [];
  }
}

/**
 * Set cached favorite property IDs (overwrites)
 */
export async function setCachedFavoriteIds(ids: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn('[FavoritesManager] Failed to save cache:', e);
  }
}

/**
 * Check if a property is in the local favorites cache
 */
export async function isFavorite(propertyId: string | number): Promise<boolean> {
  const ids = await getCachedFavoriteIds();
  return ids.includes(Number(propertyId));
}

/**
 * Add property to local cache (without API call)
 */
export async function addToCache(propertyId: string | number): Promise<void> {
  const id = Number(propertyId);
  if (isNaN(id)) return;
  const ids = await getCachedFavoriteIds();
  if (!ids.includes(id)) {
    ids.push(id);
    await setCachedFavoriteIds(ids);
  }
}

/**
 * Remove property from local cache (without API call)
 */
export async function removeFromCache(propertyId: string | number): Promise<void> {
  const id = Number(propertyId);
  if (isNaN(id)) return;
  const ids = await getCachedFavoriteIds();
  const filtered = ids.filter((i) => i !== id);
  if (filtered.length !== ids.length) {
    await setCachedFavoriteIds(filtered);
  }
}

/**
 * Toggle property in local cache (without API call) - returns new state
 */
export async function toggleInCache(propertyId: string | number): Promise<boolean> {
  const id = Number(propertyId);
  if (isNaN(id)) return false;
  const ids = await getCachedFavoriteIds();
  const idx = ids.indexOf(id);
  if (idx >= 0) {
    ids.splice(idx, 1);
    await setCachedFavoriteIds(ids);
    return false;
  } else {
    ids.push(id);
    await setCachedFavoriteIds(ids);
    return true;
  }
}

/**
 * Sync cache from API favorites list (call after getFavorites or on login)
 */
export async function syncCacheFromApi(propertyIds: (string | number)[]): Promise<void> {
  const ids = propertyIds.map((id) => Number(id)).filter((n) => !isNaN(n));
  await setCachedFavoriteIds(ids);
}
