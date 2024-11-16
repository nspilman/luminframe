vec4 blendPixels(vec4 pixel1, vec4 pixel2, float blend) {
    // Ensure blend factor is between 0 and 1
    float factor = clamp(blend, 0.0, 1.0);
    
    // Linear interpolation between pixels
    // When factor is 0.0, returns pixel1
    // When factor is 1.0, returns pixel2
    // When factor is 0.5, returns an equal mix
    return pixel1 * (1.0 - factor) + pixel2 * factor;
}