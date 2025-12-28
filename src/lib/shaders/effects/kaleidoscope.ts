import { createShaderRecord, createShaderVariable } from '@/lib/shaderConfig';

export const kaleidoscope = createShaderRecord({
  name: "Kaleidoscope",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('segments').asRange('Segments', 8.0, 2.0, 32.0, 1.0),
    createShaderVariable('gridSize').asRange('Grid Size', 1.0, 1.0, 4.0, 1.0),
    createShaderVariable('rotation').asRange('Rotation', 0.0, 0.0, Math.PI * 2, 0.01)
  ],
  body: `
  #define PI 3.1415926535897932384626433832795
    void main() {
      // Scale UV to create a grid
      vec2 gridUv = vUv * gridSize;
      vec2 cell = floor(gridUv);
      vec2 cellUv = fract(gridUv);
      
      // Center UV in each cell
      vec2 uv = cellUv - 0.5;
      
      // Convert to polar coordinates
      float radius = length(uv);
      float angle = atan(uv.y, uv.x) + rotation;
      
      // Create kaleidoscope effect
      angle = mod(angle, 2.0 * PI / segments);
      angle = abs(angle - PI / segments);
      
      // Convert back to cartesian coordinates
      uv = radius * vec2(cos(angle), sin(angle));
      uv += 0.5;
      
      // Scale back to original UV space
      uv = (cell + uv) / gridSize;
      
      vec4 color = texture2D(imageTexture, uv);
      gl_FragColor = color;
    }
  `
}); 