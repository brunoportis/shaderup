precision mediump float;
uniform float u_time;
uniform vec2 u_resolution;

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    
    // A simple, unmissable pattern of moving diagonal stripes
    float stripes = fract(st.x - st.y + u_time * 0.5);
    
    // Flash a bright red color
    vec3 color = vec3(stripes, 0.0, 0.0);
    
    gl_FragColor = vec4(color, 1.0);
}