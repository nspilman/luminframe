import { isHeicFile } from './BrowserFileSystemAdapter';

const file = (name: string, type: string) => new File([], name, { type });

describe('isHeicFile', () => {
  it('image/heic type → true', () => {
    expect(isHeicFile(file('photo.heic', 'image/heic'))).toBe(true);
  });

  it('image/heif type → true', () => {
    expect(isHeicFile(file('photo.heif', 'image/heif'))).toBe(true);
  });

  it('empty type with .HEIC extension → true', () => {
    // Some platforms hand over iPhone photos with no MIME type at all —
    // the extension is the only signal, and iOS capitalizes it.
    expect(isHeicFile(file('IMG_0001.HEIC', ''))).toBe(true);
  });

  it('jpeg type → false', () => {
    expect(isHeicFile(file('photo.jpg', 'image/jpeg'))).toBe(false);
  });

  it('empty type without a heic extension → false', () => {
    expect(isHeicFile(file('mystery.bin', ''))).toBe(false);
  });
});
