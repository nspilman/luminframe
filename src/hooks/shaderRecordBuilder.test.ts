import { createShaderRecord, createShaderVariable } from './shaderRecordBuilder';

describe('shaderRecordBuilder', () => {
  describe('createShaderRecord', () => {
    it('should create a valid shader record with range input', () => {
      const record = createShaderRecord({
        name: 'Test Shader',
        variables: [
          {
            name: 'intensity',
            type: 'float',
            defaultValue: 0.5,
            input: {
              type: 'range',
              label: 'Intensity',
              min: 0,
              max: 1,
              step: 0.1
            }
          }
        ],
        body: 'void main() {}'
      });

      expect(record).toEqual({
        name: 'Test Shader',
        declarationVars: { intensity: 'float',  resolution: "vec2" },
        defaultValues: { intensity: 0.5, },
        inputs: {
          intensity: {
            type: 'range',
            label: 'Intensity',
            min: 0,
            max: 1,
            step: 0.1
          }
        },
        getBody: expect.any(Function)
      });
      expect(record.getBody()).toBe('void main() {}');
    });

    it('should create a valid shader record with image input', () => {
      const record = createShaderRecord({
        name: 'Image Shader',
        variables: [
          {
            name: 'texture',
            type: 'sampler2D',
            defaultValue: null,
            input: {
              type: 'image',
              label: 'Upload Image'
            }
          }
        ],
        body: 'void main() {}'
      });

      expect(record).toEqual({
        name: 'Image Shader',
        declarationVars: { texture: 'sampler2D', resolution: "vec2" },
        defaultValues: { texture: null },
        inputs: {
          texture: {
            type: 'image',
            label: 'Upload Image'
          }
        },
        getBody: expect.any(Function)
      });
    });
  });

  describe('createShaderVariable', () => {
    it('should create range variable correctly', () => {
      const variable = createShaderVariable('intensity')
        .asRange('Intensity', 0.5, 0, 1, 0.1);

      expect(variable).toEqual({
        name: 'intensity',
        type: 'float',
        defaultValue: 0.5,
        input: {
          type: 'range',
          label: 'Intensity',
          min: 0,
          max: 1,
          step: 0.1
        }
      });
    });

    it('should create image variable correctly', () => {
      const variable = createShaderVariable('texture')
        .asImage('Upload Image');

      expect(variable).toEqual({
        name: 'texture',
        type: 'sampler2D',
        defaultValue: null,
        input: {
          type: 'image',
          label: 'Upload Image'
        }
      });
    });

    it('should create vec2 variable correctly', () => {
      const variable = createShaderVariable('offset')
        .asVec2('Offset', 1.0, 0.5);

      expect(variable).toEqual({
        name: 'offset',
        type: 'vec2',
        defaultValue: [1.0, 0.5],
        input: {
          type: 'vec2',
          label: 'Offset'
        }
      });
    });

    it('should create vec3 variable correctly', () => {
      const variable = createShaderVariable('color')
        .asVec3('Color', 1.0, 0.5, 0.2);

      expect(variable).toEqual({
        name: 'color',
        type: 'vec3',
        defaultValue: new Float32Array([1.0, 0.5, 0.2]),
        input: {
          type: 'vec3',
          label: 'Color'
        }
      });
    });

    it('should create vec3 variable with default values when not provided', () => {
      const variable = createShaderVariable('position')
        .asVec3('Position');

      expect(variable).toEqual({
        name: 'position',
        type: 'vec3',
        defaultValue: new Float32Array([0, 0, 0]),
        input: {
          type: 'vec3',
          label: 'Position'
        }
      });
    });

    it('should handle vec3 variable with partial values', () => {
      const variable = createShaderVariable('scale')
        .asVec3('Scale', 2.0);

      expect(variable).toEqual({
        name: 'scale',
        type: 'vec3',
        defaultValue: new Float32Array([2.0, 0, 0]),
        input: {
          type: 'vec3',
          label: 'Scale'
        }
      });
    });

    it('should create vec2 variable with default values when not provided', () => {
      const variable = createShaderVariable('position')
        .asVec2('Position');

      expect(variable).toEqual({
        name: 'position',
        type: 'vec2',
        defaultValue: [0, 0],
        input: {
          type: 'vec2',
          label: 'Position'
        }
      });
    });

    it('should handle vec2 variable with partial values', () => {
      const variable = createShaderVariable('scale')
        .asVec2('Scale', 2.0);

      expect(variable).toEqual({
        name: 'scale',
        type: 'vec2',
        defaultValue: [2.0, 0],
        input: {
          type: 'vec2',
          label: 'Scale'
        }
      });
    });

    it('should handle vec3 variable with array input and ensure Float32Array conversion', () => {
      const variable = createShaderVariable('color')
        .asVec3('Color', ...[0.5, 0.7, 0.9]);

      expect(variable.defaultValue).toBeInstanceOf(Float32Array);
      
      // Use toBeCloseTo for each value to handle floating point precision
      const values = Array.from(variable.defaultValue);
      expect(values[0]).toBeCloseTo(0.5, 6);
      expect(values[1]).toBeCloseTo(0.7, 6);
      expect(values[2]).toBeCloseTo(0.9, 6);

      // For the full object comparison, we'll use the actual Float32Array values
      expect(variable).toEqual({
        name: 'color',
        type: 'vec3',
        defaultValue: variable.defaultValue, // Use the actual values
        input: {
          type: 'vec3',
          label: 'Color'
        }
      });
    });

    it('should handle vec3 variable with incomplete array and pad with zeros', () => {
      const variable = createShaderVariable('color')
        .asVec3('Color', ...[0.5, 0.7]);  // Missing third value
      console.log({variable})
      expect(variable.defaultValue).toBeInstanceOf(Float32Array);
      
      // Use toBeCloseTo for each value to handle floating point precision
      const values = Array.from(variable.defaultValue);
      expect(values[0]).toBeCloseTo(0.5, 6);
      expect(values[1]).toBeCloseTo(0.7, 6);
      expect(values[2]).toBe(0);

      // For the full object comparison, we'll use the actual Float32Array values
      expect(variable).toEqual({
        name: 'color',
        type: 'vec3',
        defaultValue: variable.defaultValue, // Use the actual values
        input: {
          type: 'vec3',
          label: 'Color'
        }
      });
    });

    it('should handle vec3 variables with various input types', () => {
      const record = createShaderRecord({
        name: 'Test Shader',
        variables: [
          // Test null/default values
          createShaderVariable('nullVec').asVec3('Null Vec'),
          // Test regular values
          createShaderVariable('normalVec').asVec3('Normal Vec', 1, 2, 3),
          // Test partial values
          createShaderVariable('partialVec').asVec3('Partial Vec', 1, 2),
          // Test spread array
          createShaderVariable('arrayVec').asVec3('Array Vec', ...[0.5, 0.7, 0.9])
        ],
        body: ''
      });

      // Check null/default case
      expect(record.defaultValues.nullVec).toBeInstanceOf(Float32Array);
      expect(Array.from(record.defaultValues.nullVec)).toEqual([0, 0, 0]);

      // Check normal case
      const normalValues = Array.from(record.defaultValues.normalVec);
      expect(normalValues[0]).toBeCloseTo(1, 6);
      expect(normalValues[1]).toBeCloseTo(2, 6);
      expect(normalValues[2]).toBeCloseTo(3, 6);

      // Check partial values case
      expect(Array.from(record.defaultValues.partialVec)).toEqual([1, 2, 0]);

      // Check array spread case
      const arrayValues = Array.from(record.defaultValues.arrayVec);
      expect(arrayValues[0]).toBeCloseTo(0.5, 6);
      expect(arrayValues[1]).toBeCloseTo(0.7, 6);
      expect(arrayValues[2]).toBeCloseTo(0.9, 6);
    });
  });
}); 