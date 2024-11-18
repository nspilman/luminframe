import { createShaderRecord, createShaderVariable } from '@/hooks/shaderRecordBuilder';

export const colorTint = createShaderRecord({
  name: "Color Tint",
  variables: [
    createShaderVariable('imageTexture').asImage('Source Image'),
    createShaderVariable('tintColor').asVec3('Tint Color', 1.0, 0.0, 0.0),
    createShaderVariable('tintStrength').asRange('Tint Strength', 0.5, 0, 1.0, 0.01),
  ],
  body: `
    void main() {
      vec2 uv = vUv;
      vec4 color = texture2D(imageTexture, uv);
      vec3 tinted = mix(color.rgb, tintColor, tintStrength);
      gl_FragColor = vec4(tinted, color.a);
    }
  `
}); 