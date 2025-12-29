/**
 * Port interfaces for hexagonal architecture.
 *
 * Ports define the boundaries between the application core and external systems.
 * They are implemented by adapters in the infrastructure layer.
 *
 * INPUT PORTS (dependencies): What the application needs from the outside
 * - ImageLoaderPort: Loading images from files/URLs
 * - ShaderRepositoryPort: Accessing shader effect definitions
 *
 * OUTPUT PORTS (provided interfaces): What the application provides to the outside
 * - RenderingPort: Rendering scenes with shaders
 * - ImageExportPort: Exporting rendered images
 * - TexturePort: Managing texture resources
 */

// Input Ports (dependencies)
export * from './ImageLoaderPort';
export * from './ShaderRepositoryPort';

// Output Ports (provided interfaces)
export * from './RenderingPort';
export * from './ImageExportPort';
export * from './TexturePort';
