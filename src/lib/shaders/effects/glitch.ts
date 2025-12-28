import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const glitch = createShaderRecord({
  name: "Glitch",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('intensity').asRange('Intensity', 0.1, 0.0, 1.0, 0.01),
    createShaderVariable('speed').asRange('Speed', 1.0, 0.0, 5.0, 0.1)
  ],
  body: `
    float random(vec2 co) {
      return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
    }
    
    void main() {
      vec2 uv = vUv;
      
      // Create time-based glitch effect
      float noise = random(vec2(floor(time * speed), floor(uv.y * 100.0)));
      float glitchAmount = step(1.0 - intensity * 0.1, noise);
      
      // Apply horizontal displacement
      uv.x += glitchAmount * (random(vec2(time)) * 2.0 - 1.0) * intensity;
      
      // Color channel splitting
      vec2 redOffset = vec2(intensity * 0.01, 0.0);
      vec2 greenOffset = vec2(0.0, intensity * 0.01);
      vec2 blueOffset = vec2(-intensity * 0.01, 0.0);
      
      float r = texture2D(imageTexture, uv + redOffset).r;
      float g = texture2D(imageTexture, uv + greenOffset).g;
      float b = texture2D(imageTexture, uv + blueOffset).b;
      
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
}); 