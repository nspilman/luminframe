export const uvUtils = `
  vec2 rotateUV(vec2 uv, float rotation) {
    float mid = 0.5;
    vec2 center = vec2(mid);
    float s = sin(rotation);
    float c = cos(rotation);
    uv -= center;
    vec2 rotUV = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
    uv = rotUV + center;
    return uv;
  }
`; 