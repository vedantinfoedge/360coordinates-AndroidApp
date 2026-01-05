export const formatters = {
  currency: (amount: number): string => {
    return `₹${amount.toLocaleString('en-IN')}`;
  },
  date: (date: Date): string => {
    return date.toLocaleDateString('en-IN');
  },
  number: (num: number): string => {
    return num.toLocaleString('en-IN');
  },
};

