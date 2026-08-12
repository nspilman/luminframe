void main() {
  vec3 c = texture2D(imageTexture, vUv).rgb;

  // The corpus's 7x7 gaussian gather (see Bloom); Radius spreads the taps
  // across up to ~20 source pixels, so the dial works its whole travel.
  float spread = 1.0 + glowRadius * 19.0;
  vec3 glow = vec3(0.0);
  float total = 0.0;
  for (float i = -3.0; i <= 3.0; i += 1.0) {
    for (float j = -3.0; j <= 3.0; j += 1.0) {
      vec2 off = vec2(i, j) * spread / resolution;
      float w = exp(-(i * i + j * j) / 6.0);
      glow += texture2D(imageTexture, vUv + off).rgb * w;
      total += w;
    }
  }
  glow = glow / total * glowColor * glowStrength;

  // Screen the colored light in — light adds, it never darkens.
  vec3 result = 1.0 - (1.0 - c) * (1.0 - clamp(glow, 0.0, 1.0));
  gl_FragColor = vec4(result, 1.0);
}
