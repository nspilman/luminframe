void main() {
  // The fringe grows with distance from center, measured in the picture's own
  // square space — x scaled by aspect — so equal fringe traces a true circle,
  // the way it does through real glass.
  float aspect = resolution.x / resolution.y;
  vec2 dir = (vUv - 0.5) * vec2(aspect, 1.0);
  vec2 offset = dir * dot(dir, dir) * amount * 4.0 / vec2(aspect, 1.0);

  float r = texture2D(imageTexture, vUv - offset).r;
  float g = texture2D(imageTexture, vUv).g;
  float b = texture2D(imageTexture, vUv + offset).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
