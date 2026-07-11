# Week 1: Identified Use Cases

## Overview
This document identifies all current use cases in Luminframe by analyzing the existing codebase. These use cases will form the foundation of the Application Layer in our hexagonal architecture.

---

## Image Management Use Cases

### 1. LoadImageUseCase
**Purpose:** Load an image from a file upload

**Current Implementation:** `Image.fromFile()` in `src/domain/models/Image.ts:46`

**Flow:**
1. User selects file via file input
2. Validate file is image type
3. Create object URL from file
4. Load image to get dimensions
5. Return Image domain object with id, dimensions, and data

**Input:**
- `file: File` - The uploaded file

**Output:**
- `Promise<Image>` - Domain Image object

**Validation:**
- File must be image type (image/*)
- Image must load successfully

---

### 2. LoadImageFromUrlUseCase
**Purpose:** Load an image from a URL

**Current Implementation:** `Image.fromUrl()` in `src/domain/models/Image.ts:82`

**Flow:**
1. User provides URL
2. Create HTMLImageElement
3. Set CORS and load image
4. Get dimensions from loaded image
5. Return Image domain object

**Input:**
- `url: string` - The image URL

**Output:**
- `Promise<Image>` - Domain Image object

**Validation:**
- URL must be valid
- Image must load successfully
- CORS must allow loading

---

### 3. SetImageAsInputUseCase
**Purpose:** Set a loaded image as the primary shader input

**Current Implementation:** `updateVarValue()` in `useShader` hook, called from `ShaderControls`

**Flow:**
1. User uploads or selects image
2. Load image using LoadImageUseCase
3. Update shader variable "imageTexture" with Image
4. Trigger re-render

**Input:**
- `image: Image` - The loaded image
- `inputKey: string` - The variable key (default "imageTexture")

**Output:**
- Updated shader state with new image

---

### 4. SetSecondImageUseCase
**Purpose:** Set a second image for blend/composite operations

**Current Implementation:** `handleSaveImage("two")` in `ClientApp.tsx:27`

**Flow:**
1. User clicks "Save as Second Input" button
2. Export current canvas as Image
3. Update shader variable "imageTextureTwo" with Image
4. Enable blend operations

**Input:**
- `image: Image` - The second image
- `target: "one" | "two"` - Which input to set

**Output:**
- Updated shader state with second image

---

## Shader Operation Use Cases

### 5. ApplyShaderEffectUseCase
**Purpose:** Apply a shader effect to the current image

**Current Implementation:** `useShader()` hook in `src/hooks/useShader.ts:8`

**Flow:**
1. Get shader effect from library
2. Initialize default parameter values
3. Build shader string using shaderBuilder
4. Pass to rendering engine
5. Render result on canvas

**Input:**
- `effectType: ShaderType` - The shader effect to apply
- `image: Image` - The source image
- `parameters: ShaderInputVars` - Effect parameters

**Output:**
- Rendered effect on canvas

---

### 6. SwitchShaderEffectUseCase
**Purpose:** Change the active shader effect

**Current Implementation:** `setSelectedShader()` in `ClientApp.tsx:18`

**Flow:**
1. User selects new effect from EffectPicker
2. Load new effect from shaderLibrary
3. Merge existing parameters with new defaults
4. Rebuild shader string
5. Re-render with new effect

**Input:**
- `newEffectType: ShaderType` - The new effect to switch to

**Output:**
- Updated shader state with new effect
- Re-rendered canvas

---

### 7. UpdateShaderParameterUseCase
**Purpose:** Update a single shader parameter value

**Current Implementation:** `updateVarValue()` in `useShader` hook

**Flow:**
1. User adjusts parameter control (slider, color picker, etc.)
2. Update parameter value in state
3. Rebuild shader if needed
4. Trigger re-render

**Input:**
- `key: string` - Parameter name
- `value: any` - New parameter value

**Output:**
- Updated shader state
- Re-rendered canvas

---

### 8. BuildShaderUseCase
**Purpose:** Build GLSL shader source code from effect definition

**Current Implementation:** `shaderBuilder()` in `src/shaders/shaderBuilder.ts`

**Flow:**
1. Get effect declaration variables
2. Get effect body function
3. Assemble GLSL shader source
4. Return shader string

**Input:**
- `effect: ShaderEffect` - The effect definition
- `parameters: ShaderInputVars` - Current parameter values

**Output:**
- `string` - Complete GLSL shader source

---

### 9. GetAvailableEffectsUseCase
**Purpose:** Get list of all available shader effects

**Current Implementation:** `Object.keys(shaderLibrary)` in `useShader` hook

**Flow:**
1. Query shaderLibrary
2. Return list of effect types

**Input:**
- None

**Output:**
- `ShaderType[]` - Array of available effect types

---

## Rendering Operation Use Cases

### 10. RenderSceneUseCase
**Purpose:** Render the shader effect with current parameters

**Current Implementation:** `ImageScene` component in `src/ImageScene.tsx`

**Flow:**
1. Receive shader source and input variables
2. Create/update Three.js scene
3. Create shader material with uniforms
4. Render to canvas
5. Update display

**Input:**
- `shader: string` - GLSL shader source
- `inputVars: ShaderInputVars` - Uniform values
- `dimensions: [number, number]` - Canvas dimensions

**Output:**
- Rendered canvas

---

### 11. UpdateResolutionUseCase
**Purpose:** Calculate and update canvas resolution

**Current Implementation:** Resolution calculation in `useShader` hook lines 48-52

**Flow:**
1. Check if image is loaded
2. If image exists, use image dimensions
3. Otherwise, use window size
4. Update resolution uniform

**Input:**
- `image: Image | undefined` - Current image
- `windowSize: Dimensions` - Fallback window size

**Output:**
- `[number, number]` - Resolution array

---

## Export Operation Use Cases

### 12. ExportCanvasUseCase
**Purpose:** Export current canvas as Image domain object

**Current Implementation:** `useCanvasExport` hook in `src/hooks/useCanvasExport.ts:9`

**Flow:**
1. Get canvas element from ImageScene
2. Convert canvas to PNG blob
3. Create File from blob
4. Load as Image domain object
5. Return Image

**Input:**
- `canvas: HTMLCanvasElement` - The canvas to export

**Output:**
- `Promise<Image>` - Exported canvas as Image

---

### 13. SaveCanvasAsInputUseCase
**Purpose:** Save rendered canvas as shader input image

**Current Implementation:** `handleSaveImage()` in `ClientApp.tsx:27`

**Flow:**
1. Get canvas from ImageScene ref
2. Export canvas as Image using ExportCanvasUseCase
3. Update shader input variable with exported Image
4. Trigger re-render with new input

**Input:**
- `canvas: HTMLCanvasElement` - Canvas to save
- `target: "one" | "two"` - Which input to update

**Output:**
- Updated shader state with canvas as input

---

## Texture Management Use Cases

### 14. CreateTextureUseCase
**Purpose:** Create Three.js texture from Image domain object

**Current Implementation:** `TextureAdapter.createTexture()` in `src/adapters/TextureAdapter.ts:25`

**Flow:**
1. Check texture cache for existing texture
2. If cached, return cached texture
3. Otherwise, load texture from image URL
4. Create TextureHandle with id and texture
5. Cache for future use
6. Return TextureHandle

**Input:**
- `image: Image` - Domain image to convert

**Output:**
- `TextureHandle` - Texture with metadata

---

### 15. DisposeTextureUseCase
**Purpose:** Clean up texture resources

**Current Implementation:** `TextureAdapter.disposeTexture()` in `src/adapters/TextureAdapter.ts:62`

**Flow:**
1. Get texture from cache
2. Dispose Three.js texture
3. Dispose Image domain object
4. Remove from cache

**Input:**
- `id: string` - Texture ID to dispose

**Output:**
- Cleaned up resources

---

### 16. CacheTextureUseCase
**Purpose:** Cache textures to avoid recreation

**Current Implementation:** `TextureAdapter` cache in `src/adapters/TextureAdapter.ts:19`

**Flow:**
1. On texture creation, check cache first
2. Return cached texture if exists
3. Create and cache new textures
4. Manage cache lifecycle

**Input:**
- `imageId: string` - Image ID to cache

**Output:**
- Cached texture availability

---

## Summary

**Total Use Cases Identified: 16**

### By Category:
- **Image Management:** 4 use cases
- **Shader Operations:** 5 use cases
- **Rendering Operations:** 2 use cases
- **Export Operations:** 2 use cases
- **Texture Management:** 3 use cases

### Key Observations:
1. Most business logic is in React hooks (useShader, useCanvasExport)
2. Domain models have some use case logic (Image.fromFile, Image.fromUrl)
3. TextureAdapter already follows port/adapter pattern
4. Clear separation between domain (Image) and infrastructure (Texture)
5. Parameter system is extensible via ParameterRegistry

### Next Steps:
1. Define port interfaces for these use cases
2. Extract business logic from hooks into services
3. Create adapters implementing port interfaces
4. Document current data flows
