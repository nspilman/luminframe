import { Color } from '@/domain/value-objects/Color';

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

// Convert vec3 values to Color objects
const ensureColor = (value: number[] | Float32Array | Color | null | undefined): Color => {
  if (value === null || value === undefined) {
    return Color.fromRGB(0, 0, 0); // Safe default
  }
  if (value instanceof Color) {
    return value;
  }
  if (value instanceof Float32Array) {
    return Color.fromFloat32Array(value);
  }
  // Handle array
  const arr = Array.from(value);
  if (arr.length < 3) {
    // Pad with zeros
    while (arr.length < 3) arr.push(0);
  }
  return Color.fromRGB(arr[0], arr[1], arr[2]);
};

export const createShaderRecord = (config: ShaderConfig) => {
  const declarationVars = Object.fromEntries(
    config.variables.map(v => [v.name, v.type])
  );
  declarationVars.resolution = "vec2"

  const defaultValues = Object.fromEntries(
    config.variables.map(v => [
      v.name,
      v.type === 'vec3'
        ? ensureColor(v.defaultValue)
        : v.defaultValue
    ])
  );

  const inputs = Object.fromEntries(
    config.variables.map(v => [v.name, v.input])
  );

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
      Color.fromRGB(defaultX, defaultY, defaultZ),
      { type: 'vec3', label }
    ),
  asBoolean: (label: string, defaultValue = false) =>
    createVariable(name, 'bool', defaultValue, { type: 'boolean', label }),
});

