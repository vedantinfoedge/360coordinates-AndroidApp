export type BudgetUnits = 'lakhs' | 'thousands';
export type BudgetRangeKey =
  | 'sale-residential'
  | 'rent-residential'
  | 'commercial-sale'
  | 'commercial-rent';

export interface BudgetRangeOption {
  label: string;
  min: number;
  max: number | null;
}

interface BudgetContext {
  key: BudgetRangeKey;
  units: BudgetUnits;
}

const SALE_RESIDENTIAL: BudgetRangeOption[] = [
  {label: '0-25L', min: 0, max: 25},
  {label: '25L-50L', min: 25, max: 50},
  {label: '50L-75L', min: 50, max: 75},
  {label: '75L-1Cr', min: 75, max: 100},
  {label: '1Cr-2Cr', min: 100, max: 200},
  {label: '2Cr-5Cr', min: 200, max: 500},
  {label: '5Cr+', min: 500, max: null},
];

const RENT_RESIDENTIAL: BudgetRangeOption[] = [
  {label: '0K-5K', min: 0, max: 5},
  {label: '5K-10K', min: 5, max: 10},
  {label: '10K-20K', min: 10, max: 20},
  {label: '20K-30K', min: 20, max: 30},
  {label: '30K-50K', min: 30, max: 50},
  {label: '50K-75K', min: 50, max: 75},
  {label: '75K-1L', min: 75, max: 100},
  {label: '1L-2L', min: 100, max: 200},
  {label: '2L+', min: 200, max: null},
];

const COMMERCIAL_SALE: BudgetRangeOption[] = [
  {label: '0-50L', min: 0, max: 50},
  {label: '50L-1Cr', min: 50, max: 100},
  {label: '1Cr-2Cr', min: 100, max: 200},
  {label: '2Cr-5Cr', min: 200, max: 500},
  {label: '5Cr-10Cr', min: 500, max: 1000},
  {label: '10Cr-25Cr', min: 1000, max: 2500},
  {label: '25Cr+', min: 2500, max: null},
];

const COMMERCIAL_RENT: BudgetRangeOption[] = [
  {label: '0-10K', min: 0, max: 10},
  {label: '10K-25K', min: 10, max: 25},
  {label: '25K-50K', min: 25, max: 50},
  {label: '50K-1L', min: 50, max: 100},
  {label: '1L-2L', min: 100, max: 200},
  {label: '2L-5L', min: 200, max: 500},
  {label: '5L+', min: 500, max: null},
];

const BUY_RENT_STYLE_TYPES = new Set(['pg / hostel', 'co-working space', 'warehouse / godown']);
const COMMERCIAL_SALE_TYPES = new Set([
  'plot / land',
  'plot / land / industrial property',
  'industrial property',
  'commercial office',
  'commercial shop',
  'retail space',
]);
const COMMERCIAL_RENT_TYPES = new Set(['co-working space', 'warehouse / godown']);

const normalizePropertyType = (propertyType?: string): string => {
  return (propertyType || '').trim().toLowerCase();
};

const getBudgetContext = (
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel',
  propertyType?: string,
): BudgetContext => {
  const normalizedType = normalizePropertyType(propertyType);

  if (listingType === 'rent' || listingType === 'pg-hostel') {
    if (COMMERCIAL_SALE_TYPES.has(normalizedType) || COMMERCIAL_RENT_TYPES.has(normalizedType)) {
      return {key: 'commercial-rent', units: 'thousands'};
    }
    return {key: 'rent-residential', units: 'thousands'};
  }

  if (COMMERCIAL_RENT_TYPES.has(normalizedType) || BUY_RENT_STYLE_TYPES.has(normalizedType)) {
    return {key: 'commercial-rent', units: 'thousands'};
  }

  if (COMMERCIAL_SALE_TYPES.has(normalizedType)) {
    return {key: 'commercial-sale', units: 'lakhs'};
  }

  return {key: 'sale-residential', units: 'lakhs'};
};

const getRangeSetByKey = (key: BudgetRangeKey): BudgetRangeOption[] => {
  switch (key) {
    case 'sale-residential':
      return SALE_RESIDENTIAL;
    case 'rent-residential':
      return RENT_RESIDENTIAL;
    case 'commercial-sale':
      return COMMERCIAL_SALE;
    case 'commercial-rent':
      return COMMERCIAL_RENT;
    default:
      return SALE_RESIDENTIAL;
  }
};

export const getBudgetUnitsForSelection = (
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel',
  propertyType?: string,
): BudgetUnits => {
  return getBudgetContext(listingType, propertyType).units;
};

export const getBudgetRangesForSelection = ({
  listingType,
  propertyType,
  excludeLowestRentOption = false,
}: {
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel';
  propertyType?: string;
  excludeLowestRentOption?: boolean;
}): BudgetRangeOption[] => {
  const context = getBudgetContext(listingType, propertyType);
  const ranges = getRangeSetByKey(context.key);

  if (
    excludeLowestRentOption &&
    (context.key === 'rent-residential' || context.key === 'commercial-rent')
  ) {
    return ranges.slice(1);
  }

  return ranges;
};

export const getMaxBudgetForSelection = ({
  listingType,
  propertyType,
}: {
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel';
  propertyType?: string;
}): number => {
  const ranges = getBudgetRangesForSelection({listingType, propertyType});
  const lastRange = ranges[ranges.length - 1];
  return lastRange.max ?? lastRange.min;
};

export const findBudgetLabelForRange = ({
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
}): string => {
  const ranges = getBudgetRangesForSelection({
    listingType,
    propertyType,
    excludeLowestRentOption,
  });

  const match = ranges.find(range => {
    const upper = range.max ?? max;
    return range.min === min && upper === max;
  });

  return match?.label || '';
};

export const findBudgetRangeByLabel = ({
  listingType,
  propertyType,
  label,
  excludeLowestRentOption = false,
}: {
  listingType: 'all' | 'buy' | 'rent' | 'pg-hostel';
  propertyType?: string;
  label: string;
  excludeLowestRentOption?: boolean;
}): BudgetRangeOption | null => {
  const ranges = getBudgetRangesForSelection({
    listingType,
    propertyType,
    excludeLowestRentOption,
  });

  const normalizedLabel = label.trim().toLowerCase();
  return (
    ranges.find(range => range.label.trim().toLowerCase() === normalizedLabel) ||
    null
  );
};
