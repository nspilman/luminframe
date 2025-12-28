import { Dimensions } from './Dimensions';

describe('Dimensions', () => {
  describe('constructor', () => {
    it('should create valid dimensions', () => {
      const dimensions = new Dimensions(1920, 1080);
      expect(dimensions.width).toBe(1920);
      expect(dimensions.height).toBe(1080);
    });

    it('should throw error for non-positive width', () => {
      expect(() => new Dimensions(0, 1080)).toThrow('Dimensions must be positive');
      expect(() => new Dimensions(-1, 1080)).toThrow('Dimensions must be positive');
    });

    it('should throw error for non-positive height', () => {
      expect(() => new Dimensions(1920, 0)).toThrow('Dimensions must be positive');
      expect(() => new Dimensions(1920, -1)).toThrow('Dimensions must be positive');
    });

    it('should throw error for non-finite values', () => {
      expect(() => new Dimensions(Infinity, 1080)).toThrow('Dimensions must be finite numbers');
      expect(() => new Dimensions(1920, NaN)).toThrow('Dimensions must be finite numbers');
    });
  });

  describe('getAspectRatio', () => {
    it('should calculate aspect ratio correctly', () => {
      const dimensions = new Dimensions(1920, 1080);
      expect(dimensions.getAspectRatio()).toBeCloseTo(16 / 9);
    });

    it('should handle square dimensions', () => {
      const dimensions = new Dimensions(1000, 1000);
      expect(dimensions.getAspectRatio()).toBe(1);
    });

    it('should handle portrait dimensions', () => {
      const dimensions = new Dimensions(1080, 1920);
      expect(dimensions.getAspectRatio()).toBeCloseTo(9 / 16);
    });
  });

  describe('scale', () => {
    it('should scale dimensions correctly', () => {
      const dimensions = new Dimensions(100, 50);
      const scaled = dimensions.scale(2);
      expect(scaled.width).toBe(200);
      expect(scaled.height).toBe(100);
    });

    it('should round scaled dimensions', () => {
      const dimensions = new Dimensions(100, 100);
      const scaled = dimensions.scale(1.5);
      expect(scaled.width).toBe(150);
      expect(scaled.height).toBe(150);
    });

    it('should throw error for non-positive scale factor', () => {
      const dimensions = new Dimensions(100, 100);
      expect(() => dimensions.scale(0)).toThrow('Scale factor must be positive');
      expect(() => dimensions.scale(-1)).toThrow('Scale factor must be positive');
    });

    it('should create new instance (immutability)', () => {
      const original = new Dimensions(100, 100);
      const scaled = original.scale(2);
      expect(original.width).toBe(100);
      expect(original.height).toBe(100);
      expect(scaled).not.toBe(original);
    });
  });

  describe('equals', () => {
    it('should return true for equal dimensions', () => {
      const dim1 = new Dimensions(1920, 1080);
      const dim2 = new Dimensions(1920, 1080);
      expect(dim1.equals(dim2)).toBe(true);
    });

    it('should return false for different dimensions', () => {
      const dim1 = new Dimensions(1920, 1080);
      const dim2 = new Dimensions(1080, 1920);
      expect(dim1.equals(dim2)).toBe(false);
    });
  });

  describe('toArray', () => {
    it('should convert to array', () => {
      const dimensions = new Dimensions(1920, 1080);
      const array = dimensions.toArray();
      expect(array).toEqual([1920, 1080]);
    });
  });

  describe('fromArray', () => {
    it('should create from array', () => {
      const dimensions = Dimensions.fromArray([1920, 1080]);
      expect(dimensions.width).toBe(1920);
      expect(dimensions.height).toBe(1080);
    });

    it('should validate values from array', () => {
      expect(() => Dimensions.fromArray([0, 1080])).toThrow();
      expect(() => Dimensions.fromArray([-1, 1080])).toThrow();
    });
  });

  describe('toString', () => {
    it('should create string representation', () => {
      const dimensions = new Dimensions(1920, 1080);
      expect(dimensions.toString()).toBe('1920x1080');
    });
  });
});
