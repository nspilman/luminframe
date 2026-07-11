import { RenderingPort } from '@/application/ports/RenderingPort';
import { ShaderRepositoryPort } from '@/application/ports/ShaderRepositoryPort';
import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { ThreeJSRenderingAdapter } from '@/infrastructure/adapters/ThreeJSRenderingAdapter';
import { InMemoryShaderRepositoryAdapter } from '@/infrastructure/adapters/InMemoryShaderRepositoryAdapter';
import { BrowserFileSystemAdapter } from '@/infrastructure/adapters/BrowserFileSystemAdapter';
import { RenderEditUseCase } from '@/application/usecases/RenderEditUseCase';
import { LoadImageUseCase } from '@/application/usecases/LoadImageUseCase';
import { ExportCanvasUseCase } from '@/application/usecases/ExportCanvasUseCase';
import { SaveCanvasAsInputUseCase } from '@/application/usecases/SaveCanvasAsInputUseCase';

/**
 * Application context that holds all dependencies and provides them to use cases.
 *
 * This is the dependency injection container for the application.
 * It creates adapter instances and provides them to use cases.
 *
 * Usage:
 * ```ts
 * const context = ApplicationContext.getInstance();
 * context.setCanvas(canvas);
 * context.getRenderEditUseCase().execute(pipeline, draft, resolution);
 * ```
 */
export class ApplicationContext {
  private static instance: ApplicationContext;

  // Adapters (infrastructure layer)
  private renderingAdapter: RenderingPort;
  private shaderRepository: ShaderRepositoryPort;
  private fileSystemAdapter: ImageLoaderPort & ImageExportPort;

  // Use cases (application layer)
  private renderEditUseCase: RenderEditUseCase;
  private loadImageUseCase: LoadImageUseCase;
  private exportCanvasUseCase: ExportCanvasUseCase;
  private saveCanvasAsInputUseCase: SaveCanvasAsInputUseCase;

  private constructor() {
    // Initialize adapters
    this.shaderRepository = new InMemoryShaderRepositoryAdapter();
    this.fileSystemAdapter = new BrowserFileSystemAdapter();
    this.renderingAdapter = new ThreeJSRenderingAdapter(); // Will be initialized with canvas later

    // Initialize use cases with their dependencies
    this.renderEditUseCase = new RenderEditUseCase(
      this.shaderRepository,
      this.renderingAdapter
    );
    this.loadImageUseCase = new LoadImageUseCase(
      this.fileSystemAdapter
    );
    this.exportCanvasUseCase = new ExportCanvasUseCase(
      this.renderingAdapter,
      this.fileSystemAdapter
    );
    this.saveCanvasAsInputUseCase = new SaveCanvasAsInputUseCase(
      this.renderingAdapter,
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
   * Get the rendering adapter (for updateDimensions / canvas access)
   */
  getRenderingAdapter(): RenderingPort {
    return this.renderingAdapter;
  }

  /**
   * Get the RenderEdit use case (folds the committed pipeline + live draft)
   */
  getRenderEditUseCase(): RenderEditUseCase {
    return this.renderEditUseCase;
  }

  /**
   * Get the LoadImage use case
   */
  getLoadImageUseCase(): LoadImageUseCase {
    return this.loadImageUseCase;
  }

  /**
   * Get the ExportCanvas use case
   */
  getExportCanvasUseCase(): ExportCanvasUseCase {
    return this.exportCanvasUseCase;
  }

  /**
   * Get the SaveCanvasAsInput use case
   */
  getSaveCanvasAsInputUseCase(): SaveCanvasAsInputUseCase {
    return this.saveCanvasAsInputUseCase;
  }
}
