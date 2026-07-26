// The classic negative: each channel flipped about its midpoint. `amount`
// scales the flip, so 0 is the untouched photo and 1 is the full negative.
void main() {
  vec3 c = texture2D(imageTexture, vUv).rgb;
  vec3 flipped = 1.0 - c;
  gl_FragColor = vec4(mix(c, flipped, amount), 1.0);
}
