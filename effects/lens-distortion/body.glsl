void main() {
  // Radius measured in the picture's own square space — x scaled by aspect —
  // so the barrel bulges as a circle, the way glass does, not an ellipse.
  float aspect = resolution.x / resolution.y;
  vec2 c = (vUv - 0.5) * vec2(aspect, 1.0);
  float r2 = dot(c, c);
  vec2 uv = 0.5 + c * (1.0 + amount * r2) / vec2(aspect, 1.0);

  // Pixels pulled from outside the frame read as black rather than smeared.
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  gl_FragColor = vec4(texture2D(imageTexture, uv).rgb, 1.0);
}
