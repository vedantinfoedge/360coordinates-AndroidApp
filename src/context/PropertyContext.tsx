import React, {createContext, useState, ReactNode} from 'react';

interface PropertyContextType {
  properties: any[];
  setProperties: (properties: any[]) => void;
}

export const PropertyContext = createContext<PropertyContextType | undefined>(
  undefined,
);

export const PropertyProvider: React.FC<{children: ReactNode}> = ({children}) => {
  const [properties, setProperties] = useState<any[]>([]);

  return (
    <PropertyContext.Provider value={{properties, setProperties}}>
      {children}
    </PropertyContext.Provider>
  );
};

