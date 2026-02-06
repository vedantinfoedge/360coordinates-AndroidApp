import React, {createContext, useState, useCallback, useContext} from 'react';

export interface BuilderArcFABContextValue {
  isMenuOpen: boolean;
  openMenu: (fabCenter?: {x: number; y: number}) => void;
  closeMenu: () => void;
  fabCenter: {x: number; y: number};
}

const BuilderArcFABContext = createContext<BuilderArcFABContextValue | undefined>(undefined);

export function BuilderArcFABProvider({children}: {children: React.ReactNode}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fabCenter, setFabCenter] = useState({x: 0, y: 0});

  const openMenu = useCallback((center?: {x: number; y: number}) => {
    if (center) setFabCenter(center);
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const value: BuilderArcFABContextValue = {
    isMenuOpen,
    openMenu,
    closeMenu,
    fabCenter,
  };

  return (
    <BuilderArcFABContext.Provider value={value}>
      {children}
    </BuilderArcFABContext.Provider>
  );
}

export function useBuilderArcFAB(): BuilderArcFABContextValue {
  const ctx = useContext(BuilderArcFABContext);
  if (ctx === undefined) {
    throw new Error('useBuilderArcFAB must be used within BuilderArcFABProvider');
  }
  return ctx;
}
