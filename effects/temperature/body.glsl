void main() {
  vec3 c = texture2D(imageTexture, vUv).rgb;

  // White balance's two axes: warmth trades red against blue (amber ↔ teal),
  // tint trades green against magenta — the perpendicular correction.
  c.r += warmth * 0.12;
  c.b -= warmth * 0.12;
  c.g += tint * 0.12;

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
