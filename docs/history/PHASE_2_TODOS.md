# Phase 2: Rendering Adapter + Parameter Plugin System

**Timeline:** 2-4 weeks
**Goal:** Abstract rendering backend and create extensible parameter system

---

## Overview

Phase 2 focuses on:
1. **Rendering Adapter** - Abstract Three.js behind clean interface
2. **Parameter Plugin System** - Make parameter types extensible
3. **Shader Concerns Separation** - Decouple shader definitions from UI

---

## Week 1: Rendering Abstraction

### 1. Define Rendering Interfaces

#### 1.1 Create rendering contracts
- [ ] Create `src/rendering/` directory
- [ ] Create `src/rendering/interfaces/RenderingEngine.ts`
  ```typescript
  export interface RenderingEngine {
    createTexture(image: Image): TextureHandle;
    compileShader(code: string, uniforms: UniformDefinitions): ShaderHandle;
    render(shader: ShaderHandle, uniforms: UniformValues): void;
    dispose(): void;
  }

  export interface TextureHandle {
    readonly id: string;
    dispose(): void;
  }

  export interface ShaderHandle {
    readonly id: string;
    updateUniform(name: string, value: UniformValue): void;
    dispose(): void;
  }

  export type UniformValue =
    | number
    | boolean
    | [number, number]
    | [number, number, number]
    | [number, number, number, number]
    | TextureHandle;

  export interface UniformDefinitions {
    [name: string]: {
      type: 'float' | 'bool' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D';
      value: UniformValue;
    };
  }
  ```

#### 1.2 Create canvas rendering interface
- [ ] Create `src/rendering/interfaces/CanvasRenderer.ts`
  ```typescript
  export interface CanvasRenderer {
    mount(container: HTMLElement): void;
    unmount(): void;
    resize(width: number, height: number): void;
    getCanvas(): HTMLCanvasElement | null;
    render(): void;
  }
  ```

#### 1.3 Create index file
- [ ] Create `src/rendering/interfaces/index.ts`
- [ ] Export all interfaces

---

### 2. Implement Three.js Adapter

#### 2.1 Create Three.js rendering engine
- [ ] Create `src/rendering/threejs/ThreeJSRenderingEngine.ts`
  ```typescript
  import { RenderingEngine, TextureHandle, ShaderHandle } from '../interfaces';
  import { Image } from '@/domain/models/Image';
  import * as THREE from 'three';

  export class ThreeJSRenderingEngine implements RenderingEngine {
    private textureLoader = new THREE.TextureLoader();
    private textures = new Map<string, ThreeJSTextureHandle>();
    private shaders = new Map<string, ThreeJSShaderHandle>();

    createTexture(image: Image): TextureHandle {
      // Implementation
    }

    compileShader(code: string, uniforms: UniformDefinitions): ShaderHandle {
      // Implementation
    }

    render(shader: ShaderHandle, uniforms: UniformValues): void {
      // Implementation
    }

    dispose(): void {
      // Cleanup all resources
    }
  }

  class ThreeJSTextureHandle implements TextureHandle {
    constructor(
      public readonly id: string,
      public readonly texture: THREE.Texture
    ) {}

    dispose(): void {
      this.texture.dispose();
    }
  }

  class ThreeJSShaderHandle implements ShaderHandle {
    constructor(
      public readonly id: string,
      private material: THREE.ShaderMaterial
    ) {}

    updateUniform(name: string, value: UniformValue): void {
      this.material.uniforms[name].value = this.convertValue(value);
    }

    dispose(): void {
      this.material.dispose();
    }

    private convertValue(value: UniformValue): any {
      // Convert to Three.js types
    }
  }
  ```

#### 2.2 Create Three.js canvas renderer
- [ ] Create `src/rendering/threejs/ThreeJSCanvasRenderer.ts`
  ```typescript
  import { CanvasRenderer } from '../interfaces';
  import * as THREE from 'three';

  export class ThreeJSCanvasRenderer implements CanvasRenderer {
    private scene: THREE.Scene;
    private camera: THREE.Camera;
    private renderer: THREE.WebGLRenderer;
    private mesh: THREE.Mesh;

    constructor(
      private shader: ShaderHandle,
      private dimensions: [number, number]
    ) {
      this.scene = new THREE.Scene();
      this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
      // Setup mesh with shader material
    }

    mount(container: HTMLElement): void {
      container.appendChild(this.renderer.domElement);
    }

    unmount(): void {
      this.renderer.domElement.remove();
    }

    resize(width: number, height: number): void {
      this.renderer.setSize(width, height);
    }

    getCanvas(): HTMLCanvasElement | null {
      return this.renderer.domElement;
    }

    render(): void {
      this.renderer.render(this.scene, this.camera);
    }
  }
  ```

#### 2.3 Create index file
- [ ] Create `src/rendering/threejs/index.ts`
- [ ] Export Three.js implementations

---

### 3. Update TextureAdapter to Use Rendering Interface

#### 3.1 Refactor TextureAdapter
- [ ] Update `src/adapters/TextureAdapter.ts` to use `RenderingEngine`
  ```typescript
  import { RenderingEngine, TextureHandle } from '@/rendering/interfaces';
  import { Image } from '@/domain/models/Image';

  export class TextureAdapter {
    constructor(private renderingEngine: RenderingEngine) {}

    createTexture(image: Image): TextureHandle {
      return this.renderingEngine.createTexture(image);
    }

    // Keep cache if needed
  }
  ```

#### 3.2 Update ImageScene to use abstractions
- [ ] Refactor `src/ImageScene.tsx` to use `CanvasRenderer`
- [ ] Remove direct Three.js imports (except in setup)
- [ ] Use rendering interfaces for all operations

---

### 4. Create Rendering Provider

#### 4.1 Create rendering context
- [ ] Create `src/rendering/RenderingContext.tsx`
  ```typescript
  import { createContext, useContext, ReactNode } from 'react';
  import { RenderingEngine } from './interfaces';

  const RenderingContext = createContext<RenderingEngine | null>(null);

  export function RenderingProvider({
    engine,
    children
  }: {
    engine: RenderingEngine;
    children: ReactNode;
  }) {
    return (
      <RenderingContext.Provider value={engine}>
        {children}
      </RenderingContext.Provider>
    );
  }

  export function useRenderingEngine(): RenderingEngine {
    const engine = useContext(RenderingContext);
    if (!engine) {
      throw new Error('useRenderingEngine must be used within RenderingProvider');
    }
    return engine;
  }
  ```

#### 4.2 Update App.tsx to provide rendering engine
- [ ] Wrap app with `RenderingProvider`
- [ ] Pass Three.js engine as default

---

## Week 2: Parameter Plugin System

### 5. Create Parameter Type System

#### 5.1 Define parameter interfaces
- [ ] Create `src/parameters/` directory
- [ ] Create `src/parameters/types.ts`
  ```typescript
  export interface ParameterDefinition<T = any> {
    readonly type: string;
    readonly label: string;
    readonly defaultValue: T;
    validate?(value: T): boolean;
    serialize?(value: T): any;
    deserialize?(data: any): T;
  }

  export interface ParameterRenderer<T = any> {
    canRender(param: ParameterDefinition): boolean;
    render(
      param: ParameterDefinition<T>,
      value: T,
      onChange: (value: T) => void
    ): React.ReactNode;
  }

  export interface UniformConverter<T = any> {
    canConvert(value: T): boolean;
    toUniform(value: T): UniformValue;
  }
  ```

#### 5.2 Create parameter registry
- [ ] Create `src/parameters/ParameterRegistry.ts`
  ```typescript
  export class ParameterRegistry {
    private renderers = new Map<string, ParameterRenderer>();
    private converters: UniformConverter[] = [];

    registerRenderer(type: string, renderer: ParameterRenderer): void {
      this.renderers.set(type, renderer);
    }

    registerConverter(converter: UniformConverter): void {
      this.converters.push(converter);
    }

    getRenderer(type: string): ParameterRenderer | undefined {
      return this.renderers.get(type);
    }

    convertToUniform(value: any): UniformValue {
      const converter = this.converters.find(c => c.canConvert(value));
      if (!converter) {
        throw new Error(`No converter found for value: ${value}`);
      }
      return converter.toUniform(value);
    }
  }
  ```

---

### 6. Implement Built-in Parameter Types

#### 6.1 Create range parameter
- [ ] Create `src/parameters/types/RangeParameter.ts`
  ```typescript
  export interface RangeParameterDefinition extends ParameterDefinition<number> {
    type: 'range';
    min: number;
    max: number;
    step: number;
  }

  export function createRangeParameter(
    label: string,
    defaultValue: number,
    min: number,
    max: number,
    step: number
  ): RangeParameterDefinition {
    return {
      type: 'range',
      label,
      defaultValue,
      min,
      max,
      step,
      validate: (value) => value >= min && value <= max,
    };
  }
  ```

#### 6.2 Create range renderer
- [ ] Create `src/parameters/renderers/RangeRenderer.tsx`
  ```typescript
  import { ParameterRenderer } from '../types';
  import { RangeParameterDefinition } from '../types/RangeParameter';
  import { Slider } from '@/components/ui/slider';

  export class RangeRenderer implements ParameterRenderer<number> {
    canRender(param: ParameterDefinition): boolean {
      return param.type === 'range';
    }

    render(
      param: RangeParameterDefinition,
      value: number,
      onChange: (value: number) => void
    ): React.ReactNode {
      return (
        <div>
          <label>{param.label}</label>
          <Slider
            min={param.min}
            max={param.max}
            step={param.step}
            value={[value]}
            onValueChange={([v]) => onChange(v)}
          />
          <span>{value.toFixed(2)}</span>
        </div>
      );
    }
  }
  ```

#### 6.3 Create other parameter types
- [ ] Create `src/parameters/types/ImageParameter.ts`
- [ ] Create `src/parameters/types/ColorParameter.ts`
- [ ] Create `src/parameters/types/BooleanParameter.ts`
- [ ] Create `src/parameters/types/Vec2Parameter.ts`

#### 6.4 Create corresponding renderers
- [ ] Create `src/parameters/renderers/ImageRenderer.tsx`
- [ ] Create `src/parameters/renderers/ColorRenderer.tsx`
- [ ] Create `src/parameters/renderers/BooleanRenderer.tsx`
- [ ] Create `src/parameters/renderers/Vec2Renderer.tsx`

---

### 7. Create Uniform Converters

#### 7.1 Create converters for each type
- [ ] Create `src/parameters/converters/` directory
- [ ] Create `NumberConverter.ts`
  ```typescript
  export class NumberConverter implements UniformConverter<number> {
    canConvert(value: any): boolean {
      return typeof value === 'number';
    }

    toUniform(value: number): UniformValue {
      return value;
    }
  }
  ```
- [ ] Create `ColorConverter.ts`
  ```typescript
  export class ColorConverter implements UniformConverter<Color> {
    canConvert(value: any): boolean {
      return value instanceof Color;
    }

    toUniform(value: Color): UniformValue {
      return value.toFloat32Array();
    }
  }
  ```
- [ ] Create `ImageConverter.ts`
- [ ] Create `BooleanConverter.ts`
- [ ] Create `ArrayConverter.ts` (for vec2, vec3, vec4)

#### 7.2 Create converter registry
- [ ] Create `src/parameters/converters/index.ts`
- [ ] Register all built-in converters

---

### 8. Update ShaderControls to Use Plugin System

#### 8.1 Refactor ShaderControls
- [ ] Update `src/ClientApp/shader-controls.tsx` to use `ParameterRegistry`
  ```typescript
  export function ShaderControls({ effect, values, onChange }: Props) {
    const paramRegistry = useParameterRegistry();

    return (
      <div className="space-y-6">
        {Object.entries(effect.inputs).map(([key, input]) => {
          const renderer = paramRegistry.getRenderer(input.type);
          if (!renderer) {
            console.warn(`No renderer for parameter type: ${input.type}`);
            return null;
          }

          return (
            <div key={key}>
              {renderer.render(input, values[key], (value) => onChange(key, value))}
            </div>
          );
        })}
      </div>
    );
  }
  ```

#### 8.2 Create useParameterRegistry hook
- [ ] Create `src/parameters/useParameterRegistry.ts`
- [ ] Provide registry via context

---

## Week 3: Shader Concerns Separation

### 9. Separate Shader Definition from UI

#### 9.1 Create shader metadata types
- [ ] Create `src/lib/shaders/metadata/` directory
- [ ] Create `ShaderMetadata.ts`
  ```typescript
  export interface ShaderMetadata {
    name: string;
    description: string;
    category: 'basic' | 'artistic' | 'distortion' | 'color';
    icon?: string;
    tags?: string[];
  }
  ```

#### 9.2 Create shader configuration types
- [ ] Create `ShaderConfiguration.ts`
  ```typescript
  export interface ShaderConfiguration {
    metadata: ShaderMetadata;
    parameters: ParameterDefinition[];
    glsl: GLSLDefinition;
  }

  export interface GLSLDefinition {
    uniforms: UniformDefinitions;
    vertexShader?: string;
    fragmentShader: string;
  }
  ```

#### 9.3 Update shader effect structure
- [ ] Separate metadata from GLSL code
- [ ] Separate parameters from UI concerns
- [ ] Create pure shader definitions

---

### 10. Create Shader Factory

#### 10.1 Create shader factory
- [ ] Create `src/lib/shaders/ShaderFactory.ts`
  ```typescript
  export class ShaderFactory {
    constructor(
      private renderingEngine: RenderingEngine,
      private paramRegistry: ParameterRegistry
    ) {}

    createShader(config: ShaderConfiguration): CompiledShader {
      // Validate parameters
      // Compile GLSL
      // Return compiled shader handle
    }

    getUIDefinition(config: ShaderConfiguration): UIDefinition {
      // Extract UI-specific information
      // Return structure for rendering controls
    }
  }
  ```

#### 10.2 Update shader library to use factory
- [ ] Refactor shader effects to new structure
- [ ] Update shader library registry
- [ ] Ensure backward compatibility

---

### 11. Update useShader Hook

#### 11.1 Refactor useShader
- [ ] Use `ShaderFactory` instead of direct builder
- [ ] Use `ParameterRegistry` for conversions
- [ ] Remove hardcoded logic

---

## Week 4: Integration & Testing

### 12. Integration

#### 12.1 Wire up all new systems
- [ ] Update `App.tsx` to provide all contexts
  ```typescript
  <RenderingProvider engine={threeJSEngine}>
    <ParameterRegistryProvider registry={paramRegistry}>
      <ClientApp />
    </ParameterRegistryProvider>
  </RenderingProvider>
  ```

#### 12.2 Update ImageScene
- [ ] Use `useRenderingEngine` hook
- [ ] Remove direct Three.js dependencies from component logic

#### 12.3 Verify all features work
- [ ] Test all 16 shader effects
- [ ] Test parameter controls
- [ ] Test image upload/export
- [ ] Test aspect ratio changes

---

### 13. Testing

#### 13.1 Unit tests for new abstractions
- [ ] Test `RenderingEngine` interface compliance
- [ ] Test `ParameterRegistry`
- [ ] Test parameter renderers
- [ ] Test uniform converters

#### 13.2 Integration tests
- [ ] Test rendering adapter with real shaders
- [ ] Test parameter plugin system end-to-end
- [ ] Test shader factory

#### 13.3 Component tests
- [ ] Test updated ShaderControls
- [ ] Test ImageScene with new abstractions

---

### 14. Documentation

#### 14.1 Update architecture docs
- [ ] Update `ARCHITECTURE.md` with Phase 2 changes
- [ ] Document rendering abstraction
- [ ] Document parameter plugin system
- [ ] Add examples for extending system

#### 14.2 Create migration guide
- [ ] Document breaking changes
- [ ] Provide upgrade path
- [ ] Add examples

#### 14.3 Update README
- [ ] Document new extensibility features
- [ ] Update "Adding a Shader" section
- [ ] Update "Adding a Parameter Type" section

---

### 15. Cleanup & Optimization

#### 15.1 Remove deprecated code
- [ ] Remove old shader builder if replaced
- [ ] Remove unused imports
- [ ] Clean up commented code

#### 15.2 Performance optimization
- [ ] Optimize rendering loop
- [ ] Add debouncing where needed
- [ ] Profile and optimize hot paths

#### 15.3 Final verification
- [ ] Run full test suite - all passing
- [ ] Manual testing of all features
- [ ] Check for console errors
- [ ] Verify bundle size hasn't increased significantly
- [ ] Performance testing - no regressions

---

## Success Criteria

- [ ] Three.js fully abstracted behind `RenderingEngine` interface
- [ ] Could theoretically swap to different rendering backend
- [ ] Parameter types are extensible via plugin system
- [ ] Adding new parameter type requires no changes to core code
- [ ] Shader definitions separated from UI concerns
- [ ] All existing features work unchanged
- [ ] All tests passing
- [ ] No type safety violations
- [ ] Documentation updated

---

## Benefits After Phase 2

### 1. Rendering Abstraction
- ✅ Can swap rendering library (e.g., PixiJS, Babylon.js)
- ✅ Easier to test without Three.js
- ✅ Cleaner separation of concerns

### 2. Parameter Plugin System
- ✅ Easy to add new parameter types
- ✅ Third-party extensions possible
- ✅ No shotgun surgery for new types
- ✅ Consistent parameter handling

### 3. Shader Separation
- ✅ Shader definitions UI-agnostic
- ✅ Can use shaders in non-React contexts
- ✅ Better testability
- ✅ Clearer responsibilities

---

## Estimated Time

- **Week 1:** Rendering abstraction - 12-16 hours
- **Week 2:** Parameter plugin system - 12-16 hours
- **Week 3:** Shader separation - 10-14 hours
- **Week 4:** Integration & testing - 8-12 hours

**Total:** 42-58 hours over 2-4 weeks

---

## Notes

- Work on feature branch: `refactor/phase-2-architecture`
- Commit frequently
- Run tests after each major change
- Keep PR reviewable (may split into multiple PRs)
- Maintain backward compatibility where possible

---

## Risk Mitigation

- Start with rendering abstraction (highest risk)
- Keep old code alongside new during transition
- Add feature flags if needed
- Extensive testing at each step
- Can pause and ship Phase 2 incrementally if needed
