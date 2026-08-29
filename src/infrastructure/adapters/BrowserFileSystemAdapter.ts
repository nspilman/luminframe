import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { Image } from '@/domain/models/Image';

/**
 * Whether a file is HEIC/HEIF. Checked by MIME type and by extension: some
 * platforms hand over iPhone photos with an empty `type`, so the name is the
 * only signal there.
 */
export function isHeicFile(file: File): boolean {
  if (file.type === 'image/heic' || file.type === 'image/heif') return true;
  return file.type === '' && /\.(heic|heif)$/i.test(file.name);
}

/** Transcode a HEIC file to a JPEG one the browser's decoder can open. */
async function convertHeicToJpeg(file: File): Promise<File> {
  // Loading the decoder and running it fail for unrelated reasons, so each
  // gets its own sentence. The import breaks when a deploy has replaced the
  // hashed chunk this page's (older) bundle asks for — the SPA fallback
  // answers the 404 with index.html, which is not a module. Only a reload
  // fixes that; no wording about the file would be true.
  //
  // libheif-js, not heic2any: heic2any bundles a libheif old enough that it
  // rejects every modern iPhone photo with ERR_LIBHEIF (verified against real
  // captures) — fine on 2017-era samples, useless for the camera default this
  // path exists for.
  let libheif: typeof import('libheif-js/wasm-bundle');
  try {
    // CJS module: vite may present the exports directly or under .default.
    const mod = (await import('libheif-js/wasm-bundle')) as unknown as
      typeof import('libheif-js/wasm-bundle') & { default?: typeof import('libheif-js/wasm-bundle') };
    libheif = mod.default ?? mod;
  } catch (err) {
    console.error('HEIC decoder chunk failed to load:', err);
    throw new Error('Luminframe was updated since this page loaded — refresh the page and try again.');
  }

  try {
    const decoder = new libheif.HeifDecoder();
    const images = decoder.decode(await file.arrayBuffer());
    const image = images[0];
    if (!image) throw new Error('container holds no image');
    const width = image.get_width();
    const height = image.get_height();
    const decoded = await new Promise<ImageData>((resolve, reject) => {
      image.display(new ImageData(width, height), (result) =>
        result ? resolve(result) : reject(new Error('libheif could not render the image'))
      );
    });
    image.free();

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.putImageData(decoded, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('JPEG encode failed'))), 'image/jpeg', 0.92)
    );
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
  } catch (err) {
    console.error('HEIC decode failed:', err);
    throw new Error(`Couldn't read ${file.name} — this HEIC variant isn't supported. Exporting it as JPEG will work.`);
  }
}

export class BrowserFileSystemAdapter implements ImageLoaderPort, ImageExportPort {
  private static readonly SUPPORTED_TYPES = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/svg+xml',
    'image/heic',
    'image/heif',
  ];

  /**
   * Load an image from a File object
   */
  async loadFromFile(file: File): Promise<Image> {
    // Validate file type
    if (!this.isValidImageFile(file)) {
      throw new Error(
        `Invalid image file type: ${file.type}. Supported types: ${BrowserFileSystemAdapter.SUPPORTED_TYPES.join(', ')}`
      );
    }

    // HEIC (the iPhone camera default) can't be decoded by <img> outside
    // Safari, so it's transcoded to JPEG here — the one door every upload
    // walks through. The decoder is a wasm build of libheif, dynamically
    // imported so only the first HEIC upload pays for it.
    const toLoad = isHeicFile(file) ? await convertHeicToJpeg(file) : file;

    // Use domain model's factory method
    // This is acceptable as Image.fromFile is a factory method
    return await Image.fromFile(toLoad);
  }

  /**
   * Check if a file is a valid image
   */
  isValidImageFile(file: File): boolean {
    return BrowserFileSystemAdapter.SUPPORTED_TYPES.includes(file.type) || isHeicFile(file);
  }

  /**
   * Get list of supported image MIME types
   */
  getSupportedTypes(): string[] {
    return [...BrowserFileSystemAdapter.SUPPORTED_TYPES];
  }

  /**
   * Convert a canvas element to a domain Image object
   */
  async canvasToImage(canvas: HTMLCanvasElement): Promise<Image> {
    // Convert canvas to blob
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    });

    // Create File from blob
    const file = new File([blob], 'canvas-export.png', { type: 'image/png' });

    // Load as Image domain object
    return await this.loadFromFile(file);
  }

  /**
   * Trigger a browser download of a blob
   */
  download(blob: Blob, filename: string): void {
    // Create object URL
    const url = URL.createObjectURL(blob);

    try {
      // Create temporary anchor element
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;

      // Trigger download
      document.body.appendChild(anchor);
      anchor.click();

      // Cleanup
      document.body.removeChild(anchor);
    } finally {
      // Revoke object URL after a delay to ensure download starts
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 100);
    }
  }

}
