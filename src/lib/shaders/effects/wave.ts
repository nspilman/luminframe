import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const wave = createShaderRecord({
  name: "Wave",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('amplitude').asRange('Amplitude', 0.02, 0.0, 0.1, 0.001),
    createShaderVariable('frequency').asRange('Frequency', 10.0, 0.0, 30.0, 0.1),
    createShaderVariable('speed').asRange('Speed', 2.0, 0.0, 5.0, 0.1)
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      
      // Create wave distortion
      float wave = amplitude * sin(frequency * uv.y + time * speed);
      uv.x += wave;
      
      // Sample texture with distorted coordinates
      vec4 color = texture2D(imageTexture, uv);
      
      gl_FragColor = color;
    }
  `
}); 