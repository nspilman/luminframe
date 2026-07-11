# Current Data Flows in Luminframe

This document describes the current data flows in Luminframe before hexagonal architecture implementation. These flows will be refactored to use ports, adapters, and use cases.

---

## Flow 1: Image Upload → Render

**Trigger:** User selects an image file via file input

### Current Implementation Path:

```
1. User selects file
   ↓
2. ShaderControls component receives File
   │ Location: src/components/shader-controls.tsx
   ↓
3. Image.fromFile(file) static method
   │ Location: src/domain/models/Image.ts:46
   │ - Creates object URL from file
   │ - Loads HTMLImageElement
   │ - Extracts dimensions
   │ - Returns Image domain object
   ↓
4. updateVarValue("imageTexture", image)
   │ Location: src/hooks/useShader.ts:41
   │ - Updates React state with new image
   │ - Triggers re-render
   ↓
5. useShader recalculates resolution
   │ Location: src/hooks/useShader.ts:49-52
   │ - Gets image dimensions
   │ - Updates resolution uniform
   ↓
6. React re-renders ClientApp
   │ Location: src/ClientApp/ClientApp.tsx
   │ - Passes updated varValues to CanvasWorkspace
   ↓
7. CanvasWorkspace passes to ImageScene
   │ Location: src/components/CanvasWorkspace.tsx:27
   │ - Forwards shader, inputVars, dimensions
   ↓
8. ImageScene creates Three.js scene
   │ Location: src/ImageScene.tsx
   │ - Converts Image to Texture via TextureAdapter
   │ - Creates shader material with uniforms
   │ - Renders to canvas
   ↓
9. Canvas displays rendered result
```

### Key Files Involved:
- `src/domain/models/Image.ts` - Image loading
- `src/hooks/useShader.ts` - State management
- `src/ClientApp/ClientApp.tsx` - Orchestration
- `src/components/CanvasWorkspace.tsx` - Canvas container
- `src/ImageScene.tsx` - Three.js rendering
- `src/adapters/TextureAdapter.ts` - Texture creation

### Data Transformations:
```
File → Image (domain) → Texture (Three.js) → Canvas (WebGL)
```

---

## Flow 2: Shader Switch → Re-render

**Trigger:** User selects a different shader effect

### Current Implementation Path:

```
1. User clicks shader effect in EffectPicker
   ↓
2. setSelectedShader(newShaderType)
   │ Location: src/ClientApp/ClientApp.tsx:18
   │ - Updates selectedShader state
   ↓
3. useShader hook responds to effectType change
   │ Location: src/hooks/useShader.ts:21-34
   │ - useEffect triggered by effectType change
   │ - Gets new effect from shaderLibrary
   │ - Merges existing params with new defaults
   │ - Preserves compatible param values
   ↓
4. shaderBuilder creates new shader string
   │ Location: src/hooks/useShader.ts:36-39
   │ - Assembles GLSL from effect definition
   │ - Memoized based on effect and values
   ↓
5. React re-renders with new shader
   │ Location: src/ClientApp/ClientApp.tsx
   │ - Passes new shader string to CanvasWorkspace
   ↓
6. ImageScene receives new shader
   │ Location: src/ImageScene.tsx
   │ - Creates new shader material
   │ - Applies new uniforms
   │ - Renders with new effect
   ↓
7. Canvas displays new effect result
```

### Key Files Involved:
- `src/components/effect-picker.tsx` - UI selection
- `src/ClientApp/ClientApp.tsx` - State orchestration
- `src/hooks/useShader.ts` - Effect management
- `src/lib/shaders/index.ts` - Shader library
- `src/shaders/shaderBuilder.ts` - GLSL assembly
- `src/ImageScene.tsx` - Rendering

### Data Transformations:
```
ShaderType → ShaderEffect → GLSL String → ShaderMaterial → Rendered Canvas
```

---

## Flow 3: Parameter Change → Update

**Trigger:** User adjusts a parameter control (slider, color picker, etc.)

### Current Implementation Path:

```
1. User interacts with parameter control
   ↓
2. Control component calls onChange
   │ Location: Various controls in src/components/controls/
   │ - Slider, ColorPicker, ImageInput, etc.
   ↓
3. ShaderControls receives onChange event
   │ Location: src/components/shader-controls.tsx
   │ - Gets parameter key and new value
   │ - Calls onChange(key, value)
   ↓
4. updateVarValue(key, value)
   │ Location: src/hooks/useShader.ts:41
   │ - Updates React state with new value
   │ - Merges into existing varValues
   ↓
5. React re-renders with updated params
   │ Location: src/ClientApp/ClientApp.tsx
   │ - Passes updated varValues to CanvasWorkspace
   ↓
6. ImageScene receives new parameters
   │ Location: src/ImageScene.tsx
   │ - Updates shader uniforms
   │ - Renders with new parameter values
   ↓
7. Canvas displays updated result
```

### Key Files Involved:
- `src/components/controls/*` - Parameter UI controls
- `src/components/shader-controls.tsx` - Control orchestration
- `src/hooks/useShader.ts` - State management
- `src/parameters/ParameterRegistry.ts` - Parameter handlers
- `src/ImageScene.tsx` - Rendering with uniforms

### Data Transformations:
```
UI Event → Parameter Value → Shader Uniform → Rendered Canvas
```

### Parameter Flow Detail:

**For Color Parameter:**
```
ColorPicker UI
   ↓
Color value object (domain)
   ↓
updateVarValue("colorParam", color)
   ↓
Uniform converter (ParameterRegistry)
   ↓
Three.js uniform (Vector3 or Color)
   ↓
GLSL uniform
```

**For Number Parameter:**
```
Slider UI
   ↓
number value
   ↓
updateVarValue("numberParam", value)
   ↓
Uniform converter
   ↓
Three.js uniform (float)
   ↓
GLSL uniform
```

**For Image Parameter:**
```
ImageInput UI
   ↓
Image domain object
   ↓
updateVarValue("imageParam", image)
   ↓
TextureAdapter creates Texture
   ↓
Three.js Texture uniform
   ↓
GLSL sampler2D
```

---

## Flow 4: Export → Download

**Trigger:** User clicks "Save as Input" or "Save as Second Input"

### Current Implementation Path:

```
1. User clicks save button
   ↓
2. handleSaveImage(inputTarget)
   │ Location: src/ClientApp/ClientApp.tsx:27
   │ - Gets target ("one" or "two")
   ↓
3. Get canvas from ImageScene ref
   │ Location: src/ClientApp/ClientApp.tsx:34
   │ - Accesses ImageSceneHandle.getCanvas()
   ↓
4. exportCanvasAsImage(canvas)
   │ Location: src/hooks/useCanvasExport.ts:9
   │ - Converts canvas to Blob (PNG)
   │ - Creates File from Blob
   │ - Calls Image.fromFile()
   │ - Returns Image domain object
   ↓
5. updateVarValue(varKey, image)
   │ Location: src/ClientApp/ClientApp.tsx:44
   │ - Sets exported image as input
   │ - varKey is "imageTexture" or "imageTextureTwo"
   ↓
6. React re-renders with new input
   │ - Triggers Flow 1 with new image
   ↓
7. Canvas renders with exported image as input
```

### Key Files Involved:
- `src/components/CanvasWorkspace.tsx` - Save buttons
- `src/ClientApp/ClientApp.tsx` - Save orchestration
- `src/ImageScene.tsx` - Canvas access
- `src/hooks/useCanvasExport.ts` - Export logic
- `src/domain/models/Image.ts` - Image creation

### Data Transformations:
```
Canvas (WebGL) → Blob (PNG) → File → Image (domain) → Shader Input → Canvas (WebGL)
```

### Export Flow Detail:

```
HTMLCanvasElement
   ↓
canvas.toBlob('image/png')
   ↓
Blob
   ↓
new File([blob], 'canvas-export.png')
   ↓
File
   ↓
Image.fromFile(file)
   ↓
URL.createObjectURL(file)
   ↓
Image domain object
   ↓
TextureAdapter.createTexture(image)
   ↓
Three.js Texture
   ↓
Shader uniform (sampler2D)
   ↓
Rendered back to canvas
```

---

## Cross-Cutting Concerns

### Texture Caching Flow

```
Image domain object (with id)
   ↓
TextureAdapter.createTexture(image)
   ↓
Check cache: textureCache.get(image.id)
   ↓ (if cached)
   Return cached TextureHandle
   ↓ (if not cached)
   TextureLoader.load(image.data.url)
   ↓
Create TextureHandle
   ↓
Store in cache: textureCache.set(image.id, handle)
   ↓
Return TextureHandle
```

**Location:** `src/adapters/TextureAdapter.ts:25-43`

### Shader Building Flow

```
ShaderEffect definition
   ↓
shaderBuilder({
  vars: effect.declarationVars,
  getBody: effect.getBody
})
   ↓
Assemble GLSL:
  - Version declaration
  - Uniform declarations
  - Varying declarations
  - Vertex shader
  - Fragment shader with effect body
   ↓
Return complete GLSL string
```

**Location:** `src/shaders/shaderBuilder.ts`

### Parameter Registry Flow

```
Parameter definition (from ShaderEffect)
   ↓
ParameterRegistry.getRenderer(param)
   ↓
Returns appropriate React component:
  - NumberSlider
  - ColorPicker
  - ImageInput
  - Toggle
  - etc.
   ↓
Component renders in ShaderControls
   ↓
User interacts with component
   ↓
onChange callback with new value
   ↓
ParameterRegistry.getConverter(value)
   ↓
Converts to Three.js uniform type
   ↓
Applied to shader material
```

**Location:** `src/parameters/ParameterRegistry.ts`

---

## State Management Summary

### ClientApp State:
- `selectedShader: ShaderType` - Current shader effect
- `aspectRatio: Dimensions` - Canvas dimensions

### useShader State:
- `varValues: ShaderInputVars` - All shader parameter values
- Derived: `shader: string` - Built GLSL shader
- Derived: `effect: ShaderEffect` - Current effect definition
- Derived: `resolution: [number, number]` - Canvas resolution

### ImageScene State (Internal):
- Three.js scene, camera, renderer
- Shader material with uniforms
- Texture cache (via TextureAdapter)

---

## Identified Issues for Refactoring

### 1. Business Logic in Hooks
- `useShader` contains shader effect logic that should be in a service
- `useCanvasExport` contains export logic that should be in a service

### 2. Tight Coupling
- Components directly call `Image.fromFile()` (domain static method)
- ImageScene is tightly coupled to Three.js
- No abstraction over canvas export

### 3. No Use Case Layer
- Business logic is scattered across hooks and components
- No single place for "ApplyShaderEffect" use case
- Hard to test without React

### 4. Missing Abstractions
- No RenderingPort interface (ImageScene is the concrete implementation)
- No ImageLoaderPort interface (Image static methods are concrete)
- No ShaderRepositoryPort interface (shaderLibrary is concrete)

### 5. State Management
- State is spread across multiple levels
- No clear application state container
- Difficult to implement undo/redo

---

## Next Steps for Hexagonal Architecture

Based on these flows, we need to:

1. **Create Use Cases:**
   - LoadImageUseCase (replaces Image.fromFile call)
   - ApplyShaderEffectUseCase (replaces useShader logic)
   - UpdateParameterUseCase (replaces updateVarValue logic)
   - ExportCanvasUseCase (replaces useCanvasExport logic)

2. **Create Adapters:**
   - BrowserImageLoaderAdapter (implements ImageLoaderPort)
   - ThreeJSRenderingAdapter (implements RenderingPort)
   - BrowserImageExportAdapter (implements ImageExportPort)
   - InMemoryShaderRepositoryAdapter (implements ShaderRepositoryPort)

3. **Refactor Hooks:**
   - Make hooks thin wrappers over use cases
   - Move business logic to services
   - Keep only React state management in hooks

4. **Update Components:**
   - Components should only handle UI
   - Call use cases for business logic
   - No direct domain or infrastructure calls

---

## Dependency Graph (Current)

```
ClientApp
   ├── useShader (hook)
   │   ├── shaderLibrary (infrastructure)
   │   ├── shaderBuilder (infrastructure)
   │   └── Image (domain)
   ├── useCanvasExport (hook)
   │   └── Image (domain)
   ├── CanvasWorkspace (component)
   │   └── ImageScene (Three.js infrastructure)
   │       └── TextureAdapter (adapter)
   │           └── Three.js (external library)
   └── ShaderControls (component)
       ├── ParameterRegistry (infrastructure)
       └── Various controls (UI components)
```

**Problem:** ClientApp and hooks depend directly on infrastructure and domain, violating dependency inversion.

---

## Desired Dependency Graph (After Hexagonal Architecture)

```
ClientApp
   ├── ApplicationContext (DI container)
   │   ├── Use Cases
   │   │   ├── LoadImageUseCase
   │   │   ├── ApplyShaderEffectUseCase
   │   │   ├── UpdateParameterUseCase
   │   │   └── ExportCanvasUseCase
   │   └── Ports (interfaces)
   │       ├── ImageLoaderPort
   │       ├── RenderingPort
   │       ├── ImageExportPort
   │       └── ShaderRepositoryPort
   ├── useShader (thin hook)
   │   └── ApplyShaderEffectUseCase
   ├── useCanvasExport (thin hook)
   │   └── ExportCanvasUseCase
   ├── CanvasWorkspace (component)
   └── ShaderControls (component)

Adapters (injected into ApplicationContext)
   ├── BrowserImageLoaderAdapter → ImageLoaderPort
   ├── ThreeJSRenderingAdapter → RenderingPort
   ├── BrowserImageExportAdapter → ImageExportPort
   └── InMemoryShaderRepositoryAdapter → ShaderRepositoryPort
```

**Solution:** All dependencies point inward to use cases and ports. Adapters are injected and can be swapped.
