/**
 * Infrastructure adapters that implement port interfaces.
 *
 * These adapters isolate external dependencies (Three.js, browser APIs, etc.)
 * from the application core, following hexagonal architecture principles.
 */

export { ThreeJSRenderingAdapter } from './ThreeJSRenderingAdapter';
export { BrowserFileSystemAdapter } from './BrowserFileSystemAdapter';
export { InMemoryShaderRepositoryAdapter } from './InMemoryShaderRepositoryAdapter';

// Re-export existing TextureAdapter for backward compatibility
export { TextureAdapter } from '@/adapters/TextureAdapter';
