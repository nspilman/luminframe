import * as THREE from 'three';
import { RenderingPort } from '@/application/ports/RenderingPort';
import { Image } from '@/domain/models/Image';
import { Dimensions } from '@/domain/value-objects/Dimensions';
import { ImageFormat } from '@/domain/value-objects/ImageFormat';
import { RenderResult } from '@/domain/value-objects/RenderResult';
import { ShaderEffect } from '@/types/shader';
import { ShaderInputVars } from '@/types/shader';
import { Color } from '@/domain/value-objects/Color';
import { TextureAdapter } from '@/adapters/TextureAdapter';

/**
 * Three.js implementation of the RenderingPort.
 * Handles WebGL rendering using Three.js library.
 *
 * This adapter isolates Three.js specifics from the application layer,
 * allowing the rendering engine to be swapped without affecting business logic.
 */
export class ThreeJSRenderingAdapter implements RenderingPort {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.OrthographicCamera | null = null;
  private mesh: THREE.Mesh | null = null;
  private textureAdapter: TextureAdapter;
  private currentDimensions: Dimensions;

  constructor(
    canvas?: HTMLCanvasElement,
    initialDimensions: Dimensions = new Dimensions(800, 600)
  ) {
    this.textureAdapter = new TextureAdapter();
    this.currentDimensions = initialDimensions;

    if (canvas) {
      this.initializeRenderer(canvas);
    }
  }

  /**
   * Initialize the Three.js renderer with a canvas element
   */
  private initializeRenderer(canvas: HTMLCanvasElement): void {
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      preserveDrawingBuffer: true, // Required for canvas export
    });

    this.renderer.setSize(
      this.currentDimensions.width,
      this.currentDimensions.height
    );

    // Create scene
    this.scene = new THREE.Scene();

    // Create orthographic camera
    const aspect = this.currentDimensions.getAspectRatio();
    this.camera = new THREE.OrthographicCamera(
      -aspect,
      aspect,
      1,
      -1,
      0.1,
      1000
    );
    this.camera.position.z = 1;
  }

  /**
   * Set the canvas element for rendering
   * @param canvas - The canvas to render to
   */
  setCanvas(canvas: HTMLCanvasElement): void {
    if (!this.renderer) {
      this.initializeRenderer(canvas);
    }
  }

  /**
   * Convert domain types to Three.js uniforms
   */
  private convertToUniforms(inputVars: ShaderInputVars): Record<string, { value: any }> {
    const uniforms: Record<string, { value: any }> = {
      time: { value: 0 }, // Will be updated in animation loop if needed
    };

    for (const [key, value] of Object.entries(inputVars)) {
      if (value instanceof Image) {
        // Convert Image domain model to Three.js Texture
        const handle = this.textureAdapter.createTexture(value);
        uniforms[key] = { value: handle.texture };
      } else if (value instanceof Color) {
        // Convert Color value object to Three.js Vector3
        const arr = value.toFloat32Array();
        uniforms[key] = { value: new THREE.Vector3(arr[0], arr[1], arr[2]) };
      } else if (Array.isArray(value)) {
        // Convert arrays to appropriate Three.js vector types
        if (value.length === 2) {
          uniforms[key] = { value: new THREE.Vector2(...value) };
        } else if (value.length === 3) {
          uniforms[key] = { value: new THREE.Vector3(...value) };
        } else if (value.length === 4) {
          uniforms[key] = { value: new THREE.Vector4(...value) };
        } else {
          uniforms[key] = { value };
        }
      } else if (value instanceof Float32Array && value.length === 3) {
        // Legacy Float32Array color support
        uniforms[key] = { value: new THREE.Vector3(value[0], value[1], value[2]) };
      } else if (
        typeof value === 'number' ||
        typeof value === 'string' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        uniforms[key] = { value };
      } else {
        // Pass through other objects as-is
        uniforms[key] = { value };
      }
    }

    return uniforms;
  }

  /**
   * Build vertex shader (standard for all effects)
   */
  private getVertexShader(): string {
    return `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  /**
   * Render a scene with the given shader effect and parameters
   */
  renderScene(
    image: Image,
    effect: ShaderEffect,
    params: ShaderInputVars
  ): RenderResult {
    if (!this.renderer || !this.scene || !this.camera) {
      throw new Error('Renderer not initialized. Call setCanvas() first.');
    }

    // Ensure image is in params
    const allParams: ShaderInputVars = {
      ...params,
      imageTexture: params.imageTexture || image,
    };

    // Convert parameters to uniforms
    const uniforms = this.convertToUniforms(allParams);

    // Create shader material
    const material = new THREE.ShaderMaterial({
      vertexShader: this.getVertexShader(),
      fragmentShader: effect.getBody(), // This should be the complete GLSL shader
      uniforms,
      transparent: true,
    });

    // Create or update mesh
    if (!this.mesh) {
      const geometry = new THREE.PlaneGeometry(2, 2); // Full-screen quad
      this.mesh = new THREE.Mesh(geometry, material);
      this.scene.add(this.mesh);
    } else {
      // Dispose old material
      const oldMaterial = this.mesh.material;
      if (Array.isArray(oldMaterial)) {
        oldMaterial.forEach((mat) => mat.dispose());
      } else if (oldMaterial instanceof THREE.Material) {
        oldMaterial.dispose();
      }

      // Update material
      this.mesh.material = material;
    }

    // Render
    this.renderer.render(this.scene, this.camera);

    // Get rendered result
    const canvas = this.renderer.domElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }

    const imageData = ctx.getImageData(
      0,
      0,
      this.currentDimensions.width,
      this.currentDimensions.height
    );

    return new RenderResult(imageData, this.currentDimensions);
  }

  /**
   * Export the current canvas to a blob
   */
  async exportCanvas(
    dimensions: Dimensions,
    format: ImageFormat
  ): Promise<Blob> {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call setCanvas() first.');
    }

    const canvas = this.renderer.domElement;

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob from canvas'));
          }
        },
        format.getMimeType(),
        format.getQuality()
      );
    });
  }

  /**
   * Get the current canvas element
   */
  getCanvas(): HTMLCanvasElement | null {
    return this.renderer?.domElement || null;
  }

  /**
   * Update canvas dimensions
   */
  updateDimensions(dimensions: Dimensions): void {
    this.currentDimensions = dimensions;

    if (this.renderer) {
      this.renderer.setSize(dimensions.width, dimensions.height);
    }

    if (this.camera) {
      const aspect = dimensions.getAspectRatio();
      this.camera.left = -aspect;
      this.camera.right = aspect;
      this.camera.top = 1;
      this.camera.bottom = -1;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Clean up Three.js resources
   */
  dispose(): void {
    // Dispose mesh
    if (this.mesh) {
      this.mesh.geometry.dispose();

      // Dispose material(s)
      const material = this.mesh.material;
      if (Array.isArray(material)) {
        material.forEach((mat) => mat.dispose());
      } else if (material instanceof THREE.Material) {
        material.dispose();
      }

      this.scene?.remove(this.mesh);
      this.mesh = null;
    }

    // Dispose scene
    this.scene = null;

    // Dispose renderer
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }

    // Clear texture cache
    this.textureAdapter.clearCache();

    // Reset camera
    this.camera = null;
  }

  /**
   * Update time uniform for animated effects
   * @param time - Time in seconds
   */
  updateTime(time: number): void {
    if (this.mesh && this.mesh.material instanceof THREE.ShaderMaterial) {
      this.mesh.material.uniforms.time.value = time;
    }
  }
}
