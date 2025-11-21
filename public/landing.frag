// Source: https://www.shadertoy.com/view/XlBSRz
// A simple, elegant noise function for a soft background effect.

precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

// 2D Random
float random (in vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))
                 * 43758.5453123);
}

// 2D Noise based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
float noise (in vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    // Four corners in 2D of a tile
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth Interpolation
    vec2 u = f*f*(3.0-2.0*f);

    return mix(a, b, u.x) +
            (c - a)* u.y * (1.0 - u.x) +
            (d - b) * u.x * u.y;
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    st.x *= u_resolution.x/u_resolution.y;

    // Use time to animate the noise
    float n = noise(st * 3.0 + u_time * 0.1);

    // A soft color palette
    vec3 color = mix(vec3(0.05, 0.05, 0.2), vec3(0.1, 0.2, 0.4), n);

    gl_FragColor = vec4(color, 1.0);
}
