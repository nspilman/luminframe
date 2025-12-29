import React, { createContext, useContext, ReactNode, useRef } from 'react';
import { ParameterRegistry } from './ParameterRegistry';
import {
  RangeRenderer,
  ImageRenderer,
  ColorRenderer,
  BooleanRenderer,
  Vec2Renderer,
} from './renderers';
import {
  NumberConverter,
  BooleanConverter,
  ColorConverter,
  ImageConverter,
  ArrayConverter,
} from './converters';

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
    const registry = new ParameterRegistry();

    // Register built-in renderers
    registry.registerRenderer('range', new RangeRenderer());
    registry.registerRenderer('image', new ImageRenderer());
    registry.registerRenderer('color', new ColorRenderer());
    registry.registerRenderer('boolean', new BooleanRenderer());
    registry.registerRenderer('vec2', new Vec2Renderer());

    // Register built-in converters
    // Order matters: more specific converters first
    registry.registerConverter(new ImageConverter());
    registry.registerConverter(new ColorConverter());
    registry.registerConverter(new BooleanConverter());
    registry.registerConverter(new ArrayConverter());
    registry.registerConverter(new NumberConverter());

    registryRef.current = registry;
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
