# Phase 1: Module Reorganization + Domain Models

**Timeline:** 1-2 weeks
**Goal:** Clean up module structure and introduce core domain models to decouple from Three.js

---

## Week 1: Module Reorganization & Foundation

### 1. Reorganize Module Structure

#### 1.1 Move misplaced modules
- [ ] Move `src/hooks/shaderRecordBuilder.ts` → `src/lib/shaderConfig.ts`
- [ ] Move `src/hooks/shaderRecordBuilder.test.ts` → `src/lib/shaderConfig.test.ts`
- [ ] Update all imports that reference `shaderRecordBuilder`
- [ ] Verify tests still pass after move

**Files to update:**
- All effect files in `src/lib/shaders/effects/*.ts`
- Test files

---

#### 1.2 Create proper directory structure
- [ ] Create `src/domain/` directory for domain models
- [ ] Create `src/domain/models/` subdirectory
- [ ] Create `src/domain/value-objects/` subdirectory
- [ ] Create `src/services/` directory for application services
- [ ] Update `tsconfig.json` paths if needed

---

### 2. Create Value Objects

#### 2.1 Create Dimensions value object
- [ ] Create `src/domain/value-objects/Dimensions.ts`
  ```typescript
  export class Dimensions {
    constructor(
      public readonly width: number,
      public readonly height: number
    ) {
      if (width <= 0 || height <= 0) {
        throw new Error('Dimensions must be positive');
      }
    }

    getAspectRatio(): number {
      return this.width / this.height;
    }

    scale(factor: number): Dimensions {
      return new Dimensions(
        Math.round(this.width * factor),
        Math.round(this.height * factor)
      );
    }

    equals(other: Dimensions): boolean {
      return this.width === other.width && this.height === other.height;
    }

    toArray(): [number, number] {
      return [this.width, this.height];
    }

    static fromArray([width, height]: [number, number]): Dimensions {
      return new Dimensions(width, height);
    }
  }
  ```
- [ ] Create `src/domain/value-objects/Dimensions.test.ts` with tests
- [ ] Verify all tests pass

---

#### 2.2 Create Color value object
- [ ] Create `src/domain/value-objects/Color.ts`
  ```typescript
  export class Color {
    private constructor(
      public readonly r: number,
      public readonly g: number,
      public readonly b: number
    ) {
      this.validateChannel(r, 'red');
      this.validateChannel(g, 'green');
      this.validateChannel(b, 'blue');
    }

    private validateChannel(value: number, name: string): void {
      if (value < 0 || value > 1) {
        throw new Error(`${name} must be between 0 and 1`);
      }
    }

    toFloat32Array(): Float32Array {
      return new Float32Array([this.r, this.g, this.b]);
    }

    toHex(): string {
      const toHex = (n: number) =>
        Math.round(n * 255).toString(16).padStart(2, '0');
      return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
    }

    toRGBObject(): { r: number; g: number; b: number } {
      return { r: this.r, g: this.g, b: this.b };
    }

    static fromRGB(r: number, g: number, b: number): Color {
      return new Color(r, g, b);
    }

    static fromHex(hex: string): Color {
      const r = parseInt(hex.slice(1, 3), 16) / 255;
      const g = parseInt(hex.slice(3, 5), 16) / 255;
      const b = parseInt(hex.slice(5, 7), 16) / 255;
      return new Color(r, g, b);
    }

    static fromFloat32Array(arr: Float32Array): Color {
      return new Color(arr[0], arr[1], arr[2]);
    }
  }
  ```
- [ ] Create `src/domain/value-objects/Color.test.ts` with tests
- [ ] Verify all tests pass

---

#### 2.3 Create index for value objects
- [ ] Create `src/domain/value-objects/index.ts`
  ```typescript
  export { Dimensions } from './Dimensions';
  export { Color } from './Color';
  ```

---

### 3. Create Image Domain Model

#### 3.1 Create Image model
- [ ] Create `src/domain/models/Image.ts`
  ```typescript
  import { Dimensions } from '../value-objects/Dimensions';

  export interface ImageData {
    readonly url: string;
    readonly blob?: Blob;
  }

  export class Image {
    constructor(
      public readonly id: string,
      public readonly dimensions: Dimensions,
      public readonly data: ImageData
    ) {}

    getAspectRatio(): number {
      return this.dimensions.getAspectRatio();
    }

    getDimensions(): Dimensions {
      return this.dimensions;
    }

    static async fromFile(file: File): Promise<Image> {
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
          const dimensions = new Dimensions(img.width, img.height);
          const image = new Image(
            crypto.randomUUID(),
            dimensions,
            { url, blob: file }
          );
          resolve(image);
        };

        img.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('Failed to load image'));
        };

        img.src = url;
      });
    }

    dispose(): void {
      if (this.data.url) {
        URL.revokeObjectURL(this.data.url);
      }
    }
  }
  ```
- [ ] Create `src/domain/models/Image.test.ts` with tests
- [ ] Verify all tests pass

---

#### 3.2 Create index for models
- [ ] Create `src/domain/models/index.ts`
  ```typescript
  export { Image, ImageData } from './Image';
  ```
- [ ] Create `src/domain/index.ts`
  ```typescript
  export * from './models';
  export * from './value-objects';
  ```

---

## Week 2: Service Layer & Integration

### 4. Create Service Layer

#### 4.1 Create ResolutionService
- [ ] Create `src/services/ResolutionService.ts`
  ```typescript
  import { Dimensions } from '@/domain/value-objects/Dimensions';
  import { Image } from '@/domain/models/Image';

  export class ResolutionService {
    constructor(private readonly fallbackDimensions: Dimensions) {}

    calculateFromImage(image: Image | null): Dimensions {
      if (image) {
        return image.getDimensions();
      }
      return this.fallbackDimensions;
    }

    calculateFromWindow(): Dimensions {
      if (typeof window === 'undefined') {
        return new Dimensions(1920, 1080);
      }
      return new Dimensions(window.innerWidth, window.innerHeight);
    }

    calculateForShader(image: Image | null): Dimensions {
      return this.calculateFromImage(image) ?? this.calculateFromWindow();
    }
  }
  ```
- [ ] Create `src/services/ResolutionService.test.ts` with tests
- [ ] Verify all tests pass

---

#### 4.2 Create TextureAdapter (Three.js abstraction)
- [ ] Create `src/adapters/` directory
- [ ] Create `src/adapters/TextureAdapter.ts`
  ```typescript
  import { Texture, TextureLoader } from 'three';
  import { Image } from '@/domain/models/Image';

  export interface TextureHandle {
    readonly id: string;
    readonly texture: Texture;
    readonly source: Image;
  }

  export class TextureAdapter {
    private textureLoader = new TextureLoader();
    private textureCache = new Map<string, TextureHandle>();

    createTexture(image: Image): TextureHandle {
      // Check cache first
      const cached = this.textureCache.get(image.id);
      if (cached) {
        return cached;
      }

      // Create new texture
      const texture = this.textureLoader.load(image.data.url);
      const handle: TextureHandle = {
        id: image.id,
        texture,
        source: image
      };

      this.textureCache.set(image.id, handle);
      return handle;
    }

    disposeTexture(id: string): void {
      const handle = this.textureCache.get(id);
      if (handle) {
        handle.texture.dispose();
        handle.source.dispose();
        this.textureCache.delete(id);
      }
    }

    clearCache(): void {
      this.textureCache.forEach(handle => {
        handle.texture.dispose();
      });
      this.textureCache.clear();
    }
  }
  ```
- [ ] Create `src/adapters/index.ts`
  ```typescript
  export { TextureAdapter, TextureHandle } from './TextureAdapter';
  ```

---

### 5. Update Components to Use Domain Models

#### 5.1 Update AspectRatioPicker
- [ ] Replace `[number, number]` with `Dimensions` in `aspect-ratio-picker.tsx`
- [ ] Update prop types
- [ ] Update comparison logic to use `dimensions.equals()`
- [ ] Update onChange to pass Dimensions object
- [ ] Test component still works

---

#### 5.2 Update ColorPicker
- [ ] Replace `Float32Array` with `Color` in `ColorPicker.tsx`
- [ ] Update prop types: `color: Color`, `setColor: (color: Color) => void`
- [ ] Use `color.toHex()` and `Color.fromHex()` for conversions
- [ ] Remove `rgbToHex` and `hexToRgb` functions
- [ ] Update display to use `color.toRGBObject()`
- [ ] Test component still works

---

#### 5.3 Update ImageUpload to use Image model
- [ ] Update `image-upload.tsx` to return `Image` instead of `Texture`
- [ ] Change prop: `onChange: (image: Image) => void`
- [ ] Use `Image.fromFile()` in onDrop handler
- [ ] Add error handling for image load failures
- [ ] Add user feedback for errors
- [ ] Test upload still works
- [ ] Verify blob URL cleanup happens

---

#### 5.4 Update useWindowSize to return Dimensions
- [ ] Update `useWindowSize.ts` to return `Dimensions` object
- [ ] Change return type from `{ width, height }` to `Dimensions`
- [ ] Update all consumers of `useWindowSize`
- [ ] Test still works

---

### 6. Update useShader Hook

#### 6.1 Integrate ResolutionService
- [ ] Add `ResolutionService` instance to `useShader`
- [ ] Remove inline resolution calculation logic
- [ ] Use `resolutionService.calculateForShader(image)`
- [ ] Make resolution injection explicit in return type
- [ ] Remove `@ts-ignore` comment
- [ ] Add proper types for return value

---

#### 6.2 Update to work with Image model
- [ ] Update hook to track `Image` instead of `Texture`
- [ ] Update `varValues` to use `Image` type for image inputs
- [ ] Remove direct `imageTexture` manipulation
- [ ] Add conversion layer for Three.js when needed
- [ ] Test hook works with new types

---

### 7. Update ClientApp Integration

#### 7.1 Integrate TextureAdapter
- [ ] Create `TextureAdapter` instance in `ClientApp`
- [ ] Use adapter to convert `Image` to `Texture` before passing to ImageScene
- [ ] Remove `TextureLoader` import from `ClientApp`
- [ ] Update state to use `Image` instead of `Texture`

---

#### 7.2 Update save functionality
- [ ] Update `handleSaveImage` to work with domain models
- [ ] Use `TextureAdapter` for texture access
- [ ] Add error handling
- [ ] Add user feedback for save success/failure
- [ ] Remove `document.querySelector` - use ref instead

---

#### 7.3 Clean up ClientApp
- [ ] Remove console.log statements
- [ ] Remove direct Three.js imports
- [ ] Update prop types to use domain models
- [ ] Verify app still functions correctly

---

### 8. Update Shader System

#### 8.1 Update shader default values
- [ ] Update shader effects to use `Color` for color defaults
- [ ] Update `createShaderVariable().asVec3()` to accept `Color`
- [ ] Add conversion in `shaderConfig.ts` to handle `Color → Float32Array`
- [ ] Verify all effects still compile

---

#### 8.2 Update shader resolution handling
- [ ] Make resolution explicit in shader configuration
- [ ] Remove auto-injection of resolution field
- [ ] Add resolution as explicit parameter where needed
- [ ] Update effects that use resolution

---

### 9. Final Cleanup & Documentation

#### 9.1 Update type definitions
- [ ] Update `ShaderInputVars` to remove `Texture` type
- [ ] Add `Image` type to `ShaderInputVars`
- [ ] Update `ShaderInputDefinition` if needed
- [ ] Remove unused type definitions

---

#### 9.2 Update tests
- [ ] Update all existing tests to use domain models
- [ ] Add tests for new domain models
- [ ] Add tests for new services
- [ ] Ensure 100% test coverage for domain layer
- [ ] Run full test suite

---

#### 9.3 Documentation
- [ ] Update README with new architecture
- [ ] Add JSDoc comments to domain models
- [ ] Add JSDoc comments to services
- [ ] Document migration from old structure
- [ ] Create architecture diagram

---

#### 9.4 Final verification
- [ ] Run full test suite - all passing
- [ ] Manual testing of all features
- [ ] Check for console errors
- [ ] Verify no Three.js types in React components (except ImageScene)
- [ ] Verify no `@ts-ignore` or `any` types added
- [ ] Verify bundle size hasn't increased significantly
- [ ] Performance testing - no regressions

---

## Success Criteria

- [ ] All modules in correct directories
- [ ] `Dimensions` value object used throughout
- [ ] `Color` value object used throughout
- [ ] `Image` domain model abstracts Three.js Texture
- [ ] `ResolutionService` centralizes resolution logic
- [ ] `TextureAdapter` provides Three.js abstraction
- [ ] No Three.js imports in UI components (except ImageScene)
- [ ] All tests passing
- [ ] No new type safety violations
- [ ] Application functionality unchanged from user perspective

---

## Notes

- **Do not break existing functionality** - all changes should be refactorings
- **Run tests after each step** - catch issues early
- **Commit frequently** - small, focused commits for easy rollback
- **Update imports immediately** - don't let broken imports accumulate

---

## Risk Mitigation

- Work on feature branch: `refactor/phase-1-architecture`
- Commit after each completed todo item
- Run tests before each commit
- Keep PR reviewable (don't let it get too large)
- Consider splitting into multiple PRs if needed

---

## Estimated Time

- **Week 1:** 12-16 hours
  - Module reorganization: 2-3 hours
  - Value objects creation: 4-6 hours
  - Image domain model: 4-5 hours
  - Testing: 2 hours

- **Week 2:** 12-16 hours
  - Service layer: 4-5 hours
  - Component updates: 4-6 hours
  - Integration: 2-3 hours
  - Testing & cleanup: 2-3 hours

**Total:** 24-32 hours over 1-2 weeks
