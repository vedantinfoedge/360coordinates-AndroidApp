/**
 * Shared property search params builder.
 * Ensures PG/Hostel filter logic matches between Buyer Home (AllProperties) and Search Results.
 * Backend list.php: property_type 'PG / Hostel', available_for_bachelors '1'.
 */

/** Backend expects exact 'PG / Hostel' for property_type LIKE match */
export const PG_HOSTEL_PROPERTY_TYPE = 'PG / Hostel';

export interface PGHostelFetchParams {
  /** Params for call 1: property_type = PG / Hostel */
  pgParams: Record<string, string | number>;
  /** Params for call 2: available_for_bachelors = 1 (NO property_type - gets bachelor apartments) */
  bachelorsParams: Record<string, string | number>;
}

/**
 * Build params for PG/Hostel two-call merge strategy.
 * Matches AllPropertiesScreen logic: two separate calls, then merge by id.
 * Do NOT add bedrooms, min_price, max_price, budget - these block PG results.
 */
export function buildPGHostelFetchParams(options: {
  page?: number;
  limit?: number;
  location?: string;
  city?: string;
}): PGHostelFetchParams {
  const { page = 1, limit = 50, location, city } = options;

  const common: Record<string, string | number> = {
    page,
    limit,
    status: 'rent',
  };
  if (location && location.trim()) common.location = location.trim();
  if (city && city.trim()) common.city = city.trim();

  return {
    pgParams: { ...common, property_type: PG_HOSTEL_PROPERTY_TYPE },
    bachelorsParams: { ...common, available_for_bachelors: '1' },
  };
}
