# Phase 3: Hexagonal Architecture Implementation

**Goal:** Perfect architecture for extensibility while maintaining feature parity
**Duration:** 1-2 months (broken into weekly milestones)
**Focus:** Architecture, NOT new features

---

## Principles

✅ **DO:**
- Improve separation of concerns
- Create clear port interfaces
- Implement adapters for infrastructure
- Enhance testability
- Make code extensible

❌ **DON'T:**
- Add new features (undo/redo, etc.)
- Change user-facing behavior
- Break existing functionality
- Add complexity without clear benefit

---

## Phase 3 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                     │
│              (React Components - Pure UI)                │
│   ClientApp, CanvasWorkspace, ShaderControls, etc.     │
└──────────────────────┬──────────────────────────────────┘
                       │ Uses
┌──────────────────────▼──────────────────────────────────┐
│                  Application Layer                       │
│                   (Use Cases / Ports)                    │
│   - ApplyShaderEffect    - ExportCanvas                 │
│   - LoadImage            - UpdateShaderParameter        │
│   - SwitchShader         - DownloadImage                │
└──────────────────────┬──────────────────────────────────┘
                       │ Uses
┌──────────────────────▼──────────────────────────────────┐
│                    Domain Layer                          │
│              (Business Logic - Pure TS)                  │
│   ShaderEffect, Image, Color, Dimensions, Parameters    │
└──────────────────────┬──────────────────────────────────┘
                       │ Used by
┌──────────────────────▼──────────────────────────────────┐
│              Infrastructure Adapters                     │
│                   (Implementations)                      │
│   ThreeJSAdapter, FileSystemAdapter, WebGLAdapter       │
└─────────────────────────────────────────────────────────┘
```

---

## Week 1: Application Layer Foundation

### Goals
- Define use cases for all current features
- Create port interfaces
- No implementation changes yet (just planning)

### Tasks

#### 1. Identify Use Cases
Map all current features to use cases:

**Image Management:**
- `LoadImageUseCase` - Load image from file
- `UpdateImageUseCase` - Replace current image
- `SetSecondImageUseCase` - Set blend target image

**Shader Operations:**
- `ApplyShaderEffectUseCase` - Apply shader to image
- `SwitchShaderEffectUseCase` - Change active shader
- `UpdateShaderParameterUseCase` - Modify shader parameter

**Export Operations:**
- `ExportCanvasUseCase` - Export current canvas as image
- `DownloadImageUseCase` - Download rendered result

#### 2. Define Port Interfaces

Create `src/application/ports/` with interface definitions:

```typescript
// RenderingPort.ts - Abstract rendering operations
export interface RenderingPort {
  renderScene(image: Image, effect: ShaderEffect, params: ShaderInputVars): RenderResult;
  exportCanvas(dimensions: Dimensions, format: ImageFormat): Blob;
}

// ImageLoaderPort.ts - Abstract file loading
export interface ImageLoaderPort {
  loadFromFile(file: File): Promise<Image>;
  loadFromUrl(url: string): Promise<Image>;
}

// ImageExportPort.ts - Abstract export operations
export interface ImageExportPort {
  toBlob(imageData: ImageData, format: ImageFormat): Promise<Blob>;
  download(blob: Blob, filename: string): void;
}

// ShaderRepositoryPort.ts - Abstract shader storage
export interface ShaderRepositoryPort {
  getShader(name: ShaderType): ShaderEffect;
  getAllShaders(): ShaderEffect[];
}
```

#### 3. Document Current Flow

Create flow diagrams for:
- Image upload → render
- Shader switch → re-render
- Parameter change → update
- Export → download

**Deliverable:** `CURRENT_FLOWS.md` documenting existing data flows

---

## Week 2: Domain Layer Refinement

### Goals
- Ensure domain layer is infrastructure-independent
- Move infrastructure concerns out of domain models
- Create missing domain value objects

### Tasks

#### 1. Audit Domain Models

Check each domain model for infrastructure dependencies:
- `Image` - Should NOT depend on Three.js
- `Color` - ✅ Already clean
- `Dimensions` - ✅ Already clean
- `ShaderEffect` - Check for Three.js leakage

#### 2. Create Missing Value Objects

```typescript
// ImageFormat.ts
export class ImageFormat {
  private constructor(private readonly mimeType: string) {}

  static readonly PNG = new ImageFormat('image/png');
  static readonly JPEG = new ImageFormat('image/jpeg');
  static readonly WEBP = new ImageFormat('image/webp');

  getMimeType(): string { return this.mimeType; }
}

// RenderResult.ts (if needed)
export class RenderResult {
  constructor(
    public readonly imageData: ImageData,
    public readonly dimensions: Dimensions
  ) {}
}
```

#### 3. Refactor ShaderEffect

Ensure `ShaderEffect` is pure domain:
- Remove any Three.js types from interfaces
- Use domain types (Color, Image) instead of infrastructure types (Texture, Vector3)
- Shader GLSL code should be pure strings (already is)

**Deliverable:** Pure domain layer with zero infrastructure dependencies

---

## Week 3: Infrastructure Adapters

### Goals
- Create adapter implementations for ports
- Isolate Three.js behind adapter interfaces
- Make infrastructure swappable

### Tasks

#### 1. Create ThreeJS Rendering Adapter

```typescript
// src/infrastructure/rendering/ThreeJSRenderingAdapter.ts
export class ThreeJSRenderingAdapter implements RenderingPort {
  private scene: Scene;
  private camera: Camera;
  private renderer: WebGLRenderer;

  renderScene(image: Image, effect: ShaderEffect, params: ShaderInputVars): RenderResult {
    // Three.js implementation details
    // Convert domain models to Three.js types
    // Return domain RenderResult
  }

  exportCanvas(dimensions: Dimensions, format: ImageFormat): Blob {
    // Use renderer.domElement to export
  }
}
```

#### 2. Create File System Adapter

```typescript
// src/infrastructure/filesystem/BrowserFileSystemAdapter.ts
export class BrowserFileSystemAdapter implements ImageLoaderPort, ImageExportPort {
  async loadFromFile(file: File): Promise<Image> {
    // Browser File API implementation
    // Convert to domain Image model
  }

  async toBlob(imageData: ImageData, format: ImageFormat): Promise<Blob> {
    // Canvas API implementation
  }

  download(blob: Blob, filename: string): void {
    // Browser download implementation
  }
}
```

#### 3. Create Shader Repository Adapter

```typescript
// src/infrastructure/shaders/InMemoryShaderRepository.ts
export class InMemoryShaderRepository implements ShaderRepositoryPort {
  private shaders: Map<ShaderType, ShaderEffect>;

  constructor() {
    // Load all shaders from src/lib/shaders/
    this.shaders = this.loadAllShaders();
  }

  getShader(name: ShaderType): ShaderEffect {
    return this.shaders.get(name)!;
  }

  getAllShaders(): ShaderEffect[] {
    return Array.from(this.shaders.values());
  }
}
```

**Deliverable:** Working adapters that implement all ports

---

## Week 4: Application Use Cases

### Goals
- Implement use case classes
- Orchestrate domain logic + adapters
- Keep use cases focused and testable

### Tasks

#### 1. Implement Core Use Cases

```typescript
// src/application/usecases/ApplyShaderEffectUseCase.ts
export class ApplyShaderEffectUseCase {
  constructor(
    private renderingAdapter: RenderingPort,
    private shaderRepository: ShaderRepositoryPort
  ) {}

  execute(request: ApplyShaderRequest): ApplyShaderResponse {
    // 1. Get shader from repository
    const shader = this.shaderRepository.getShader(request.shaderName);

    // 2. Validate parameters against shader inputs
    this.validateParameters(shader, request.parameters);

    // 3. Render using adapter
    const result = this.renderingAdapter.renderScene(
      request.image,
      shader,
      request.parameters
    );

    // 4. Return result
    return { result, shader };
  }

  private validateParameters(shader: ShaderEffect, params: ShaderInputVars): void {
    // Domain validation logic
  }
}
```

```typescript
// src/application/usecases/LoadImageUseCase.ts
export class LoadImageUseCase {
  constructor(private imageLoader: ImageLoaderPort) {}

  async execute(file: File): Promise<Image> {
    // Validation
    this.validateFile(file);

    // Load via adapter
    const image = await this.imageLoader.loadFromFile(file);

    // Domain validation
    this.validateImage(image);

    return image;
  }

  private validateFile(file: File): void {
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }
  }

  private validateImage(image: Image): void {
    const maxDimension = 4096;
    if (image.dimensions.width > maxDimension || image.dimensions.height > maxDimension) {
      throw new Error(`Image dimensions too large (max ${maxDimension}px)`);
    }
  }
}
```

#### 2. Create Request/Response Types

```typescript
// src/application/dto/ApplyShaderRequest.ts
export interface ApplyShaderRequest {
  image: Image;
  shaderName: ShaderType;
  parameters: ShaderInputVars;
}

export interface ApplyShaderResponse {
  result: RenderResult;
  shader: ShaderEffect;
}
```

**Deliverable:** Complete use case implementations

---

## Week 5: Dependency Injection Setup

### Goals
- Wire up all layers
- Create dependency container
- Remove hard-coded dependencies

### Tasks

#### 1. Create Application Context

```typescript
// src/application/ApplicationContext.ts
export class ApplicationContext {
  // Adapters
  readonly renderingAdapter: RenderingPort;
  readonly imageLoader: ImageLoaderPort;
  readonly imageExporter: ImageExportPort;
  readonly shaderRepository: ShaderRepositoryPort;

  // Use Cases
  readonly applyShaderEffect: ApplyShaderEffectUseCase;
  readonly loadImage: LoadImageUseCase;
  readonly exportCanvas: ExportCanvasUseCase;
  readonly updateParameter: UpdateShaderParameterUseCase;

  constructor() {
    // Initialize adapters
    this.renderingAdapter = new ThreeJSRenderingAdapter();
    this.imageLoader = new BrowserFileSystemAdapter();
    this.imageExporter = new BrowserFileSystemAdapter();
    this.shaderRepository = new InMemoryShaderRepository();

    // Initialize use cases with dependencies
    this.applyShaderEffect = new ApplyShaderEffectUseCase(
      this.renderingAdapter,
      this.shaderRepository
    );
    this.loadImage = new LoadImageUseCase(this.imageLoader);
    this.exportCanvas = new ExportCanvasUseCase(this.imageExporter);
    this.updateParameter = new UpdateShaderParameterUseCase(this.renderingAdapter);
  }
}
```

#### 2. Create React Context Provider

```typescript
// src/application/ApplicationProvider.tsx
const ApplicationContextReact = createContext<ApplicationContext | null>(null);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const appContext = useRef<ApplicationContext | null>(null);

  if (!appContext.current) {
    appContext.current = new ApplicationContext();
  }

  return (
    <ApplicationContextReact.Provider value={appContext.current}>
      {children}
    </ApplicationContextReact.Provider>
  );
}

export function useApplicationContext(): ApplicationContext {
  const context = useContext(ApplicationContextReact);
  if (!context) {
    throw new Error('useApplicationContext must be used within ApplicationProvider');
  }
  return context;
}
```

#### 3. Update App.tsx

```typescript
function App() {
  return (
    <ApplicationProvider>
      <ParameterRegistryProvider>
        <div className="App">
          <ClientApp />
        </div>
      </ParameterRegistryProvider>
    </ApplicationProvider>
  );
}
```

**Deliverable:** Dependency injection working, no hard-coded adapter creation

---

## Week 6: Presentation Layer Refactoring

### Goals
- Refactor React components to use application layer
- Remove infrastructure code from components
- Components should only handle UI + call use cases

### Tasks

#### 1. Refactor ClientApp

**Before:**
```typescript
// Directly using Three.js, managing state, handling files
function ClientApp() {
  const [image, setImage] = useState<Image | null>(null);
  // ... lots of infrastructure code
}
```

**After:**
```typescript
function ClientApp() {
  const app = useApplicationContext();
  const [image, setImage] = useState<Image | null>(null);

  const handleImageUpload = async (file: File) => {
    const loadedImage = await app.loadImage.execute(file);
    setImage(loadedImage);
  };

  const handleShaderChange = (shaderName: ShaderType) => {
    const result = app.applyShaderEffect.execute({
      image: image!,
      shaderName,
      parameters: currentParams
    });
    // Update UI with result
  };

  // Pure UI logic only
}
```

#### 2. Refactor CanvasWorkspace

Remove Three.js setup code, use rendering adapter instead:

```typescript
function CanvasWorkspace({ image, shader, parameters }: Props) {
  const app = useApplicationContext();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!image || !canvasRef.current) return;

    // Use adapter instead of direct Three.js
    const result = app.renderingAdapter.renderScene(image, shader, parameters);

    // Update canvas with result
    updateCanvas(canvasRef.current, result);
  }, [image, shader, parameters]);

  return <canvas ref={canvasRef} />;
}
```

#### 3. Refactor Export Functionality

```typescript
function ExportButton({ currentCanvas }: Props) {
  const app = useApplicationContext();

  const handleExport = async () => {
    const blob = await app.exportCanvas.execute({
      dimensions: currentDimensions,
      format: ImageFormat.PNG
    });

    app.imageExporter.download(blob, 'luminframe-export.png');
  };

  return <Button onClick={handleExport}>Export</Button>;
}
```

**Deliverable:** UI components are thin, use application layer only

---

## Week 7: Testing Infrastructure

### Goals
- Demonstrate testability improvements
- Write tests for use cases
- Create mock adapters

### Tasks

#### 1. Create Mock Adapters

```typescript
// src/infrastructure/testing/MockRenderingAdapter.ts
export class MockRenderingAdapter implements RenderingPort {
  renderScene = jest.fn();
  exportCanvas = jest.fn();
}
```

#### 2. Write Use Case Tests

```typescript
// src/application/usecases/__tests__/ApplyShaderEffectUseCase.test.ts
describe('ApplyShaderEffectUseCase', () => {
  it('should apply shader effect to image', () => {
    const mockRenderer = new MockRenderingAdapter();
    const mockRepo = new MockShaderRepository();
    const useCase = new ApplyShaderEffectUseCase(mockRenderer, mockRepo);

    const request: ApplyShaderRequest = {
      image: createTestImage(),
      shaderName: 'blackAndWhite',
      parameters: {}
    };

    const response = useCase.execute(request);

    expect(mockRenderer.renderScene).toHaveBeenCalledWith(
      request.image,
      expect.any(Object),
      request.parameters
    );
  });

  it('should validate parameters', () => {
    // Test validation logic
  });
});
```

#### 3. Write Domain Tests

Test domain models in isolation:

```typescript
describe('Image', () => {
  it('should calculate aspect ratio correctly', () => {
    const image = Image.fromDimensions(
      Dimensions.create(1920, 1080),
      createTestImageData()
    );

    expect(image.getAspectRatio()).toBe(16/9);
  });
});
```

**Deliverable:** Test suite demonstrating architectural improvements

---

## Week 8: Documentation & Cleanup

### Goals
- Document new architecture
- Clean up old code
- Verify feature parity

### Tasks

#### 1. Update ARCHITECTURE.md

- Document hexagonal architecture
- Update diagrams
- Add dependency flow charts
- Document port interfaces

#### 2. Create ADRs (Architecture Decision Records)

Document key decisions:
- Why hexagonal architecture?
- Why dependency injection?
- Trade-offs made
- Future extension points

#### 3. Feature Parity Verification

Test all existing features:
- ✅ Image upload works
- ✅ All 16 shader effects work
- ✅ Parameter controls work
- ✅ Export works
- ✅ Second image blend works
- ✅ Canvas download works

#### 4. Remove Old Code

- Delete unused files
- Remove dead code
- Clean up imports
- Update dependencies

**Deliverable:** Clean, well-documented codebase

---

## Success Criteria

At the end of Phase 3, we should have:

### Architecture
- ✅ Complete separation of concerns (UI → Application → Domain → Infrastructure)
- ✅ All infrastructure behind adapter interfaces
- ✅ Domain layer has zero infrastructure dependencies
- ✅ Use cases orchestrate all operations
- ✅ Dependency injection throughout

### Testability
- ✅ Domain logic testable in isolation
- ✅ Use cases testable with mock adapters
- ✅ No need to mock Three.js to test business logic
- ✅ Mock adapters available for testing

### Extensibility
- ✅ Can swap rendering engine without changing business logic
- ✅ Can add new adapters (e.g., WebGPU, OffscreenCanvas)
- ✅ Can add new use cases easily
- ✅ Can extend domain models without breaking infrastructure

### Feature Parity
- ✅ All existing features work exactly as before
- ✅ No regression in functionality
- ✅ Same user experience
- ✅ Performance is same or better

### Code Quality
- ✅ TypeScript strict mode enabled
- ✅ No circular dependencies
- ✅ Clear module boundaries
- ✅ Comprehensive documentation

---

## Migration Strategy

### Approach: Incremental Refactoring

We'll refactor incrementally, keeping the app working at all times:

1. **Add new layers alongside old code** - Don't break existing code
2. **Migrate one feature at a time** - Start with image upload
3. **Test after each migration** - Verify feature still works
4. **Remove old code only after new code is proven** - Safety first

### Example Migration Path

```
Week 1-2: Planning (no code changes)
Week 3:   Create adapters (coexist with old code)
Week 4:   Create use cases (coexist with old code)
Week 5:   Wire up DI (coexist with old code)
Week 6:   Migrate components one-by-one
Week 7:   Remove old code paths
Week 8:   Final cleanup
```

### Rollback Plan

If something breaks:
1. Git revert to last working commit
2. Analyze what went wrong
3. Fix in isolation
4. Re-apply change

---

## Phase 3 vs Previous Phases

| Aspect | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| **Focus** | File organization | Extensibility | Architecture |
| **Scope** | Move files | Add plugin system | Hexagonal arch |
| **Risk** | Low | Low | Medium |
| **Duration** | 1-2 weeks | 2-4 weeks | 6-8 weeks |
| **Tests** | None added | None added | Comprehensive |
| **Breaking changes** | None | None | None (internal only) |

---

## Next Steps

Ready to start? Let's begin with **Week 1: Application Layer Foundation**

First task: Identify all current use cases by analyzing the existing codebase.

**Question:** Should I start by mapping out all the current use cases and creating the port interfaces?
