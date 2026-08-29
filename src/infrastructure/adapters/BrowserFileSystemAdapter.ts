import { ImageLoaderPort } from '@/application/ports/ImageLoaderPort';
import { ImageExportPort } from '@/application/ports/ImageExportPort';
import { Image } from '@/domain/models/Image';
import { scaleToLongestSide } from '@/lib/exportCanvasForUpload';

// The most pixels a loaded source may have on its longest side. 4096 is the
// floor of the constraints a source must fit under everywhere the app runs:
// iOS WebKit refuses canvases past ~16.7M pixels (4096² exactly), the lowest
// common WebGL max texture size is 4096, and a phone decoding beyond it spikes
// enough memory that Safari jettisons the WebGL context — the canvas goes
// permanently black while <img> keeps working. Bigger sources are downscaled
// once, at the load door, so no later surface has to defend itself.
// ponytail: fixed floor — query the real GPU cap per device if 4K-native
// editing is ever asked for.
const MAX_SOURCE_EDGE = 4096;

/**
 * Draw a decoded frame at capped size and re-encode it as a File. The frame
 * arrives as an ImageBitmap so no full-size canvas ever exists — drawImage
 * scales straight onto the capped one.
 */
async function encodeScaled(
  bitmap: ImageBitmap,
  name: string,
  mimeType: string
): Promise<File> {
  const { width, height } = scaleToLongestSide(bitmap.width, bitmap.height, MAX_SOURCE_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('image encode failed'))), mimeType, 0.92)
  );
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  return new File([blob], name.replace(/\.[a-z0-9]+$/i, '') + '.' + ext, { type: mimeType });
}

/**
 * Downscale a raster file to MAX_SOURCE_EDGE if it exceeds it; smaller files
 * (and vectors, and files this browser can't decode — the load path reports
 * those) pass through untouched. PNG keeps alpha; everything else re-encodes
 * as JPEG.
 */
async function capToMaxEdge(file: File): Promise<File> {
  if (file.type === 'image/svg+xml') return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }
  try {
    if (Math.max(bitmap.width, bitmap.height) <= MAX_SOURCE_EDGE) return file;
    const keepAlpha = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
    return await encodeScaled(bitmap, file.name, keepAlpha ? 'image/png' : 'image/jpeg');
  } finally {
    bitmap.close();
  }
}

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

    // Through an ImageBitmap, capped: a 24MP iPhone frame drawn onto a
    // same-size canvas is past iOS's canvas ceiling, and the untouched
    // full-size pixels would blow the texture/memory limits next anyway.
    const bitmap = await createImageBitmap(decoded);
    try {
      return await encodeScaled(bitmap, file.name, 'image/jpeg');
    } finally {
      bitmap.close();
    }
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
    // Every source funnels through the size cap; HEIC caps inside its own
    // conversion, so it skips the second decode.
    const toLoad = isHeicFile(file) ? await convertHeicToJpeg(file) : await capToMaxEdge(file);

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
