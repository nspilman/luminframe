import { Color } from './Color';

describe('Color', () => {
  describe('constructor via fromRGB', () => {
    it('should create valid color', () => {
      const color = Color.fromRGB(0.5, 0.25, 0.75);
      expect(color.r).toBe(0.5);
      expect(color.g).toBe(0.25);
      expect(color.b).toBe(0.75);
    });

    it('should accept boundary values', () => {
      const black = Color.fromRGB(0, 0, 0);
      expect(black.r).toBe(0);
      const white = Color.fromRGB(1, 1, 1);
      expect(white.r).toBe(1);
    });

    it('should throw error for values out of range', () => {
      expect(() => Color.fromRGB(-0.1, 0, 0)).toThrow('red channel must be between 0 and 1');
      expect(() => Color.fromRGB(1.1, 0, 0)).toThrow('red channel must be between 0 and 1');
      expect(() => Color.fromRGB(0, -0.1, 0)).toThrow('green channel must be between 0 and 1');
      expect(() => Color.fromRGB(0, 0, 1.1)).toThrow('blue channel must be between 0 and 1');
    });

    it('should throw error for non-finite values', () => {
      expect(() => Color.fromRGB(NaN, 0, 0)).toThrow('red channel must be a finite number');
      expect(() => Color.fromRGB(Infinity, 0, 0)).toThrow('red channel must be a finite number');
    });
  });

  describe('toFloat32Array', () => {
    it('should convert to Float32Array', () => {
      const color = Color.fromRGB(0.5, 0.25, 0.75);
      const array = color.toFloat32Array();
      expect(array).toBeInstanceOf(Float32Array);
      expect(array[0]).toBe(0.5);
      expect(array[1]).toBe(0.25);
      expect(array[2]).toBe(0.75);
    });
  });

  describe('toHex', () => {
    it('should convert to hex string', () => {
      const color = Color.fromRGB(1, 0, 0);
      expect(color.toHex()).toBe('#ff0000');
    });

    it('should handle partial values', () => {
      const color = Color.fromRGB(0.5, 0.5, 0.5);
      expect(color.toHex()).toBe('#808080');
    });

    it('should pad with zeros', () => {
      const color = Color.fromRGB(0, 0, 0);
      expect(color.toHex()).toBe('#000000');
    });
  });

  describe('toRGBObject', () => {
    it('should convert to RGB object', () => {
      const color = Color.fromRGB(0.5, 0.25, 0.75);
      const rgb = color.toRGBObject();
      expect(rgb).toEqual({ r: 0.5, g: 0.25, b: 0.75 });
    });
  });

  describe('toRGB255', () => {
    it('should convert to 0-255 RGB object', () => {
      const color = Color.fromRGB(1, 0.5, 0);
      const rgb = color.toRGB255();
      expect(rgb).toEqual({ r: 255, g: 128, b: 0 });
    });
  });

  describe('equals', () => {
    it('should return true for equal colors', () => {
      const color1 = Color.fromRGB(0.5, 0.5, 0.5);
      const color2 = Color.fromRGB(0.5, 0.5, 0.5);
      expect(color1.equals(color2)).toBe(true);
    });

    it('should return false for different colors', () => {
      const color1 = Color.fromRGB(0.5, 0.5, 0.5);
      const color2 = Color.fromRGB(0.6, 0.5, 0.5);
      expect(color1.equals(color2)).toBe(false);
    });
  });

  describe('fromHex', () => {
    it('should create color from hex string', () => {
      const color = Color.fromHex('#ff0000');
      expect(color.r).toBe(1);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    });

    it('should handle hex without #', () => {
      const color = Color.fromHex('00ff00');
      expect(color.r).toBe(0);
      expect(color.g).toBe(1);
      expect(color.b).toBe(0);
    });

    it('should throw error for invalid hex', () => {
      expect(() => Color.fromHex('#xyz')).toThrow('Invalid hex color');
      expect(() => Color.fromHex('#12345')).toThrow('Invalid hex color');
    });

    it('should round-trip hex conversion', () => {
      const original = Color.fromRGB(0.5, 0.25, 0.75);
      const hex = original.toHex();
      const converted = Color.fromHex(hex);
      // Allow for small rounding differences
      expect(Math.abs(converted.r - original.r)).toBeLessThan(0.01);
      expect(Math.abs(converted.g - original.g)).toBeLessThan(0.01);
      expect(Math.abs(converted.b - original.b)).toBeLessThan(0.01);
    });
  });

  describe('fromFloat32Array', () => {
    it('should create color from Float32Array', () => {
      const array = new Float32Array([0.5, 0.25, 0.75]);
      const color = Color.fromFloat32Array(array);
      expect(color.r).toBe(0.5);
      expect(color.g).toBe(0.25);
      expect(color.b).toBe(0.75);
    });

    it('should create color from regular array', () => {
      const color = Color.fromFloat32Array([0.5, 0.25, 0.75]);
      expect(color.r).toBe(0.5);
    });

    it('should throw error for array with less than 3 elements', () => {
      expect(() => Color.fromFloat32Array([0.5, 0.25])).toThrow('Array must have at least 3 elements');
    });

    it('should ignore extra elements', () => {
      const color = Color.fromFloat32Array([0.5, 0.25, 0.75, 1.0]);
      expect(color.r).toBe(0.5);
      expect(color.g).toBe(0.25);
      expect(color.b).toBe(0.75);
    });
  });

  describe('fromRGB255', () => {
    it('should create color from 0-255 values', () => {
      const color = Color.fromRGB255(255, 128, 0);
      expect(color.r).toBe(1);
      expect(color.g).toBeCloseTo(128 / 255);
      expect(color.b).toBe(0);
    });
  });

  describe('constants', () => {
    it('should have BLACK constant', () => {
      expect(Color.BLACK.r).toBe(0);
      expect(Color.BLACK.g).toBe(0);
      expect(Color.BLACK.b).toBe(0);
    });

    it('should have WHITE constant', () => {
      expect(Color.WHITE.r).toBe(1);
      expect(Color.WHITE.g).toBe(1);
      expect(Color.WHITE.b).toBe(1);
    });

    it('should have RED constant', () => {
      expect(Color.RED.r).toBe(1);
      expect(Color.RED.g).toBe(0);
      expect(Color.RED.b).toBe(0);
    });
  });

  describe('toString', () => {
    it('should return hex representation', () => {
      const color = Color.fromRGB(1, 0, 0);
      expect(color.toString()).toBe('#ff0000');
    });
  });
});
