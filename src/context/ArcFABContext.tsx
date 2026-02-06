import React, {createContext, useState, useCallback, useContext} from 'react';

export type ArcRole = 'agent' | 'builder' | 'seller';

export interface ArcFABContextValue {
  isMenuOpen: boolean;
  openMenu: (fabCenter?: { x: number; y: number }) => void;
  closeMenu: () => void;
  toggleMenu: (fabCenter?: { x: number; y: number }) => void;
  fabCenter: { x: number; y: number };
  onRoleSelect: (role: ArcRole) => void;
  setOnRoleSelect: (cb: ((role: ArcRole) => void) | null) => void;
}

const ArcFABContext = createContext<ArcFABContextValue | undefined>(undefined);

export function ArcFABProvider({children}: {children: React.ReactNode}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [fabCenter, setFabCenter] = useState({x: 0, y: 0});
  const [onRoleSelectCb, setOnRoleSelectCb] = useState<((role: ArcRole) => void) | null>(null);

  const openMenu = useCallback((center?: { x: number; y: number }) => {
    if (center) setFabCenter(center);
    setIsMenuOpen(true);
  }, []);

  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  const toggleMenu = useCallback((center?: { x: number; y: number }) => {
    setIsMenuOpen(prev => {
      if (!prev && center) setFabCenter(center);
      return !prev;
    });
  }, []);

  const onRoleSelect = useCallback((role: ArcRole) => {
    onRoleSelectCb?.(role);
  }, [onRoleSelectCb]);

  const setOnRoleSelect = useCallback((cb: ((role: ArcRole) => void) | null) => {
    setOnRoleSelectCb(() => cb);
  }, []);

  const value: ArcFABContextValue = {
    isMenuOpen,
    openMenu,
    closeMenu,
    toggleMenu,
    fabCenter,
    onRoleSelect,
    setOnRoleSelect,
  };

  return (
    <ArcFABContext.Provider value={value}>
      {children}
    </ArcFABContext.Provider>
  );
}

export function useArcFAB(): ArcFABContextValue {
  const ctx = useContext(ArcFABContext);
  if (ctx === undefined) {
    throw new Error('useArcFAB must be used within ArcFABProvider');
  }
  return ctx;
}
