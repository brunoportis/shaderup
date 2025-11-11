// examples/main.frag
precision mediump float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec4 u_color;

void main() {
    // Normalized pixel coordinates (from 0 to 1)
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    st.x *= u_resolution.x / u_resolution.y; // Fix aspect ratio

    // Animate the background color
    vec3 color = 0.5 + 0.5 * cos(u_time + vec3(0.0, 2.0, 4.0));

    // Create a spotlight effect based on mouse position
    vec2 mouse_norm = u_mouse / u_resolution.xy;
    mouse_norm.x *= u_resolution.x / u_resolution.y;

    float dist = distance(st, mouse_norm);
    float spotlight = smoothstep(0.2, 0.0, dist);

    // Mix the spotlight with the animated color
    color = mix(color, u_color.rgb, spotlight);

    gl_FragColor = vec4(color, 1.0);
}