/**
 * Centralized Feature Visibility Configuration for Asset Bridge.
 * 
 * Round 3 Simplification:
 * The interface is streamlined to focus on the core financial discovery,
 * identity verification, nominee gap alerts, and legal succession journey.
 * 
 * The following modules are temporarily archived from visible navigation:
 * 1. Life Plan (/app/plan)
 * 2. Forecast & Analysis (/app/forecast)
 * 3. Investment Options (/app/invest)
 * 
 * All underlying components, routes, calculations, and backend endpoints
 * remain 100% intact and can be easily restored by toggling these flags.
 */

export interface FeatureFlags {
  /** Core Identity Verification (/app/verify) */
  verify: boolean;
  /** Multi-regulator Asset Aggregation (/app/aggregate) */
  aggregate: boolean;
  /** Real-time Nominee Gap Alerts (/app/alerts) */
  alerts: boolean;
  /** Legal Heirs Registration (/app/heirs) */
  heirs: boolean;
  /** Statutory Reunite & CRS Event Simulation (/app/reunite) */
  reunite: boolean;
  /** Succession Claims & Case Transfer (/app/cases) */
  cases: boolean;
  /** AI Legal Succession Assistant (/app/guide) */
  guide: boolean;

  // --- Temporarily Archived Sections (Round 3) ---
  /** Life Plan milestone & retirement timeline (/app/plan) */
  lifePlan: boolean;
  /** Stochastic Monte Carlo forecast & allocation analysis (/app/forecast) */
  forecast: boolean;
  /** Indian investment products & tax optimization catalog (/app/invest) */
  invest: boolean;
}

export const FEATURES: FeatureFlags = {
  // Active Core Navigation
  verify: true,
  aggregate: true,
  alerts: true,
  heirs: true,
  reunite: true,
  cases: true,
  guide: true,

  // Temporarily Archived from Visible Navigation
  lifePlan: false,
  forecast: false,
  invest: false,
};

/**
 * Route-to-feature mapping for navigation filtering.
 */
export const ROUTE_FEATURE_MAP: Record<string, keyof FeatureFlags> = {
  '/app/verify': 'verify',
  '/app/aggregate': 'aggregate',
  '/app/alerts': 'alerts',
  '/app/heirs': 'heirs',
  '/app/reunite': 'reunite',
  '/app/cases': 'cases',
  '/app/guide': 'guide',
  '/app/plan': 'lifePlan',
  '/app/forecast': 'forecast',
  '/app/invest': 'invest',
};

/**
 * Check if a route should be visible in navigation menus.
 * Unmapped routes (like /app dashboard or /app/avatar) default to true.
 */
export function isRouteVisible(route: string): boolean {
  const featureKey = ROUTE_FEATURE_MAP[route];
  if (!featureKey) return true;
  return !!FEATURES[featureKey];
}
