void main() {
  vec3 c = texture2D(imageTexture, vUv).rgb;

  // Exposure in photographic stops — each stop doubles the light.
  c *= exp2(exposure);

  // Contrast pivots on middle grey, the same form Black & White uses.
  c = (c - 0.5) * contrast + 0.5;

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
