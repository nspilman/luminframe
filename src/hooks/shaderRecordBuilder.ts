type InputType = 'image' | 'range' | 'color' | 'number';

interface RangeInput {
  type: 'range';
  min: number;
  max: number;
  step: number;
  label: string;
}

interface ImageInput {
  type: 'image';
  label: string;
}

interface Vec2Input {
    type: 'vec2';
      label: string;
  }

interface Vec3Input {
  type: 'vec3';
  label: string;
  normalize?: boolean;
}

interface BooleanInput {
  type: 'boolean';
  label: string;
}

type ShaderInput = RangeInput | ImageInput | Vec2Input | Vec3Input | BooleanInput;

interface ShaderVariable {
  name: string;
  type: string;
  defaultValue: any;
  input: ShaderInput;
}

interface ShaderConfig {
  name: string;
  variables: ShaderVariable[];
  body: string;
}

// Enhance the utility function with validation
const ensureFloat32Array = (value: number[] | Float32Array | null | undefined): Float32Array => {
  if (value === null || value === undefined) {
    return new Float32Array([0, 0, 0]); // Safe default
  }
  if (value instanceof Float32Array) {
    return value;
  }
  // Ensure we always have exactly 3 components
  const safeArray = Array.from(value).slice(0, 3);
  while (safeArray.length < 3) {
    safeArray.push(0);
  }
  return new Float32Array(safeArray);
};

export const createShaderRecord = (config: ShaderConfig) => {
  const declarationVars = Object.fromEntries(
    config.variables.map(v => [v.name, v.type])
  );

  console.log({config})

  declarationVars.resolution = "vec2"

  const defaultValues = Object.fromEntries(
    config.variables.map(v => [
      v.name,
      v.type === 'vec3' 
        ? ensureFloat32Array(v.defaultValue)
        : v.defaultValue
    ])
  );

  console.log({config, defaultValues})

  const inputs = Object.fromEntries(
    config.variables.map(v => [v.name, v.input])
  );

  console.log({defaultValues})

  return {
    name: config.name,
    declarationVars,
    defaultValues,
    inputs,
    getBody: () => config.body,
  };
};

// Helper functions to make creating variables more declarative
const createVariable = (
  name: string,
  type: string,
  defaultValue: any,
  input: ShaderInput
): ShaderVariable => ({
  name,
  type,
  defaultValue,
  input
});

const createRangeInput = (
  label: string,
  min: number,
  max: number,
  step: number
): RangeInput => ({
  type: 'range',
  label,
  min,
  max,
  step
});

const createImageInput = (label: string): ImageInput => ({
  type: 'image',
  label
});

// You could also create more specific helpers for your common use cases:
export const createShaderVariable = (name: string) => ({
  asImage: (label: string) => 
    createVariable(name, 'sampler2D', null, createImageInput(label)),
  asRange: (label: string, defaultValue: number, min: number, max: number, step: number) =>
    createVariable(name, 'float', defaultValue, createRangeInput(label, min, max, step)),
  asVec2: (label: string, defaultX = 0, defaultY = 0) =>
    createVariable(name, 'vec2', [defaultX, defaultY], { type: 'vec2', label }),
  asVec3: (label: string, defaultX = 0, defaultY = 0, defaultZ = 0) =>
    createVariable(
      name, 
      'vec3', 
      new Float32Array([defaultX, defaultY, defaultZ]),
      { type: 'vec3', label }
    ),
  asBoolean: (label: string, defaultValue = false) =>
    createVariable(name, 'bool', defaultValue, { type: 'boolean', label }),
});

