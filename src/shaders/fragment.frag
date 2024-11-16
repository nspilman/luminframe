// src/shaders/image/fragment.frag
uniform sampler2D imageTexture;
uniform float time;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 tex1 = texture2D(imageTexture, uv);
  
  float blendValue = (sin(time) + 1.0) * 0.1;
  vec4 color = mix(tex1, vec4(255, 0, 0, 1.0), blendValue);
  
  gl_FragColor = color;
}