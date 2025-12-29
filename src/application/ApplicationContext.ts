import { RenderingPort } from '@/application/ports/RenderingPort';
import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { ThreeJSRenderingAdapter } from '@/infrastructure/adapters/ThreeJSRenderingAdapter';
import { InMemoryShaderRepositoryAdapter } from '@/infrastructure/adapters/InMemoryShaderRepositoryAdapter';
import { BrowserFileSystemAdapter } from '@/infrastructure/adapters/BrowserFileSystemAdapter';
import { ApplyShaderEffectUseCase } from '@/application/usecases/ApplyShaderEffectUseCase';
import { LoadImageUseCase } from '@/application/usecases/LoadImageUseCase';

/**
 * Application context that holds all dependencies and provides them to use cases.
 *
 * This is the dependency injection container for the application.
 * It creates adapter instances and provides them to use cases.
 *
 * Usage:
 * ```ts
 * const context = ApplicationContext.getInstance();
 * const useCase = context.getApplyShaderEffectUseCase();
 * const result = useCase.execute(image, shaderType, params);
 * ```
 */
export class ApplicationContext {
  private static instance: ApplicationContext;

  // Adapters (infrastructure layer)
  private renderingAdapter: RenderingPort;
  private shaderRepository: ShaderRepositoryPort;
  private fileSystemAdapter: ImageLoaderPort & ImageExportPort;

  // Use cases (application layer)
  private applyShaderEffectUseCase: ApplyShaderEffectUseCase;
  private loadImageUseCase: LoadImageUseCase;

  private constructor() {
    // Initialize adapters
    this.shaderRepository = new InMemoryShaderRepositoryAdapter();
    this.fileSystemAdapter = new BrowserFileSystemAdapter();
    this.renderingAdapter = new ThreeJSRenderingAdapter(); // Will be initialized with canvas later

    // Initialize use cases with their dependencies
    this.applyShaderEffectUseCase = new ApplyShaderEffectUseCase(
      this.renderingAdapter,
      this.shaderRepository
    );
    this.loadImageUseCase = new LoadImageUseCase(
      this.fileSystemAdapter
    );
  }

  /**
   * Get the singleton instance of the application context
   */
  static getInstance(): ApplicationContext {
    if (!ApplicationContext.instance) {
      ApplicationContext.instance = new ApplicationContext();
    }
    return ApplicationContext.instance;
  }

  /**
   * Set the canvas for the rendering adapter
   * This must be called before rendering can occur
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    if (this.renderingAdapter instanceof ThreeJSRenderingAdapter) {
      this.renderingAdapter.setCanvas(canvas);
    }
  }

  /**
   * Get the rendering adapter (for direct access if needed)
   */
  getRenderingAdapter(): RenderingPort {
    return this.renderingAdapter;
  }

  /**
   * Get the shader repository (for direct access if needed)
   */
  getShaderRepository(): ShaderRepositoryPort {
    return this.shaderRepository;
  }

  /**
   * Get the file system adapter (for direct access if needed)
   */
  getFileSystemAdapter(): ImageLoaderPort & ImageExportPort {
    return this.fileSystemAdapter;
  }

  /**
   * Get the ApplyShaderEffect use case
   */
  getApplyShaderEffectUseCase(): ApplyShaderEffectUseCase {
    return this.applyShaderEffectUseCase;
  }

  /**
   * Get the LoadImage use case
   */
  getLoadImageUseCase(): LoadImageUseCase {
    return this.loadImageUseCase;
  }

  /**
   * Clean up resources when the application is destroyed
   */
  dispose(): void {
    this.renderingAdapter.dispose();
  }
}
