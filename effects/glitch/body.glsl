float random(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv;

  // The clock ticks in whole glitch-frames — floor(time * speed) — so every
  // random draw below re-rolls once per tick, not continuously. At speed
  // zero the tick never advances and the tear holds still.
  float tick = floor(time * speed);

  // A horizontal band tears when its per-band noise crosses the gate.
  float noise = random(vec2(tick, floor(uv.y * 100.0)));
  float glitchAmount = step(1.0 - intensity * 0.1, noise);
  uv.x += glitchAmount * (random(vec2(tick)) * 2.0 - 1.0) * intensity;

  // The channels split a hair in different directions, like a bad cable.
  float r = texture2D(imageTexture, uv + vec2(intensity * 0.01, 0.0)).r;
  float g = texture2D(imageTexture, uv + vec2(0.0, intensity * 0.01)).g;
  float b = texture2D(imageTexture, uv - vec2(intensity * 0.01, 0.0)).b;

  gl_FragColor = vec4(r, g, b, 1.0);
}
