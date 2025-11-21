precision mediump float;

uniform float u_time;
uniform vec2 u_resolution;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    
    // Create a color that cycles with time
    vec3 color = 0.5 + 0.5 * cos(u_time + st.xyx + vec3(0, 2, 4));
    
    gl_FragColor = vec4(color, 1.0);
}
