// src/shaders/image/fragment.frag
uniform sampler2D imageOneTexture;
uniform sampler2D imageTwoTexture;
uniform float time;

varying vec2 vUv;

void main() {
  vec2 uv = vUv;
  vec4 tex1 = texture2D(imageOneTexture, uv);
  vec4 tex2 = texture2D(imageTwoTexture, uv);
  
  float blendValue = (sin(time) + 1.0) * 0.5;
  vec4 color = mix(tex1, tex2, blendValue);
  
  gl_FragColor = color;
}