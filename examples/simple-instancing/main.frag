#version 300 es
precision highp float;

// Received from the vertex shader
in float v_hover;

out vec4 fragColor;

void main() {
    // A simple color that changes on hover
    vec3 baseColor = vec3(0.1, 0.2, 0.8);
    vec3 hoverColor = vec3(0.4, 0.5, 1.0);
    
    // Mix between the two colors based on the hover state
    vec3 finalColor = mix(baseColor, hoverColor, v_hover);
    
    // Add a subtle vignette effect
    vec2 uv = gl_FragCoord.xy / 800.0; // Assume a resolution for simplicity in example
    float vignette = 1.0 - length(uv - 0.5) * 0.5;
    
    fragColor = vec4(finalColor * vignette, 1.0);
}
