uniform sampler2D imageTexture;
uniform vec2 resolution;  // screen resolution for pixel size calculation
varying vec2 vUv;

// Sample neighboring pixels in a 9-tap pattern
vec4 blur9(sampler2D image, vec2 uv, vec2 resolution) {
    vec2 pixel = 3.0 / resolution;  // size of one pixel
    
    // Gaussian weights for 9 samples
    float offset = 3.5;  // Adjust this to control blur strength
    
    vec4 color = vec4(0.0);
    
    // Center pixel (highest weight)
    color += texture2D(image, uv) * 0.2270270270;
    
    // Sample 8 surrounding pixels with decreasing weights
    color += texture2D(image, uv + vec2(-offset, -offset) * pixel) * 0.0945945946;
    color += texture2D(image, uv + vec2(0.0, -offset) * pixel) * 0.1216216216;
    color += texture2D(image, uv + vec2(offset, -offset) * pixel) * 0.0945945946;
    color += texture2D(image, uv + vec2(-offset, 0.0) * pixel) * 0.1216216216;
    color += texture2D(image, uv + vec2(offset, 0.0) * pixel) * 0.1216216216;
    color += texture2D(image, uv + vec2(-offset, offset) * pixel) * 0.0945945946;
    color += texture2D(image, uv + vec2(0.0, offset) * pixel) * 0.1216216216;
    color += texture2D(image, uv + vec2(offset, offset) * pixel) * 0.0945945946;
    
    return color;
}

void main() {
    vec2 uv = vUv;
    gl_FragColor = blur9(imageTexture, uv, resolution);
}