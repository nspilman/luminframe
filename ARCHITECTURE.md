# Luminframe Architecture Guide

**Version:** 1.0
**Last Updated:** 2025-12-28
**Phase:** Phase 1 Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Architectural Layers](#architectural-layers)
3. [Directory Structure](#directory-structure)
4. [Domain Models](#domain-models)
5. [Core Concepts](#core-concepts)
6. [Data Flow](#data-flow)
7. [Key Patterns](#key-patterns)
8. [Adding New Features](#adding-new-features)
9. [Testing Strategy](#testing-strategy)
10. [Performance Considerations](#performance-considerations)

---

## Overview

Luminframe follows a **layered architecture** with clear separation between:
- **Domain Layer** - Business logic and domain models
- **Application Layer** - Use cases and application services
- **Presentation Layer** - React components and UI
- **Infrastructure Layer** - Three.js, WebGL, external services

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│              Presentation Layer                          │
│  (React Components - ClientApp, CanvasWorkspace)        │
├─────────────────────────────────────────────────────────┤
│              Application Layer                           │
│     (Hooks: useShader, useCanvasExport)                 │
├─────────────────────────────────────────────────────────┤
│               Domain Layer                               │
│  (Models: Image | Value Objects: Dimensions, Color)     │
├─────────────────────────────────────────────────────────┤
│              Service Layer                               │
│  (Shader Library, ShaderBuilder, TextureAdapter)        │
├─────────────────────────────────────────────────────────┤
│           Infrastructure Layer                           │
│        (Three.js, WebGL, Canvas API)                    │
└─────────────────────────────────────────────────────────┘
```

---

## Architectural Layers

### 1. Domain Layer (`src/domain/`)

**Purpose:** Core business logic and domain models - independent of frameworks

**Components:**
- **Value Objects** - Immutable objects representing domain concepts
  - `Dimensions` - Width/height with validation
  - `Color` - RGB color with conversion utilities

- **Domain Models** - Entities with behavior
  - `Image` - Image data with dimensions and metadata

**Rules:**
- ✅ No external dependencies (React, Three.js, etc.)
- ✅ Fully testable in isolation
- ✅ Immutable value objects
- ✅ Rich domain behavior

**Example:**
```typescript
// Domain model with behavior
export class Image {
  constructor(
    public readonly id: string,
    public readonly dimensions: Dimensions,
    public readonly data: ImageData
  ) {}

  getAspectRatio(): number {
    return this.dimensions.getAspectRatio();
  }

  static async fromFile(file: File): Promise<Image> {
    // Domain logic for creating Image from File
  }
}
```

---

### 2. Service Layer (`src/lib/`, `src/adapters/`)

**Purpose:** Application services and infrastructure adapters

**Components:**

#### Shader Services (`src/lib/shaders/`)
- **Shader Library** - Registry of all shader effects
- **Shader Builder** - GLSL code generation
- **Shader Effects** - Individual effect definitions
- **Shader Functions** - Reusable GLSL utilities

#### Adapters (`src/adapters/`)
- **TextureAdapter** - Converts domain `Image` to Three.js `Texture`
- Abstracts infrastructure from domain

**Rules:**
- ✅ Can depend on domain layer
- ✅ Abstracts external libraries
- ✅ Provides clean interfaces

**Example:**
```typescript
// Adapter pattern - hides Three.js from domain
export class TextureAdapter {
  createTexture(image: Image): TextureHandle {
    const texture = this.textureLoader.load(image.data.url);
    return { id: image.id, texture, source: image };
  }
}
```

---

### 3. Application Layer (`src/hooks/`)

**Purpose:** Use cases and application logic

**Components:**
- `useShader` - Shader state management
- `useCanvasExport` - Canvas export logic
- `useWindowSize` - Window dimensions tracking

**Rules:**
- ✅ Orchestrates domain and services
- ✅ React-specific logic
- ✅ Reusable business logic

**Example:**
```typescript
export function useShader(effectType: ShaderType) {
  const windowSize = useWindowSize();
  const effect = shaderLibrary[effectType];

  // Business logic: calculate resolution from image or window
  const resolution = imageOne instanceof Image
    ? imageOne.getDimensions().toArray()
    : windowSize.toArray();

  return { shader, varValues, updateVarValue, effect };
}
```

---

### 4. Presentation Layer (`src/ClientApp/`, `src/components/`)

**Purpose:** UI components and user interaction

**Components:**

#### Application Shell
- `ClientApp` - Main application container
- `HeaderBar` - Application header
- `CanvasWorkspace` - Canvas rendering area

#### Feature Components
- `EffectPicker` - Shader selection
- `ShaderControls` - Dynamic parameter controls
- `ImageUpload` - File upload
- `AspectRatioPicker` - Dimension selection
- `ColorPicker` - Color input

#### Rendering
- `ImageScene` - Three.js canvas wrapper (only component touching Three.js)

**Rules:**
- ✅ No business logic
- ✅ Uses hooks for state/logic
- ✅ Presentational focus
- ✅ Only ImageScene touches Three.js

---

### 5. Infrastructure Layer

**Purpose:** External libraries and frameworks

**Components:**
- Three.js - 3D rendering
- React Three Fiber - React renderer for Three.js
- WebGL - GPU acceleration
- Canvas API - Image export

**Rules:**
- ⚠️ Only accessed through adapters
- ⚠️ Never imported directly in domain/services

---

## Directory Structure

```
src/
├── domain/                      # Domain Layer
│   ├── models/                  # Domain entities
│   │   ├── Image.ts            # Image domain model
│   │   └── index.ts
│   └── value-objects/          # Immutable value objects
│       ├── Dimensions.ts       # Width/height value object
│       ├── Color.ts            # RGB color value object
│       └── index.ts
│
├── adapters/                    # Infrastructure Adapters
│   ├── TextureAdapter.ts       # Image → Three.js Texture
│   └── index.ts
│
├── hooks/                       # Application Logic (React Hooks)
│   ├── useShader.ts            # Shader state management
│   ├── useCanvasExport.ts      # Canvas export logic
│   └── useWindowSize.ts        # Window dimensions
│
├── lib/                         # Services & Utilities
│   ├── shaders/                # Shader system
│   │   ├── index.ts            # Shader library registry
│   │   ├── effects/            # Individual shader effects (16 total)
│   │   │   ├── black-and-white.ts
│   │   │   ├── color-tint.ts
│   │   │   └── ...
│   │   ├── shader-functions/   # Reusable GLSL utilities
│   │   │   ├── color.ts        # Color manipulation
│   │   │   └── uv.ts           # UV transforms
│   │   └── constants.ts        # Shared constants
│   ├── shaderConfig.ts         # Shader configuration builder
│   └── utils.ts                # General utilities
│
├── shaders/                     # Shader Infrastructure
│   ├── shaderBuilder.ts        # GLSL code generator
│   └── types.d.ts              # Shader type definitions
│
├── components/                  # Presentational Components
│   ├── ui/                     # Base UI components (shadcn/ui)
│   ├── CanvasWorkspace.tsx     # Canvas rendering area
│   ├── ColorPicker.tsx         # Color input
│   ├── effect-picker.tsx       # Shader selection
│   ├── aspect-ratio-picker.tsx # Dimension selector
│   └── header-bar.tsx          # App header
│
├── ClientApp/                   # Application Shell
│   ├── ClientApp.tsx           # Main app container
│   ├── shader-controls.tsx     # Dynamic shader controls
│   └── image-upload.tsx        # File upload
│
├── ImageScene.tsx               # Three.js canvas wrapper
├── types/                       # Type definitions
│   └── shader.ts               # Shader types
├── App.tsx                      # Root component
└── main.tsx                     # Application entry point
```

---

## Domain Models

### Image

**Location:** `src/domain/models/Image.ts`

**Purpose:** Represents an image with dimensions and data

```typescript
class Image {
  constructor(
    public readonly id: string,
    public readonly dimensions: Dimensions,
    public readonly data: ImageData
  )

  // Methods
  getAspectRatio(): number
  getDimensions(): Dimensions
  dispose(): void

  // Factory methods
  static async fromFile(file: File): Promise<Image>
  static async fromUrl(url: string): Promise<Image>
}
```

**Usage:**
```typescript
const image = await Image.fromFile(file);
console.log(image.getDimensions()); // Dimensions(1920, 1080)
console.log(image.getAspectRatio()); // 1.777...
```

---

### Dimensions

**Location:** `src/domain/value-objects/Dimensions.ts`

**Purpose:** Immutable width/height with validation

```typescript
class Dimensions {
  constructor(
    public readonly width: number,
    public readonly height: number
  )

  // Methods
  getAspectRatio(): number
  scale(factor: number): Dimensions
  equals(other: Dimensions): boolean
  toArray(): [number, number]
  toString(): string

  // Factory
  static fromArray([width, height]: [number, number]): Dimensions
}
```

**Usage:**
```typescript
const dims = new Dimensions(1920, 1080);
const scaled = dims.scale(0.5); // Dimensions(960, 540)
const ratio = dims.getAspectRatio(); // 1.777...
```

---

### Color

**Location:** `src/domain/value-objects/Color.ts`

**Purpose:** RGB color with conversion utilities

```typescript
class Color {
  constructor(
    public readonly r: number, // 0-1
    public readonly g: number, // 0-1
    public readonly b: number  // 0-1
  )

  // Conversions
  toFloat32Array(): Float32Array
  toHex(): string
  toRGBObject(): { r: number; g: number; b: number }

  // Factory methods
  static fromRGB(r: number, g: number, b: number): Color
  static fromHex(hex: string): Color
  static fromFloat32Array(arr: Float32Array): Color
}
```

**Usage:**
```typescript
const color = Color.fromHex('#FF5733');
const rgb = color.toRGBObject(); // { r: 1, g: 0.341, b: 0.2 }
const array = color.toFloat32Array(); // Float32Array[1, 0.341, 0.2]
```

---

## Core Concepts

### 1. Shader Effect System

Shaders are defined using a **declarative builder API**:

```typescript
import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const myEffect = createShaderRecord({
  name: "My Effect",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('intensity').asRange('Intensity', 0.5, 0, 1, 0.01),
    createShaderVariable('color').asVec3('Tint Color', 1, 0, 0),
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      vec4 texColor = texture2D(imageTexture, uv);
      vec3 tinted = mix(texColor.rgb, color, intensity);
      gl_FragColor = vec4(tinted, texColor.a);
    }
  `
});
```

**Benefits:**
- Type-safe parameter definitions
- Automatic UI generation
- Centralized shader registry
- Easy to add new effects

---

### 2. Texture Adapter Pattern

Converts domain `Image` to infrastructure `Texture`:

```typescript
// Domain → Infrastructure conversion
const textureAdapter = new TextureAdapter();
const handle = textureAdapter.createTexture(image);
// handle.texture is Three.js Texture
// handle.source is domain Image
```

**Why?**
- Decouples domain from Three.js
- Enables texture caching
- Makes testing easier
- Could swap rendering library

---

### 3. React Ref Pattern for Canvas Access

ImageScene exposes controlled API via ref:

```typescript
// ImageScene provides handle
export interface ImageSceneHandle {
  getCanvas(): HTMLCanvasElement | null;
}

// Parent component uses ref
const sceneRef = useRef<ImageSceneHandle>(null);
const canvas = sceneRef.current?.getCanvas();
```

**Benefits:**
- No DOM queries (`document.querySelector`)
- Type-safe API
- Controlled interface
- Testable

---

## Data Flow

### Image Upload Flow

```
1. User selects file
   ↓
2. ImageUpload component receives File
   ↓
3. Image.fromFile(file) creates domain Image
   ↓
4. onChange callback passes Image to parent
   ↓
5. updateVarValue stores Image in state
   ↓
6. ImageScene receives Image via props
   ↓
7. TextureAdapter converts Image → Texture
   ↓
8. Three.js renders with Texture
```

### Shader Parameter Update Flow

```
1. User adjusts slider/picker
   ↓
2. ShaderControls calls onChange(key, value)
   ↓
3. updateVarValue updates varValues state
   ↓
4. useShader recompiles shader (memoized)
   ↓
5. ImageScene receives new varValues
   ↓
6. Uniforms updated in Three.js material
   ↓
7. Shader re-renders with new values
```

### Canvas Export Flow

```
1. User clicks "Save as Input"
   ↓
2. handleSaveImage callback fires
   ↓
3. imageSceneRef.current.getCanvas() retrieves canvas
   ↓
4. useCanvasExport.exportCanvasAsImage(canvas)
   ↓
5. Canvas → Blob → File → Image conversion
   ↓
6. updateVarValue stores new Image
   ↓
7. Cycle repeats - Image rendered on canvas
```

---

## Key Patterns

### 1. Builder Pattern

**Used in:** Shader configuration

```typescript
createShaderVariable('intensity')
  .asRange('Intensity', 0.5, 0, 1, 0.01)
```

**Benefits:**
- Fluent API
- Type-safe construction
- Reduces boilerplate

---

### 2. Adapter Pattern

**Used in:** TextureAdapter, ImageScene

```typescript
class TextureAdapter {
  createTexture(image: Image): TextureHandle
}
```

**Benefits:**
- Decouples domain from infrastructure
- Enables swapping implementations
- Clean abstraction boundaries

---

### 3. Registry Pattern

**Used in:** Shader library

```typescript
export const shaderLibrary: Record<ShaderType, ShaderEffect> = {
  blackAndWhite,
  colorTint,
  // ...
};
```

**Benefits:**
- Central registration
- Type-safe lookup
- Easy plugin system

---

### 4. Value Object Pattern

**Used in:** Dimensions, Color

```typescript
const dims = new Dimensions(1920, 1080);
const scaled = dims.scale(0.5); // Returns new Dimensions
```

**Benefits:**
- Immutability
- Validation at construction
- Rich behavior
- Type safety

---

### 5. Factory Pattern

**Used in:** Image creation

```typescript
const imageFromFile = await Image.fromFile(file);
const imageFromUrl = await Image.fromUrl(url);
```

**Benefits:**
- Encapsulates complex creation
- Multiple construction methods
- Validation

---

## Adding New Features

### Adding a New Shader Effect

1. **Create effect file:** `src/lib/shaders/effects/my-effect.ts`

```typescript
import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const myEffect = createShaderRecord({
  name: "My Effect",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('strength').asRange('Strength', 1.0, 0, 2, 0.1),
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(imageTexture, uv);
      // Your shader code here
      gl_FragColor = color * strength;
    }
  `
});
```

2. **Register in library:** `src/lib/shaders/index.ts`

```typescript
import { myEffect } from './effects/my-effect';

export const shaderLibrary = {
  // ... existing effects
  myEffect,
};
```

3. **Add to type union:** `src/types/shader.ts`

```typescript
export const registeredShaders = [
  // ... existing
  'myEffect',
] as const;
```

4. **Add icon (optional):** `src/components/effect-picker.tsx`

```typescript
const shaderIcons: Record<ShaderType, React.ReactNode> = {
  // ... existing
  myEffect: <Sparkles className="h-6 w-6" />,
};
```

**That's it!** The effect will automatically appear in the UI with generated controls.

---

### Adding a New Parameter Type

1. **Update type definition:** `src/types/shader.ts`

```typescript
export type ShaderInputDefinition = {
  type: 'range' | 'vec2' | 'vec3' | 'image' | 'boolean' | 'YOUR_TYPE'
  // ... additional fields
}
```

2. **Add builder helper:** `src/lib/shaderConfig.ts`

```typescript
export const createShaderVariable = (name: string) => ({
  // ... existing helpers
  asYourType: (label: string, defaultValue: YourType) =>
    createVariable(name, 'glsl_type', defaultValue, { type: 'YOUR_TYPE', label }),
});
```

3. **Add control rendering:** `src/ClientApp/shader-controls.tsx`

```typescript
{input.type === 'YOUR_TYPE' ? (
  <YourCustomControl
    value={values[key]}
    onChange={(value) => onChange(key, value)}
  />
) : /* ... other types */}
```

4. **Add uniform conversion:** `src/ImageScene.tsx`

```typescript
if (value instanceof YourType) {
  acc[key] = { value: value.toThreeJsType() };
}
```

---

## Testing Strategy

### Unit Tests

**Domain Layer:**
```typescript
// domain/value-objects/Dimensions.test.ts
describe('Dimensions', () => {
  it('should calculate aspect ratio correctly', () => {
    const dims = new Dimensions(1920, 1080);
    expect(dims.getAspectRatio()).toBeCloseTo(1.777);
  });
});
```

**Services:**
```typescript
// lib/shaderConfig.test.ts
describe('createShaderRecord', () => {
  it('should create shader with correct structure', () => {
    const shader = createShaderRecord({...});
    expect(shader.declarationVars).toBeDefined();
  });
});
```

---

### Integration Tests

**Hooks:**
```typescript
// hooks/useShader.test.ts
describe('useShader', () => {
  it('should update varValues when parameter changes', () => {
    const { result } = renderHook(() => useShader('blackAndWhite'));
    act(() => {
      result.current.updateVarValue('contrast', 1.5);
    });
    expect(result.current.varValues.contrast).toBe(1.5);
  });
});
```

---

### Component Tests

```typescript
// components/ColorPicker.test.tsx
describe('ColorPicker', () => {
  it('should call setColor when hex input changes', () => {
    const setColor = jest.fn();
    render(<ColorPicker color={Color.fromRGB(1,0,0)} setColor={setColor} />);
    // ... test interaction
  });
});
```

---

## Performance Considerations

### 1. Texture Caching

TextureAdapter caches textures by Image ID:
```typescript
createTexture(image: Image): TextureHandle {
  const cached = this.textureCache.get(image.id);
  if (cached) return cached; // ✅ Avoid recreation
  // ... create new texture
}
```

---

### 2. Memoization

Shader compilation is memoized:
```typescript
const shader = useMemo(() => shaderBuilder({
  vars: effect.declarationVars,
  getBody: effect.getBody,
}), [effect, varValues]); // ✅ Only recompile when needed
```

---

### 3. Callback Stability

Event handlers use `useCallback`:
```typescript
const handleSaveImage = useCallback(async (target) => {
  // ... export logic
}, [exportCanvasAsImage, updateVarValue]); // ✅ Stable reference
```

---

### 4. Lazy Loading (Future)

Shader effects could be code-split:
```typescript
// Future optimization
const effect = await import(`./effects/${effectName}.ts`);
```

---

## Best Practices

### ✅ Do

- Use domain models for business logic
- Keep components presentational
- Use hooks for reusable logic
- Validate at domain boundaries
- Write tests for domain layer
- Use TypeScript strictly
- Follow Single Responsibility Principle

### ❌ Don't

- Import Three.js in domain layer
- Put business logic in components
- Use `any` type
- Query DOM directly
- Skip error handling
- Mix concerns in one file
- Bypass type safety with `@ts-ignore`

---

## Troubleshooting

### Issue: Shader not appearing in effect picker

**Check:**
1. Effect registered in `shaderLibrary`?
2. Effect name in `registeredShaders` array?
3. Icon defined in `effect-picker.tsx`?

---

### Issue: Parameter control not rendering

**Check:**
1. Parameter type supported in `shader-controls.tsx`?
2. Variable created with correct helper (`.asRange()`, etc.)?
3. Default value provided?

---

### Issue: Texture not loading

**Check:**
1. Image blob URL created correctly?
2. TextureAdapter converting Image to Texture?
3. ImageScene receiving Image via props?
4. Check browser console for CORS errors

---

## Future Improvements

See `PHASE_1_TODOS.md` for completed tasks and `ARCHITECTURE_AUDIT.md` for Phase 2/3 roadmap:

- **Phase 2:** Rendering adapter abstraction, parameter plugin system
- **Phase 3:** Full hexagonal architecture, command pattern for undo/redo

---

## Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [GLSL Reference](https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)

---

**Questions?** Check `ARCHITECTURE_AUDIT.md` for detailed architectural analysis.
