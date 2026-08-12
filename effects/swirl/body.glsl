void main() {
  // Measure from center in the picture's own square space — x scaled by
  // aspect — so the vortex is a true circle on any frame (Text does the same
  // for its letters).
  float aspect = resolution.x / resolution.y;
  vec2 c = (vUv - 0.5) * vec2(aspect, 1.0);
  float dist = length(c);

  // Twist strongest at the center, easing to zero at the radius.
  float angle = amount * smoothstep(radius, 0.0, dist);
  float s = sin(angle);
  float co = cos(angle);
  vec2 r = vec2(c.x * co - c.y * s, c.x * s + c.y * co);

  gl_FragColor = vec4(texture2D(imageTexture, 0.5 + r / vec2(aspect, 1.0)).rgb, 1.0);
}
