void main() {
  vec4 color = texture2D(imageTexture, vUv);

  // Frame-relative on purpose: a vignette follows the frame's own shape, so
  // this is the one radial effect that does NOT correct for aspect (compare
  // Swirl, whose circle must be true).
  float d = distance(vUv, vec2(0.5));

  // Darkening ramps up across a ring toward the corners: smoothness widens
  // the falloff, intensity sets how dark the corners go. Each dial does one
  // thing.
  float edge0 = 0.75 - 0.55 * smoothness;
  float m = smoothstep(edge0, 0.85, d);

  gl_FragColor = vec4(color.rgb * (1.0 - intensity * m), color.a);
}
