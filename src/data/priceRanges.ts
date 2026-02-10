/**
 * Price (budget) ranges by property type and listing type.
 * Matches backend list.php budget map keys. See price-range-by-property-and-listing-type.md.
 */

export type BudgetSetType =
  | 'sale_residential'
  | 'rent_residential'
  | 'commercial_sale'
  | 'commercial_rent';

/** One budget option: label (backend key), min/max in units (Lakhs for sale, thousands/month for rent). */
export interface BudgetOption {
  label: string;
  min: number;
  max: number;
}

/** Unit: 'lakhs' (sale) or 'thousands' (rent/month). */
export type BudgetUnit = 'lakhs' | 'thousands';

export interface BudgetSet {
  type: BudgetSetType;
  unit: BudgetUnit;
  /** Max value for this set (e.g. 500 = 5Cr for sale residential, 200 = 2L for rent residential). */
  maxSlider: number;
  options: BudgetOption[];
  /** On "Rent page", first option (0K-5K or 0-10K) is excluded from dropdown. */
  rentPageExcludeFirst?: boolean;
}

// --- Rent residential (₹/month). In thousands (5 = 5K, 200 = 2L).
const RENT_RESIDENTIAL_OPTIONS: BudgetOption[] = [
  { label: '0K-5K', min: 0, max: 5 },
  { label: '5K-10K', min: 5, max: 10 },
  { label: '10K-20K', min: 10, max: 20 },
  { label: '20K-30K', min: 20, max: 30 },
  { label: '30K-50K', min: 30, max: 50 },
  { label: '50K-75K', min: 50, max: 75 },
  { label: '75K-1L', min: 75, max: 100 },
  { label: '1L-2L', min: 100, max: 200 },
  { label: '2L+', min: 200, max: 200 },
];

// --- Sale residential (₹). In Lakhs (25 = 25L, 500 = 5Cr).
const SALE_RESIDENTIAL_OPTIONS: BudgetOption[] = [
  { label: '0-25L', min: 0, max: 25 },
  { label: '25L-50L', min: 25, max: 50 },
  { label: '50L-75L', min: 50, max: 75 },
  { label: '75L-1Cr', min: 75, max: 100 },
  { label: '1Cr-2Cr', min: 100, max: 200 },
  { label: '2Cr-5Cr', min: 200, max: 500 },
  { label: '5Cr+', min: 500, max: 500 },
];

// --- Commercial sale (₹). In Lakhs.
const COMMERCIAL_SALE_OPTIONS: BudgetOption[] = [
  { label: '0-50L', min: 0, max: 50 },
  { label: '50L-1Cr', min: 50, max: 100 },
  { label: '1Cr-2Cr', min: 100, max: 200 },
  { label: '2Cr-5Cr', min: 200, max: 500 },
  { label: '5Cr-10Cr', min: 500, max: 1000 },
  { label: '10Cr-25Cr', min: 1000, max: 2500 },
  { label: '25Cr+', min: 2500, max: 2500 },
];

// --- Commercial rent (₹/month). In thousands.
const COMMERCIAL_RENT_OPTIONS: BudgetOption[] = [
  { label: '0-10K', min: 0, max: 10 },
  { label: '10K-25K', min: 10, max: 25 },
  { label: '25K-50K', min: 25, max: 50 },
  { label: '50K-1L', min: 50, max: 100 },
  { label: '1L-2L', min: 100, max: 200 },
  { label: '2L-5L', min: 200, max: 500 },
  { label: '5L+', min: 500, max: 500 },
];

export const BUDGET_SETS: Record<BudgetSetType, BudgetSet> = {
  rent_residential: {
    type: 'rent_residential',
    unit: 'thousands',
    maxSlider: 200,
    options: RENT_RESIDENTIAL_OPTIONS,
    rentPageExcludeFirst: true, // Rent page: no "0K-5K"
  },
  sale_residential: {
    type: 'sale_residential',
    unit: 'lakhs',
    maxSlider: 500,
    options: SALE_RESIDENTIAL_OPTIONS,
  },
  commercial_sale: {
    type: 'commercial_sale',
    unit: 'lakhs',
    maxSlider: 2500,
    options: COMMERCIAL_SALE_OPTIONS,
  },
  commercial_rent: {
    type: 'commercial_rent',
    unit: 'thousands',
    maxSlider: 500,
    options: COMMERCIAL_RENT_OPTIONS,
    rentPageExcludeFirst: true, // Rent page: no "0-10K"
  },
};

/** Residential property type labels (Buy uses sale_residential; Rent uses rent_residential). */
const RESIDENTIAL_LABELS = [
  'Apartment',
  'Studio Apartment',
  'Villa',
  'Row House',
  'Independent House',
  'Bungalow',
  'Farm House',
  'Penthouse',
];

/** PG/Hostel uses rent_residential even on Buy. */
const PG_HOSTEL_LABEL = 'PG / Hostel';

/** Buy: commercial sale property types. */
const COMMERCIAL_SALE_LABELS = [
  'Plot / Land',
  'Industrial Property',
  'Commercial Office',
  'Commercial Shop',
];

/** Buy: commercial rent property types (Co-working, Warehouse). */
const COMMERCIAL_RENT_LABELS = ['Co-working Space', 'Warehouse / Godown'];

/** Rent: all commercial/land use commercial_rent. */
const COMMERCIAL_OR_LAND_LABELS = [
  'Plot / Land',
  'Industrial Property',
  'Commercial Office',
  'Commercial Shop',
  'Co-working Space',
  'Warehouse / Godown',
];

function matchesAny(label: string, list: string[]): boolean {
  if (!label) return false;
  return list.some((t) => label.includes(t) || t.includes(label));
}

/**
 * Get the budget set to use for the given listing type and property type.
 * When property type is "all", defaults: Buy → sale_residential, Rent/PG → rent_residential.
 */
export function getBudgetSetFor(
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel',
  propertyTypeLabel: string,
): BudgetSetType {
  const listType = listingType === 'all' ? 'buy' : listingType;
  const prop = (propertyTypeLabel || '').trim();

  if (listType === 'rent' || listType === 'pg-hostel') {
    if (matchesAny(prop, COMMERCIAL_OR_LAND_LABELS)) return 'commercial_rent';
    return 'rent_residential';
  }

  // Buy (or All treated as Buy)
  if (prop === PG_HOSTEL_LABEL || prop.toLowerCase().includes('pg') || prop.toLowerCase().includes('hostel')) {
    return 'rent_residential';
  }
  if (matchesAny(prop, COMMERCIAL_RENT_LABELS)) return 'commercial_rent';
  if (matchesAny(prop, COMMERCIAL_SALE_LABELS)) return 'commercial_sale';
  if (matchesAny(prop, RESIDENTIAL_LABELS)) return 'sale_residential';

  // "All" or unknown: default by listing
  return listType === 'buy' ? 'sale_residential' : 'rent_residential';
}

/**
 * Get budget dropdown options for the current context.
 * When isRentPage is true (listing type is Rent), excludes first option for rent_residential and commercial_rent.
 */
export function getBudgetOptions(
  setType: BudgetSetType,
  isRentPage: boolean,
): BudgetOption[] {
  const set = BUDGET_SETS[setType];
  if (!set.options) return [];
  if (isRentPage && set.rentPageExcludeFirst) {
    return set.options.slice(1);
  }
  return set.options;
}

/**
 * Get max value for the budget set (for "Any" option and range display).
 */
export function getMaxSliderForSet(setType: BudgetSetType): number {
  return BUDGET_SETS[setType]?.maxSlider ?? 500;
}

/**
 * Get budget unit for the given context (for formatting display).
 */
export function getBudgetUnitsForSelection(
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel',
  propertyTypeLabel: string,
): BudgetUnit {
  const setType = getBudgetSetFor(listingType, propertyTypeLabel || '');
  return BUDGET_SETS[setType]?.unit ?? 'lakhs';
}

/**
 * Find budget label for a given min/max range (backward-compatible object API).
 */
export function findBudgetLabelForRange({
  listingType,
  propertyType,
  min,
  max,
  excludeLowestRentOption = false,
}: {
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel';
  propertyType?: string;
  min: number;
  max: number;
  excludeLowestRentOption?: boolean;
}): string {
  const setType = getBudgetSetFor(listingType, propertyType || '');
  const isRentPage = listingType === 'rent' || listingType === 'pg-hostel';
  const options = getBudgetOptions(setType, isRentPage);
  const match = options.find((opt) => opt.min === min && opt.max === max);
  return match?.label ?? '';
}

/**
 * Find budget option by label (backward-compatible object API).
 */
export function findBudgetRangeByLabel({
  listingType,
  propertyType,
  label,
  excludeLowestRentOption = false,
}: {
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel';
  propertyType?: string;
  label: string;
  excludeLowestRentOption?: boolean;
}): BudgetOption | null {
  const setType = getBudgetSetFor(listingType, propertyType || '');
  const isRentPage = listingType === 'rent' || listingType === 'pg-hostel';
  const options = getBudgetOptions(setType, isRentPage);
  const normalizedLabel = (label || '').trim().toLowerCase();
  return options.find((opt) => opt.label.trim().toLowerCase() === normalizedLabel) ?? null;
}
