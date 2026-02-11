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
 * Website behavior: filters (e.g. budget/min_price/max_price) should apply to both calls.
 */
export function buildPGHostelFetchParams(options: {
  page?: number;
  limit?: number;
  location?: string;
  city?: string;
  min_price?: string | number;
  max_price?: string | number;
  budget?: string;
  sort_by?: string;
}): PGHostelFetchParams {
  const { page = 1, limit = 50, location, city, min_price, max_price, budget, sort_by } = options;

  const common: Record<string, string | number> = {
    page,
    limit,
    status: 'rent',
  };
  if (location && location.trim()) common.location = location.trim();
  if (city && city.trim()) common.city = city.trim();
  if (min_price !== undefined && min_price !== null && String(min_price) !== '') common.min_price = min_price;
  if (max_price !== undefined && max_price !== null && String(max_price) !== '') common.max_price = max_price;
  if (budget && budget.trim()) common.budget = budget.trim();
  if (sort_by && sort_by.trim()) common.sort_by = sort_by.trim();

  return {
    pgParams: { ...common, property_type: PG_HOSTEL_PROPERTY_TYPE },
    bachelorsParams: { ...common, available_for_bachelors: '1' },
  };
}
