// brightness.frag
uniform sampler2D imageTexture;
uniform sampler2D imageOneTexture;
varying vec2 vUv;

// Function to convert RGB to luminance (perceived brightness)
float getLuminance(vec3 color) {
    // These weights are based on human perception
    return dot(color, vec3(0.299, 0.587, 0.114));
}

vec4 blendPixels(vec4 pixel1, vec4 pixel2, float blend) {
    float factor = clamp(blend, 0.0, 1.0);
    return mix(pixel1, pixel2, blend);
}

void main() {
    vec2 uv = vUv;
    vec4 color = texture2D(imageTexture, uv);
    vec4 color2 = texture2D(imageOneTexture, uv);
    
    // Method 1: Using luminance (perceived brightness)
    float luminance = getLuminance(color.rgb);
    if(luminance < .75) { // 70%
    if(luminance > .65){
        color = blendPixels(color, color2, 1.0-luminance);
    }
    else {
        color = color2;
    }
    }
    // Method 2: Using individual channel thresholds
    // if(color.r > 0.7 || color.g > 0.7 || color.b > 0.7) {
    //     color.rgb = vec3(1.0);
    // }

    // Method 3: Smooth transition
    // float threshold = 0.7;
    // float smoothness = 0.1;
    // float brightness = getLuminance(color.rgb);
    // float whiteMask = smoothstep(threshold - smoothness, threshold + smoothness, brightness);
    // color.rgb = mix(color.rgb, vec3(1.0), whiteMask);

    gl_FragColor = color;
}