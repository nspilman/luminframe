void main() {
  vec3 c = texture2D(imageTexture, vUv).rgb;

  // Step from this pixel toward the light, accumulating bright samples.
  vec2 toLight = vec2(lightX, lightY) - vUv;
  vec2 stepv = toLight / 32.0 * 0.6;
  vec2 uv = vUv;
  float decay = 1.0;
  vec3 rays = vec3(0.0);
  for (int i = 0; i < 32; i++) {
    uv += stepv;
    vec3 s = texture2D(imageTexture, uv).rgb;
    float bright = max(0.0, dot(s, vec3(0.299, 0.587, 0.114)) - threshold);
    rays += s * bright * decay;
    decay *= 0.94;
  }
  rays /= 12.0;

  // Screen the shafts in — the Light family's covenant made structural:
  // light adds, it never darkens, and it can't clip.
  vec3 result = 1.0 - (1.0 - c) * (1.0 - clamp(rays * intensity, 0.0, 1.0));
  gl_FragColor = vec4(result, 1.0);
}
