/**
 * Hand-written surface for libheif-js (ships no types) — only what the HEIC
 * transcode path touches. The wasm-bundle entry inlines the wasm, so the
 * whole decoder arrives as one lazily-imported chunk.
 */
declare module 'libheif-js/wasm-bundle' {
  export interface HeifImage {
    get_width(): number;
    get_height(): number;
    /** Fills `target` with decoded RGBA; calls back with null on failure. */
    display(target: ImageData, callback: (result: ImageData | null) => void): void;
    free(): void;
  }
  export class HeifDecoder {
    decode(buffer: ArrayBuffer | Uint8Array): HeifImage[];
  }
}
