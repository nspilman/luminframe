# Week 2: Domain Layer Audit Report

## Overview
This audit examines all domain models and types for infrastructure dependencies that violate hexagonal architecture principles.

---

## Audit Results

### ✅ Pure Domain Models (No Infrastructure Dependencies)

#### 1. Color Value Object
**File:** `src/domain/value-objects/Color.ts`

**Status:** ✅ CLEAN

**Analysis:**
- No external infrastructure dependencies
- Pure TypeScript with standard library only
- Immutable value object with validation
- Methods are all pure transformations

**Note on Line 29:** `toFloat32Array()` method exists but is a pure conversion method. While Float32Array is commonly used with WebGL/Three.js, it's part of JavaScript standard library (typed arrays), not an infrastructure dependency. This is acceptable.

**Recommendations:**
- Keep as-is
- Already follows domain-driven design perfectly

---

#### 2. Dimensions Value Object
**File:** `src/domain/value-objects/Dimensions.ts`

**Status:** ✅ CLEAN

**Analysis:**
- No external infrastructure dependencies
- Pure TypeScript with standard library only
- Immutable value object with validation
- All methods are pure transformations

**Recommendations:**
- Keep as-is
- Already follows domain-driven design perfectly

---

#### 3. Image Model
**File:** `src/domain/models/Image.ts`

**Status:** ⚠️ MOSTLY CLEAN (Minor Infrastructure Coupling)

**Analysis:**
- Core Image class is pure domain (lines 15-125)
- Dependencies on domain value objects only (Dimensions)
- **Issue:** Static factory methods use browser APIs:
  - `Image.fromFile()` (line 46): Uses `window.Image`, `URL.createObjectURL`, File API
  - `Image.fromUrl()` (line 82): Uses `window.Image`, DOM APIs

**Infrastructure Dependencies:**
- `window.Image` (HTMLImageElement)
- `URL.createObjectURL`
- File API
- DOM event handlers (onload, onerror)

**Recommendations:**
- ✅ Core Image class: Keep as-is (pure domain)
- ⚠️ Static factory methods: Consider moving to ImageLoaderPort adapter
- **Rationale:** Loading from files/URLs is infrastructure concern
- **Alternative:** Keep for backward compatibility, but prefer using ImageLoaderPort in new code

**Decision:** ACCEPTABLE for now
- Static methods are convenient factory methods
- They will be wrapped by adapters (ImageLoaderPort)
- Can refactor later if needed
- Domain model can have infrastructure-aware factory methods as long as core model is pure

---

### ❌ Domain Types with Infrastructure Dependencies

#### 4. ShaderInputVars Type
**File:** `src/types/shader.ts`

**Status:** ❌ VIOLATES DOMAIN PURITY

**Line 1:**
```typescript
import { Texture } from 'three'
```

**Line 5:**
```typescript
export type ShaderInputVars = Record<string,
  string | number | number[] | Texture | Image | Color | null | Float32Array | boolean
>
```

**Infrastructure Dependencies:**
- `Texture` from Three.js library

**Problem:**
- ShaderInputVars is used throughout the application
- Including it in domain/application layer couples everything to Three.js
- Violates dependency inversion principle
- Makes it impossible to swap rendering engines

**Impact:**
- Used in ShaderEffect interface (domain concept)
- Used in useShader hook (application layer)
- Used in use cases and ports
- Spreads Three.js dependency everywhere

**Recommendations:**
1. **Remove Texture from ShaderInputVars**
2. **Replace with domain Image type**
3. **Convert Image → Texture in adapter layer only**

**Refactoring Plan:**
```typescript
// Before (WRONG):
export type ShaderInputVars = Record<string,
  string | number | number[] | Texture | Image | Color | ...
>

// After (CORRECT):
export type ShaderInputVars = Record<string,
  string | number | number[] | Image | Color | ...
>
```

**Migration Strategy:**
1. Remove Texture from type union
2. Use Image everywhere in domain/application
3. TextureAdapter converts Image → Texture
4. Update ImageScene to handle Image inputs
5. Ensure backward compatibility during transition

---

#### 5. ShaderEffect Interface
**File:** `src/types/shader.ts`

**Status:** ✅ CLEAN (once ShaderInputVars is fixed)

**Analysis:**
- Interface itself has no direct infrastructure dependencies
- **Indirect dependency:** Uses ShaderInputVars which includes Texture
- Once ShaderInputVars is fixed, this will be pure

**Structure:**
```typescript
export interface ShaderEffect {
  name: string;
  declarationVars: { [k: string]: string };
  defaultValues: { [k: string]: any };
  inputs: { [k: string]: ShaderInputDefinition };
  getBody: () => string;
}
```

**Recommendations:**
- Fix ShaderInputVars dependency
- Consider stricter typing for defaultValues (currently `any`)
- Otherwise structure is good

---

## Summary of Issues

### Critical Issues (Must Fix):
1. **ShaderInputVars includes Three.js Texture** ❌
   - Location: `src/types/shader.ts:1,5`
   - Impact: High - spreads infrastructure dependency throughout app
   - Priority: HIGH
   - Fix: Remove Texture, use Image only

### Minor Issues (Consider):
1. **Image.fromFile/fromUrl use browser APIs** ⚠️
   - Location: `src/domain/models/Image.ts:46,82`
   - Impact: Low - isolated to factory methods
   - Priority: LOW
   - Fix: Optional - can wrap with adapter

2. **ShaderEffect defaultValues uses `any` type** ⚠️
   - Location: `src/types/shader.ts:19`
   - Impact: Low - type safety issue, not architecture
   - Priority: LOW
   - Fix: Use stricter union type

---

## Dependency Analysis

### Current Domain Layer Dependencies:

```
Domain Models:
  ✅ Color → (none)
  ✅ Dimensions → (none)
  ⚠️ Image → window.Image, URL, File (factory methods only)

Domain Types:
  ❌ ShaderInputVars → Three.js Texture
  ⚠️ ShaderEffect → ShaderInputVars → Three.js Texture (indirect)
```

### Desired Domain Layer Dependencies:

```
Domain Models:
  ✅ Color → (none)
  ✅ Dimensions → (none)
  ✅ Image → (none) OR minimal browser APIs for factories

Domain Types:
  ✅ ShaderInputVars → Domain types only (Image, Color)
  ✅ ShaderEffect → Domain types only
```

---

## Action Items

### Immediate (This Week):
- [x] Audit complete
- [ ] Create pure domain ShaderInputVars type
- [ ] Remove Three.js Texture dependency
- [ ] Update all usages to use Image instead
- [ ] Test that everything still works

### Next Week:
- [ ] Create adapters that convert Image → Texture
- [ ] Ensure TextureAdapter handles all conversions
- [ ] Update ImageScene to work with domain Image
- [ ] Add tests for domain purity

---

## Testing Domain Purity

To verify domain purity, run this check:

```bash
# Check for infrastructure imports in domain layer
grep -r "from 'three'" src/domain/
grep -r "from 'react'" src/domain/
grep -r "import.*three" src/types/shader.ts
```

**Expected Result:** No matches (after fixes)

**Current Result:**
- ❌ `src/types/shader.ts:1:import { Texture } from 'three'`

---

## Conclusion

**Overall Assessment:** Good foundation, one critical fix needed

**Strengths:**
- Core domain models (Color, Dimensions) are perfectly pure
- Image model core is pure (factory methods acceptable)
- Clear value object pattern

**Weaknesses:**
- ShaderInputVars leaks Three.js dependency
- This spreads throughout the application
- Violates hexagonal architecture

**Priority:**
Fix ShaderInputVars type immediately to establish proper boundaries.

**Estimated Effort:**
- Fix: 1-2 hours
- Testing: 1 hour
- **Total:** 2-3 hours

**Risk:**
Low - change is localized to type definition and adapter layer.
