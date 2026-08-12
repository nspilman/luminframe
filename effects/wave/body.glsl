void main() {
  // One sine across y pushes x — the flag-in-the-wind ripple. Speed carries
  // it; at zero the wave holds still, and exports as the still it is.
  vec2 uv = vUv;
  uv.x += amplitude * sin(frequency * uv.y + time * speed);

  gl_FragColor = vec4(texture2D(imageTexture, uv).rgb, 1.0);
}
