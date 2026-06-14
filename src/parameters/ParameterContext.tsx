import React, { createContext, useContext, ReactNode, useRef } from 'react';
import { ParameterRegistry } from './ParameterRegistry';
import { createDefaultParameterRegistry } from './defaultRegistry';

const ParameterRegistryContext = createContext<ParameterRegistry | null>(null);

interface ParameterRegistryProviderProps {
  children: ReactNode;
}

/**
 * Provides a ParameterRegistry instance with all built-in types registered
 */
export function ParameterRegistryProvider({
  children,
}: ParameterRegistryProviderProps) {
  const registryRef = useRef<ParameterRegistry | null>(null);

  if (!registryRef.current) {
    registryRef.current = createDefaultParameterRegistry();
  }

  return (
    <ParameterRegistryContext.Provider value={registryRef.current}>
      {children}
    </ParameterRegistryContext.Provider>
  );
}

/**
 * Hook to access the parameter registry
 * Must be used within a ParameterRegistryProvider
 */
export function useParameterRegistry(): ParameterRegistry {
  const registry = useContext(ParameterRegistryContext);

  if (!registry) {
    throw new Error(
      'useParameterRegistry must be used within ParameterRegistryProvider'
    );
  }

  return registry;
}
