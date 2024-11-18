import { describe, expect, it } from 'vitest';
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

      console.log({record})

      expect(record).toEqual({
        name: 'Test Shader',
        declarationVars: { intensity: 'float' },
        defaultValues: { intensity: 0.5 },
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
        declarationVars: { texture: 'sampler2D' },
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
        .asVec2('Offset', 0.5, 0.3);

      expect(variable).toEqual({
        name: 'offset',
        type: 'vec2',
        defaultValue: [0.5, 0.3],
        input: {
          type: 'vec2',
          label: 'Offset'
        }
      });
    });
  });
}); 