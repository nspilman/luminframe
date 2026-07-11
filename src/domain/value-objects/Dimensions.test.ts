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

  describe('toArray', () => {
    it('should convert to array', () => {
      const dimensions = new Dimensions(1920, 1080);
      expect(dimensions.toArray()).toEqual([1920, 1080]);
    });
  });
});
