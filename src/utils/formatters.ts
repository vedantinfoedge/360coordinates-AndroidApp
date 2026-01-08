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
  
  // Format price (₹X Lakh/Crore)
  price: (price: number, isRent: boolean = false): string => {
    if (price >= 10000000) {
      return `₹${(price / 10000000).toFixed(1)} Cr${isRent ? '/month' : ''}`;
    } else if (price >= 100000) {
      return `₹${(price / 100000).toFixed(1)} Lakh${isRent ? '/month' : ''}`;
    } else if (price >= 1000) {
      return `₹${(price / 1000).toFixed(1)}K${isRent ? '/month' : ''}`;
    }
    return `₹${price.toLocaleString('en-IN')}${isRent ? '/month' : ''}`;
  },
  
  // Format number (K format for thousands)
  formatNumber: (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  },
  
  // Get time ago (e.g., "2h ago", "3d ago")
  timeAgo: (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 60) {
        return `${diffMins}m ago`;
      } else if (diffHours < 24) {
        return `${diffHours}h ago`;
      } else if (diffDays < 7) {
        return `${diffDays}d ago`;
      } else {
        return date.toLocaleDateString('en-IN', {day: 'numeric', month: 'short'});
      }
    } catch (error) {
      return '';
    }
  },
  
  // Calculate days remaining from end date
  daysRemaining: (endDateString: string): number => {
    try {
      const endDate = new Date(endDateString);
      const now = new Date();
      const diffMs = endDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / 86400000);
      return Math.max(0, diffDays);
    } catch (error) {
      return 0;
    }
  },
};

