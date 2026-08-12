#define PI 3.1415926535897932384626433832795

void main() {
  // A grid of cells, each holding its own kaleidoscope.
  vec2 gridUv = vUv * gridSize;
  vec2 cell = floor(gridUv);
  vec2 cellUv = fract(gridUv);

  // Fold in the cell's own square space — x scaled by aspect, which each cell
  // inherits from the picture — so the petals are true circles on any frame.
  float aspect = resolution.x / resolution.y;
  vec2 uv = (cellUv - 0.5) * vec2(aspect, 1.0);

  float radius = length(uv);
  float angle = atan(uv.y, uv.x) + rotation;

  // Fold every angle into one wedge, then mirror it — the kaleidoscope's
  // pair of mirrors, done with mod and abs.
  angle = mod(angle, 2.0 * PI / segments);
  angle = abs(angle - PI / segments);

  // Back to picture space: unrotate the fold's result into the cell.
  uv = radius * vec2(cos(angle), sin(angle)) / vec2(aspect, 1.0) + 0.5;

  gl_FragColor = vec4(texture2D(imageTexture, (cell + uv) / gridSize).rgb, 1.0);
}
