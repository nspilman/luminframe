import { Image } from './Image';
import { Dimensions } from '../value-objects/Dimensions';

describe('Image', () => {
  describe('constructor', () => {
    it('should create valid image', () => {
      const dimensions = new Dimensions(100, 100);
      const image = new Image('test-id', dimensions, { url: 'test.jpg' });

      expect(image.id).toBe('test-id');
      expect(image.dimensions).toBe(dimensions);
      expect(image.data.url).toBe('test.jpg');
    });

    it('should throw error for empty ID', () => {
      const dimensions = new Dimensions(100, 100);
      expect(() => new Image('', dimensions, { url: 'test.jpg' }))
        .toThrow('Image ID is required');
    });

    it('should throw error for empty URL', () => {
      const dimensions = new Dimensions(100, 100);
      expect(() => new Image('test-id', dimensions, { url: '' }))
        .toThrow('Image URL is required');
    });
  });

  describe('getAspectRatio', () => {
    it('should return aspect ratio', () => {
      const dimensions = new Dimensions(1920, 1080);
      const image = new Image('test-id', dimensions, { url: 'test.jpg' });

      expect(image.getAspectRatio()).toBeCloseTo(16 / 9);
    });
  });

  describe('getDimensions', () => {
    it('should return dimensions', () => {
      const dimensions = new Dimensions(100, 100);
      const image = new Image('test-id', dimensions, { url: 'test.jpg' });

      expect(image.getDimensions()).toBe(dimensions);
    });
  });

  describe('fromFile', () => {
    it('should load image from file', async () => {
      // Create a mock file
      const blob = new Blob(['fake image data'], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });

      // Mock Image constructor
      const originalImage = global.Image;
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';
        width = 100;
        height = 200;

        set src(value: string) {
          this._src = value;
          // Simulate async image load
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      } as any;

      const image = await Image.fromFile(file);

      expect(image.dimensions.width).toBe(100);
      expect(image.dimensions.height).toBe(200);
      expect(image.data.blob).toBe(file);
      expect(image.data.url).toMatch(/^blob:/);

      // Cleanup
      image.dispose();
      global.Image = originalImage;
    });

    it('should reject non-image files', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(Image.fromFile(file))
        .rejects
        .toThrow('File must be an image');
    });

    it('should handle image load errors', async () => {
      const blob = new Blob(['fake image data'], { type: 'image/png' });
      const file = new File([blob], 'test.png', { type: 'image/png' });

      // Mock Image constructor that fails
      const originalImage = global.Image;
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';

        set src(value: string) {
          this._src = value;
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      } as any;

      await expect(Image.fromFile(file))
        .rejects
        .toThrow('Failed to load image');

      global.Image = originalImage;
    });
  });

  describe('fromUrl', () => {
    it('should load image from URL', async () => {
      const originalImage = global.Image;
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';
        crossOrigin = '';
        width = 300;
        height = 400;

        set src(value: string) {
          this._src = value;
          setTimeout(() => {
            if (this.onload) {
              this.onload();
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      } as any;

      const image = await Image.fromUrl('https://example.com/image.jpg');

      expect(image.dimensions.width).toBe(300);
      expect(image.dimensions.height).toBe(400);
      expect(image.data.url).toBe('https://example.com/image.jpg');
      expect(image.data.blob).toBeUndefined();

      global.Image = originalImage;
    });

    it('should handle URL load errors', async () => {
      const originalImage = global.Image;
      global.Image = class MockImage {
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        private _src = '';
        crossOrigin = '';

        set src(value: string) {
          this._src = value;
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 0);
        }

        get src() {
          return this._src;
        }
      } as any;

      await expect(Image.fromUrl('https://example.com/missing.jpg'))
        .rejects
        .toThrow('Failed to load image from');

      global.Image = originalImage;
    });
  });

  describe('dispose', () => {
    it('should revoke blob URL', () => {
      // Mock URL.revokeObjectURL
      const originalRevoke = URL.revokeObjectURL;
      const mockRevoke = jest.fn();
      URL.revokeObjectURL = mockRevoke;

      const dimensions = new Dimensions(100, 100);
      const blob = new Blob(['test'], { type: 'image/png' });
      const image = new Image('test-id', dimensions, {
        url: 'blob:http://localhost/test',
        blob
      });

      image.dispose();

      expect(mockRevoke).toHaveBeenCalledWith('blob:http://localhost/test');
      URL.revokeObjectURL = originalRevoke;
    });

    it('should not revoke non-blob URLs', () => {
      // Mock URL.revokeObjectURL
      const originalRevoke = URL.revokeObjectURL;
      const mockRevoke = jest.fn();
      URL.revokeObjectURL = mockRevoke;

      const dimensions = new Dimensions(100, 100);
      const image = new Image('test-id', dimensions, {
        url: 'https://example.com/image.jpg'
      });

      image.dispose();

      expect(mockRevoke).not.toHaveBeenCalled();
      URL.revokeObjectURL = originalRevoke;
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      const dimensions = new Dimensions(1920, 1080);
      const image = new Image('test-id', dimensions, { url: 'test.jpg' });

      expect(image.toString()).toBe('Image(test-id, 1920x1080)');
    });
  });
});
