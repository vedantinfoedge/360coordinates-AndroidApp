/**
 * DEBUG: Buyer → Seller role switch crash isolation.
 * Set to true to disable all Seller API calls and render static placeholder.
 * If crash stops → cause is in API/async or data-dependent render.
 * If crash continues → cause is in navigator or first-render (hooks/native).
 * REMOVE or set to false after identifying and fixing root cause.
 */
export const DEBUG_SELLER_CRASH = false;

/**
 * When true: SellerDashboardScreen (first Seller screen) renders only static
 * "Seller Safe Mode" and skips all API/async. Use to isolate crash to dashboard.
 * Re-enable features step-by-step (local state → API → Mapbox → Firestore).
 */
export const SELLER_DASHBOARD_SAFE_MODE = true;
