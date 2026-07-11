# Luminframe - Architecture Audit

**Date:** 2025-12-28
**Auditor:** Claude Code
**Project:** Luminframe - WebGL-based Image Editor
**Focus:** Architectural patterns, boundaries, and design decisions

---

## Executive Summary

Luminframe implements a **three-layer architecture** with a shader effect system at its core. While the overall design demonstrates strong separation of concerns and extensibility, several architectural issues undermine modularity, testability, and maintainability.

**Architecture Quality: 6.5/10**

### Strengths
- **Plugin architecture** for shader effects enables easy addition of new effects
- **Clear layer separation** between UI, business logic, and rendering
- **Declarative shader configuration** using fluent builder pattern
- **Type-driven design** with TypeScript providing compile-time safety
- **Composition over inheritance** for React components

### Critical Architectural Issues
- **Broken abstraction boundaries** - Three.js types leak into UI layer
- **Implicit dependencies** - Resolution logic hidden in hook implementation
- **Misplaced modules** - Business logic in wrong architectural layers
- **Tight coupling** between UI and rendering concerns
- **No domain model** - Data structures tied to implementation details

---

## Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [Architectural Layers Analysis](#architectural-layers-analysis)
3. [Dependency Flow & Violations](#dependency-flow--violations)
4. [Abstraction Boundaries](#abstraction-boundaries)
5. [Cohesion & Coupling Analysis](#cohesion--coupling-analysis)
6. [Extensibility & Scalability](#extensibility--scalability)
7. [Architectural Patterns](#architectural-patterns)
8. [Critical Architectural Smells](#critical-architectural-smells)
9. [Recommendations](#recommendations)

---

## Current Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│  (React Components: ClientApp, ImageScene, Controls)        │
├─────────────────────────────────────────────────────────────┤
│                   Business Logic Layer                       │
│     (Hooks: useShader, useWindowSize)                       │
├─────────────────────────────────────────────────────────────┤
│                   Domain/Service Layer                       │
│  (Shader Library, Builder, Effect Definitions)              │
├─────────────────────────────────────────────────────────────┤
│                   Infrastructure Layer                       │
│        (Three.js, WebGL, React Three Fiber)                 │
└─────────────────────────────────────────────────────────────┘
```

### Module Organization

```
src/
├── ClientApp/          # Application Shell (Presentation)
├── components/         # UI Components (Presentation)
├── hooks/              # Business Logic (MIXED - contains utils too)
├── lib/
│   └── shaders/        # Shader Domain (Domain/Service)
├── shaders/            # Shader Infrastructure (Service)
├── types/              # Type Definitions (Cross-cutting)
└── ImageScene.tsx      # Rendering Engine (Presentation + Infrastructure)
```

**Issue:** Module boundaries unclear - `hooks/` contains non-hook utilities, presentation layer mixed with infrastructure.

---

## Architectural Layers Analysis

### 1. Presentation Layer

**Components:**
- `ClientApp.tsx` - Application container
- `ImageScene.tsx` - Canvas rendering container
- `shader-controls.tsx` - Dynamic parameter UI
- `image-upload.tsx` - File upload component
- `effect-picker.tsx` - Effect selection UI
- UI components (`button`, `slider`, etc.)

**Responsibilities:**
- User interaction
- Layout and styling
- Event handling
- State management (local)

**Issues:**
- `ClientApp` violates **Single Responsibility Principle** (SRP) - handles layout, state, AND orchestration
- `ImageScene` mixes presentation (Canvas wrapper) with infrastructure (Three.js integration)
- Direct DOM manipulation breaks React paradigm
- No separation between smart/container components and presentational components

**Dependency Direction:** ✅ Correct (depends on business logic layer)

---

### 2. Business Logic Layer

**Components:**
- `useShader.ts` - Shader state management
- `useWindowSize.ts` - Window dimension tracking
- `shaderRecordBuilder.ts` - **MISPLACED** (should be in service layer)

**Responsibilities:**
- Application state management
- Business rules enforcement
- Data transformation
- Coordination between UI and services

**Issues:**
- **`shaderRecordBuilder.ts` is NOT a hook** - pure utility functions don't belong in `/hooks`
- `useShader` performs **hidden side effects** (injects resolution, resets imageTexture)
- State management **tightly coupled** to shader library structure
- No abstraction over hook implementation details

**Dependency Direction:** ⚠️ Mixed
- ✅ Depends on domain layer (shader library)
- ❌ Leaks Three.js types upward (Texture)
- ❌ Returns implementation details (resolution injection)

---

### 3. Domain/Service Layer

**Components:**
- `lib/shaders/` - Shader effect definitions
- `shaders/shaderBuilder.ts` - GLSL code generator
- Shader effect registry
- GLSL utility functions

**Responsibilities:**
- Shader effect domain model
- GLSL code generation
- Effect configuration
- Reusable shader utilities

**Issues:**
- **No domain model separation** - effects defined with UI concerns (input labels)
- Shader effects mix **three concerns**: GLSL types, runtime values, UI metadata
- `shaderBuilder` mixes string concatenation with domain logic
- **No validation layer** for shader definitions
- Effect registry is just a Record (no encapsulation)

**Dependency Direction:** ✅ Mostly correct (no upward dependencies)

---

### 4. Infrastructure Layer

**Components:**
- Three.js
- React Three Fiber
- WebGL

**Responsibilities:**
- 3D rendering
- Texture management
- Shader compilation
- GPU interaction

**Issues:**
- **No abstraction over Three.js** - types leak into entire application
- `Texture` type exposed to React components
- No adapter/wrapper around react-three-fiber
- Canvas access via DOM query instead of abstraction

**Dependency Direction:** ❌ Violated
- Infrastructure types (`Texture`) flow upward to presentation
- No dependency inversion (UI depends directly on Three.js)

---

## Dependency Flow & Violations

### Intended Dependency Flow

```
Presentation → Business Logic → Domain → Infrastructure
     ↓              ↓              ↓
   Types  ←────  Types  ←────  Types
```

### Actual Dependency Flow

```
┌──────────────┐
│  ClientApp   │────────┐
└──────┬───────┘        │
       │                ├─→ Three.js Texture ❌
       ↓                │
┌──────────────┐        │
│  useShader   │────────┘
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Shader Lib   │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ Three.js     │
└──────────────┘
```

**Critical Issues:**
1. **Infrastructure leakage** - `Texture` type from Three.js flows up to ClientApp
2. **Circular knowledge** - UI knows about imageTexture, imageTextureTwo (implementation detail)
3. **Hidden dependencies** - `resolution` injected by useShader without explicit contract

### Dependency Violations

| Violation | Location | Impact |
|-----------|----------|--------|
| Three.js → ClientApp | `ClientApp.tsx:14` | UI coupled to rendering library |
| Three.js → Controls | `shader-controls.tsx:6` | Controls know about Texture type |
| Three.js → ImageUpload | `image-upload.tsx:4` | File upload coupled to 3D library |
| DOM → ClientApp | `ClientApp.tsx:27` | Breaks React abstraction |
| useShader magic | `useShader.ts:54` | Hidden resolution injection |

---

## Abstraction Boundaries

### 1. Shader Effect Abstraction

**Current Interface:**
```typescript
interface ShaderEffect {
  name: string;
  declarationVars: { [k: string]: string };     // GLSL types
  defaultValues: { [k: string]: any };          // Runtime values
  inputs: { [k: string]: ShaderInputDefinition }; // UI metadata
  getBody: () => string;                         // GLSL code
}
```

**Problems:**
- **Leaky**: Exposes GLSL types (`declarationVars`) to consumers
- **Mixed concerns**: UI (inputs), domain (values), infrastructure (GLSL)
- **No encapsulation**: Direct property access instead of methods
- **Unclear contract**: What guarantees does `getBody()` provide?

**Better Abstraction:**
```typescript
interface ShaderEffect {
  readonly metadata: EffectMetadata;
  compile(params: EffectParameters): CompiledShader;
  getParameterSchema(): ParameterSchema;
  validate(params: EffectParameters): ValidationResult;
}
```

---

### 2. Image Handling Abstraction

**Current:**
- Components handle `Texture` objects directly
- File → Texture conversion in UI component
- Image metadata in `userData` (untyped)

**Missing Abstractions:**
1. **Image domain object**
   ```typescript
   interface ImageSource {
     readonly id: string;
     readonly dimensions: Dimensions;
     readonly data: ImageData;
   }
   ```

2. **Image loading service**
   ```typescript
   interface ImageLoader {
     loadFromFile(file: File): Promise<ImageSource>;
     loadFromUrl(url: string): Promise<ImageSource>;
   }
   ```

3. **Rendering adapter**
   ```typescript
   interface RenderingAdapter {
     createTexture(image: ImageSource): RenderTexture;
     render(effect: ShaderEffect, textures: RenderTexture[]): void;
   }
   ```

---

### 3. Shader Parameter Abstraction

**Current:**
```typescript
type ShaderInputVars = Record<string,
  string | number | number[] | Texture | null | Float32Array | boolean
>
```

**Problems:**
- **Too loose**: Any string key, no type safety per shader
- **Implementation detail**: Includes `Texture` (infrastructure type)
- **No validation**: Can pass wrong types at runtime
- **No semantic meaning**: Is `[1920, 1080]` a position or resolution?

**Better Abstraction:**
```typescript
interface ShaderParameters<T extends ShaderEffect> {
  get<K extends keyof T>(key: K): T[K];
  set<K extends keyof T>(key: K, value: T[K]): void;
  validate(): ValidationResult;
  toGLSLUniforms(): UniformValues;
}
```

---

## Cohesion & Coupling Analysis

### Cohesion Issues

#### 1. **ClientApp.tsx - Low Cohesion**

**Responsibilities:**
- Layout structure
- Shader selection state
- Aspect ratio state
- Image save orchestration
- DOM manipulation
- Child component coordination

**Cohesion Score: 3/10** (violates SRP)

**Should be split into:**
- `AppLayout` - Layout structure
- `EffectWorkspace` - Shader and parameter management
- `useImageSave` - Image save logic
- `useCanvasRef` - Canvas access abstraction

---

#### 2. **shaderRecordBuilder.ts - Medium Cohesion**

**Responsibilities:**
- Shader record creation
- Variable creation helpers
- Type conversion (vec3 → Float32Array)
- Implicit resolution injection

**Cohesion Score: 6/10**

**Issues:**
- Mixes data structure creation with type conversion
- Adds implicit `resolution` field (hidden side effect)
- Should split type conversion into separate module

---

#### 3. **useShader.ts - Low Cohesion**

**Responsibilities:**
- Effect selection
- State management
- Shader compilation
- Resolution calculation
- imageTexture reset logic
- Default value merging

**Cohesion Score: 4/10**

**Issues:**
- Mixes state management, calculation, and orchestration
- Hidden behaviors (resolution injection, imageTexture reset)
- Should extract resolution logic and shader compilation

---

### Coupling Issues

#### 1. **Tight Coupling: UI ↔ Three.js**

**Files Affected:**
- `ClientApp.tsx` - imports `TextureLoader`
- `shader-controls.tsx` - imports `Texture` type
- `image-upload.tsx` - creates `Texture` objects
- `ColorPicker.tsx` - works with `Float32Array` (Three.js internal)

**Coupling Level:** 🔴 High

**Impact:**
- Cannot swap rendering library
- Cannot test UI without Three.js
- Cannot reuse UI components in different context

---

#### 2. **Tight Coupling: Shader Effects ↔ UI**

**Evidence:**
```typescript
// Effect definition contains UI metadata
inputs: {
  intensity: { type: 'range', min: 0, max: 1, step: 0.01, label: 'Intensity' }
}
```

**Coupling Level:** 🟡 Medium

**Impact:**
- Cannot use shader effects outside React UI
- Cannot change UI framework without changing effects
- Effect definitions bloated with non-domain concerns

---

#### 3. **Hidden Coupling: Resolution Logic**

**Locations:**
- `useShader.ts` - Injects resolution from image or window
- `ImageScene.tsx` - Uses resolution for aspect ratio
- `useWindowSize.ts` - Provides fallback

**Coupling Level:** 🟡 Medium

**Impact:**
- Changes to resolution logic require coordinating 3 files
- Implicit contract between hook and components
- Hard to understand full resolution calculation

---

## Extensibility & Scalability

### What's Easy to Extend

✅ **Adding new shader effects**
```typescript
// 1. Create effect file
export const myEffect = createShaderRecord({
  name: "My Effect",
  variables: [...],
  body: `...GLSL...`
});

// 2. Register in index.ts
export const shaderLibrary = {
  myEffect,
  // ...
};
```
**Score: 9/10** - Very well designed plugin architecture

---

✅ **Adding new shader parameters**
```typescript
createShaderVariable('newParam').asRange('Label', 0.5, 0, 1, 0.01)
```
**Score: 8/10** - Fluent API makes it easy

---

✅ **Adding new UI components**
- shadcn/ui provides consistent component library
- Tailwind enables rapid styling

**Score: 8/10**

---

### What's Hard to Extend

❌ **Adding new parameter types**

**Current:** Requires changes in:
1. `ShaderInputDefinition` type
2. `createShaderVariable` helper
3. `shader-controls.tsx` rendering logic
4. `ImageScene.tsx` uniform conversion

**Score: 3/10** - Requires coordinating 4+ files

**Why:** No parameter type plugin system, switch statements everywhere

---

❌ **Supporting different rendering backends**

**Blockers:**
- Three.js types throughout codebase
- No rendering adapter interface
- Direct Three.js API calls in ImageScene
- Texture type in domain model

**Score: 1/10** - Would require major refactoring

---

❌ **Adding multi-image effects (3+ images)**

**Current:** System hardcoded for max 2 images (`imageTexture`, `imageTextureTwo`)

**Requires changes in:**
- `ShaderInputVars` type
- `ClientApp` save logic
- `shader-controls` rendering
- Effect definitions

**Score: 2/10** - Architecture not designed for N images

---

❌ **Server-side rendering / Node.js usage**

**Blockers:**
- Direct window access
- Browser-only Three.js
- DOM manipulation
- No SSR consideration

**Score: 1/10** - Impossible without major refactoring

---

### Scalability Concerns

#### 1. **Shader Count Scalability**

**Current:** 16 effects, flat list

**Issues at scale:**
- No categorization
- No search/filtering
- All loaded eagerly
- No lazy loading

**Recommendation:** Category system, code splitting

---

#### 2. **State Management Scalability**

**Current:** Local state in ClientApp

**Issues at scale:**
- No undo/redo
- Cannot persist state
- No state history
- Hard to implement multi-tab sync

**Recommendation:** Consider state management library or implement command pattern

---

#### 3. **Performance Scalability**

**Issues:**
- Shader recompiled on every parameter change (key prop)
- No debouncing on slider drag
- No Web Worker for heavy computation
- No progressive rendering

**Recommendation:** Optimize uniform updates, add debouncing

---

## Architectural Patterns

### Patterns Used Well

#### 1. ✅ **Builder Pattern** - Shader Configuration

```typescript
createShaderRecord({
  variables: [
    createShaderVariable('intensity').asRange('Intensity', 0.5, 0, 1, 0.01),
  ],
  body: `...`
})
```

**Benefits:**
- Fluent, readable API
- Type-safe construction
- Encapsulates complexity
- Reduces boilerplate

---

#### 2. ✅ **Registry Pattern** - Shader Library

```typescript
export const shaderLibrary: Record<ShaderType, ShaderEffect> = {
  blackAndWhite,
  colorTint,
  // ...
};
```

**Benefits:**
- Central registration point
- Type-safe lookup
- Easy to extend
- Clear plugin boundary

---

#### 3. ✅ **Hooks Pattern** - React State Management

- `useShader` - Effect state
- `useWindowSize` - Window dimensions
- Separates logic from presentation

**Benefits:**
- Reusable logic
- Testable in isolation
- Composition over inheritance

---

### Patterns Needed

#### 1. ❌ **Adapter Pattern** - Rendering Abstraction

**Current:** Direct Three.js usage
**Need:** Adapter to abstract rendering library

```typescript
interface RenderingEngine {
  createTexture(image: ImageData): TextureHandle;
  compileShader(code: string): ShaderHandle;
  render(shader: ShaderHandle, uniforms: Uniforms): void;
}

class ThreeJSAdapter implements RenderingEngine {
  // Implementation
}
```

---

#### 2. ❌ **Strategy Pattern** - Parameter Type Handling

**Current:** Switch statements in render logic
**Need:** Strategy per parameter type

```typescript
interface ParameterRenderer {
  canRender(param: Parameter): boolean;
  render(param: Parameter, onChange: Handler): ReactNode;
}

class RangeParameterRenderer implements ParameterRenderer { }
class ImageParameterRenderer implements ParameterRenderer { }
```

---

#### 3. ❌ **Facade Pattern** - Shader System API

**Current:** Multiple exports, complex imports
**Need:** Single facade for shader system

```typescript
class ShaderSystem {
  registerEffect(effect: ShaderEffect): void;
  getEffect(type: string): ShaderEffect;
  compileEffect(type: string, params: Parameters): CompiledShader;
  validate(type: string, params: Parameters): ValidationResult;
}
```

---

#### 4. ❌ **Observer Pattern** - Parameter Changes

**Current:** Direct callback props
**Need:** Observable parameter changes for undo/redo

```typescript
class ParameterStore {
  subscribe(listener: (params: Parameters) => void): Unsubscribe;
  update(key: string, value: any): void;
  undo(): void;
  redo(): void;
}
```

---

#### 5. ❌ **Factory Pattern** - Shader Variable Creation

**Current:** Helper functions
**Need:** Proper factory with validation

```typescript
class ShaderVariableFactory {
  createRange(config: RangeConfig): RangeVariable;
  createImage(config: ImageConfig): ImageVariable;
  createVector(config: VectorConfig): VectorVariable;
}
```

---

## Critical Architectural Smells

### 1. **Anemic Domain Model**

**Symptom:** Data structures with no behavior

```typescript
interface ShaderEffect {
  name: string;
  declarationVars: { [k: string]: string };
  // ... just data, no methods
}
```

**Impact:**
- Business logic scattered across files
- No encapsulation
- Hard to maintain invariants
- Procedural rather than object-oriented

**Severity:** 🔴 High

---

### 2. **Primitive Obsession**

**Symptom:** Using primitives instead of domain objects

**Examples:**
- `[number, number]` for dimensions (should be `Dimensions` object)
- `string` for shader type (should be `ShaderType` value object)
- `Float32Array` for colors (should be `Color` object)
- `any` for uniform values (should be `UniformValue` union)

**Impact:**
- No type safety
- No validation
- No semantic meaning
- Easy to pass wrong values

**Severity:** 🟡 Medium

---

### 3. **Feature Envy**

**Location:** `useShader.ts:54`

```typescript
resolution: [
  imageOne?.userData?.width || width,
  imageOne?.userData?.height || height
]
```

**Symptom:** Hook reaching into Texture's userData
**Impact:** Hook knows too much about Texture internals

**Severity:** 🟡 Medium

---

### 4. **Shotgun Surgery**

**Example:** Adding a new parameter type requires changes in:
1. Type definitions (`types/shader.ts`)
2. Builder helpers (`shaderRecordBuilder.ts`)
3. Control rendering (`shader-controls.tsx`)
4. Uniform conversion (`ImageScene.tsx`)
5. Default value handling (`useShader.ts`)

**Impact:**
- High cost of change
- Easy to miss required changes
- Fragile system

**Severity:** 🔴 High

---

### 5. **Inappropriate Intimacy**

**Example:** UI components know about:
- `imageTexture` vs `imageTextureTwo` naming
- `Float32Array` internal representation
- Three.js `Texture` type
- Resolution calculation logic

**Impact:**
- Tight coupling
- Hard to change internals
- Components not reusable

**Severity:** 🟡 Medium

---

### 6. **Magic Behavior**

**Locations:**
- `useShader` auto-injects `resolution` field
- `shaderRecordBuilder` auto-adds `resolution` to declarationVars
- `imageTexture` set to `null` then overridden in return

**Impact:**
- Surprising behavior
- Hard to debug
- Violates principle of least astonishment

**Severity:** 🟡 Medium

---

### 7. **Lack of Ports and Adapters**

**Symptom:** No abstraction between core logic and external systems

**Missing ports:**
- No rendering port (direct Three.js dependency)
- No storage port (no persistence layer)
- No validation port
- No logger port

**Impact:**
- Cannot test without infrastructure
- Cannot swap implementations
- Tight coupling to external libraries

**Severity:** 🔴 High (for testability)

---

## Recommendations

### Immediate (High Impact, Low Effort)

#### 1. **Reorganize Module Structure**

**Move:**
- `hooks/shaderRecordBuilder.ts` → `lib/shaderConfig.ts`
- Separate smart/dumb components
- Extract domain models to `/domain`

**Benefit:** Clearer architecture, easier navigation

---

#### 2. **Introduce Image Domain Object**

```typescript
// domain/Image.ts
export class Image {
  constructor(
    public readonly id: string,
    public readonly dimensions: Dimensions,
    private readonly data: ImageData
  ) {}

  getAspectRatio(): number {
    return this.dimensions.width / this.dimensions.height;
  }

  static fromFile(file: File): Promise<Image> { }
}
```

**Benefit:** Remove Three.js from UI layer

---

#### 3. **Extract Resolution Logic**

```typescript
// services/ResolutionCalculator.ts
export class ResolutionCalculator {
  calculate(image: Image | null, fallback: Dimensions): Dimensions {
    return image?.dimensions ?? fallback;
  }
}
```

**Benefit:** Explicit, testable, no hidden behavior

---

### Short-term (High Impact, Medium Effort)

#### 4. **Implement Rendering Adapter**

```typescript
// adapters/ThreeJSRenderingAdapter.ts
export class ThreeJSRenderingAdapter implements RenderingAdapter {
  createTexture(image: Image): TextureHandle { }
  render(shader: CompiledShader, textures: TextureHandle[]): void { }
}
```

**Benefit:** Decouple UI from Three.js, enable testing

---

#### 5. **Separate Shader Concerns**

```typescript
// domain/ShaderEffect.ts
export class ShaderEffect {
  constructor(
    private readonly config: EffectConfig,
    private readonly glsl: GLSLCode,
    private readonly schema: ParameterSchema
  ) {}
}

// ui/EffectParameterUI.ts
export class EffectParameterUI {
  static render(schema: ParameterSchema): ReactNode { }
}
```

**Benefit:** Effect definitions UI-agnostic, reusable

---

#### 6. **Add Parameter Type Plugin System**

```typescript
// parameters/ParameterTypeRegistry.ts
export class ParameterTypeRegistry {
  register(type: string, handler: ParameterHandler): void;
  render(param: Parameter, onChange: Handler): ReactNode;
  toUniform(param: Parameter, value: any): UniformValue;
}
```

**Benefit:** Easy to add new parameter types

---

### Long-term (Transformative)

#### 7. **Implement Hexagonal Architecture**

```
┌─────────────────────────────────────────┐
│           Presentation Layer             │
│  (React Components - UI Adapters)       │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Application Layer               │
│   (Use Cases, Application Services)     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│            Domain Layer                  │
│  (ShaderEffect, Image, Parameters)      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│      Infrastructure Adapters             │
│ (Three.js, File System, Local Storage)  │
└─────────────────────────────────────────┘
```

**Benefit:** Complete separation of concerns, testability

---

#### 8. **Implement Command Pattern for State**

```typescript
// commands/UpdateParameterCommand.ts
export class UpdateParameterCommand implements Command {
  execute(): void;
  undo(): void;
  redo(): void;
}
```

**Benefit:** Undo/redo, state history, time travel debugging

---

#### 9. **Add Value Objects**

```typescript
export class Dimensions {
  constructor(
    public readonly width: number,
    public readonly height: number
  ) {
    if (width <= 0 || height <= 0) throw new Error();
  }

  getAspectRatio(): number { }
  scale(factor: number): Dimensions { }
}

export class Color {
  constructor(r: number, g: number, b: number) { }
  toFloat32Array(): Float32Array { }
  static fromHex(hex: string): Color { }
}
```

**Benefit:** Type safety, validation, semantic meaning

---

## Conclusion

Luminframe's architecture demonstrates strong foundations with a well-designed shader plugin system. However, **abstraction boundary violations** and **tight coupling** to infrastructure limit testability and extensibility.

### Priority Actions

1. **Decouple UI from Three.js** (introduce rendering adapter)
2. **Reorganize modules** (fix misplaced files)
3. **Introduce domain models** (Image, Dimensions, Color)
4. **Extract hidden logic** (resolution calculation, parameter handling)
5. **Add missing patterns** (Strategy for parameters, Factory for variables)

### Architecture Evolution Path

**Phase 1 (1-2 weeks):** Module reorganization + domain models
**Phase 2 (2-4 weeks):** Rendering adapter + parameter plugin system
**Phase 3 (1-2 months):** Hexagonal architecture refactoring

This evolution will transform Luminframe from a **tightly-coupled monolith** into a **modular, testable, extensible system** while maintaining all current functionality.

---

## Appendix: Architectural Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Abstraction Level | Low (2/5) | High (4/5) |
| Layer Separation | Medium (3/5) | High (5/5) |
| Testability | Low (2/5) | High (4/5) |
| Extensibility (Effects) | High (4/5) | High (5/5) |
| Extensibility (Parameters) | Low (2/5) | High (4/5) |
| Coupling | High (4/5) | Low (2/5) |
| Cohesion | Medium (3/5) | High (4/5) |
| **Overall** | **6.5/10** | **9/10** |

---

**End of Architecture Audit**
