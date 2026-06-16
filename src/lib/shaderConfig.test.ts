import { createShaderRecord, createShaderVariable } from './shaderConfig';
import { Color } from '@/domain/value-objects/Color';

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

      // Every record gains an `opacity` float + range control (see wrapBodyWithOpacity).
      expect(record).toEqual({
        name: 'Test Shader',
        declarationVars: { intensity: 'float',  resolution: "vec2", opacity: 'float' },
        defaultValues: { intensity: 0.5, opacity: 1.0 },
        inputs: {
          intensity: {
            type: 'range',
            label: 'Intensity',
            min: 0,
            max: 1,
            step: 0.1
          },
          opacity: { type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.01 }
        },
        getBody: expect.any(Function)
      });
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
        declarationVars: { texture: 'sampler2D', resolution: "vec2", opacity: 'float' },
        defaultValues: { texture: null, opacity: 1.0 },
        inputs: {
          texture: {
            type: 'image',
            label: 'Upload Image'
          },
          opacity: { type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.01 }
        },
        getBody: expect.any(Function)
      });
    });

    it('should preserve a Color default for vec3 variables', () => {
      const record = createShaderRecord({
        name: 'Tint Shader',
        variables: [createShaderVariable('tint').asVec3('Tint', 1.0, 0.0, 0.0)],
        body: 'void main() {}'
      });

      expect(record.declarationVars).toEqual({ tint: 'vec3', resolution: 'vec2', opacity: 'float' });
      expect(record.defaultValues.tint).toEqual(Color.fromRGB(1.0, 0.0, 0.0));
    });

    it('adds an opacity control and blends the body output by it', () => {
      const record = createShaderRecord({
        name: 'Plain',
        variables: [createShaderVariable('imageTexture').asImage('Source')],
        body: 'void main() { gl_FragColor = vec4(1.0); }'
      });

      // The control surface every effect inherits.
      expect(record.declarationVars.opacity).toBe('float');
      expect(record.defaultValues.opacity).toBe(1.0);
      expect(record.inputs.opacity).toEqual({ type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.01 });

      // The body is rewritten to write a temp, then mix it with the input by opacity.
      const glsl = record.getBody();
      expect(glsl).toContain('void lfEffectMain(');
      expect(glsl).not.toContain('void main() { gl_FragColor');
      expect(glsl).toContain('gl_FragColor = mix(lfSrcColor, lfFragColor, opacity);');
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

    it('should create a vec3 from three channels', () => {
      const variable = createShaderVariable('color')
        .asVec3('Color', 1.0, 0.5, 0.2);

      // GLSL declaration type stays 'vec3'; the UI input type is 'color'.
      expect(variable).toEqual({
        name: 'color',
        type: 'vec3',
        defaultValue: Color.fromRGB(1.0, 0.5, 0.2),
        input: {
          type: 'color',
          label: 'Color'
        }
      });
    });

    it('should default all vec3 channels to 0 when none are provided', () => {
      const variable = createShaderVariable('position')
        .asVec3('Position');

      expect(variable).toEqual({
        name: 'position',
        type: 'vec3',
        defaultValue: Color.fromRGB(0, 0, 0),
        input: {
          type: 'color',
          label: 'Position'
        }
      });
    });

    it('should default omitted vec3 channels to 0', () => {
      const variable = createShaderVariable('scale')
        .asVec3('Scale', 0.5);

      expect(variable).toEqual({
        name: 'scale',
        type: 'vec3',
        defaultValue: Color.fromRGB(0.5, 0, 0),
        input: {
          type: 'color',
          label: 'Scale'
        }
      });
    });

    it('should reject a vec3 channel outside 0-1', () => {
      // vec3 defaults are Color value objects, normalized to 0-1.
      // An author passing 0-255 values (here: 2) is a real mistake to surface.
      expect(() => createShaderVariable('bad').asVec3('Bad', 2)).toThrow(
        /between 0 and 1/
      );
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

    it('should create boolean variable correctly', () => {
      const variable = createShaderVariable('useEffect')
        .asBoolean('Enable Effect', true);

      expect(variable).toEqual({
        name: 'useEffect',
        type: 'bool',
        defaultValue: true,
        input: {
          type: 'boolean',
          label: 'Enable Effect'
        }
      });

      // Test with default value (false)
      const defaultVariable = createShaderVariable('showOverlay')
        .asBoolean('Show Overlay');

      expect(defaultVariable).toEqual({
        name: 'showOverlay',
        type: 'bool',
        defaultValue: false,
        input: {
          type: 'boolean',
          label: 'Show Overlay'
        }
      });
    });
  });

  describe('createShaderRecord with boolean variables', () => {
    it('should correctly create a shader record with boolean input', () => {
      const shaderRecord = createShaderRecord({
        name: 'Test Boolean Shader',
        variables: [
          createShaderVariable('invertColors').asBoolean('Invert Colors', true)
        ],
        body: 'void main() {}'
      });

      expect(shaderRecord).toEqual({
        name: 'Test Boolean Shader',
        declarationVars: {
          invertColors: 'bool',
          resolution: 'vec2',
          opacity: 'float'
        },
        defaultValues: {
          invertColors: true,
          opacity: 1.0
        },
        inputs: {
          invertColors: {
            type: 'boolean',
            label: 'Invert Colors'
          },
          opacity: { type: 'range', label: 'Opacity', min: 0, max: 1, step: 0.01 }
        },
        getBody: expect.any(Function)
      });
    });
  });
}); 