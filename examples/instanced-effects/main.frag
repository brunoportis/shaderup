#version 300 es
precision highp float;

in vec2 v_uv;

// These are no longer direct varyings from the VS,
// but they can be reconstructed or passed if attributes are named the same.
// For this example, we'll get them from instance attributes passed as varyings.
in vec2 v_dims;
in float v_hover;
in vec3 v_color;
flat in float v_effect; // The Effect ID

uniform float u_time;

out vec4 fragColor;

// --- SDF PRIMITIVES ---
float sdRoundedBox(in vec2 p, in vec2 b, in float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
}

// --- EFFECT 1: CYBER SCANLINE ---
vec4 effectCyber(vec2 pos, vec2 center, float radius, vec3 color) {
    float dist = sdRoundedBox(pos, center, radius);
    float aa = fwidth(dist);
    float alpha = 1.0 - smoothstep(-aa, 0.0, dist);
    
    // Scanline
    float scan = sin((v_uv.y + v_uv.x * 0.2) * 50.0 - u_time * 5.0) * 0.1;
    
    // Outline
    float border = 1.0 - smoothstep(-aa - 2.0, -2.0, dist);
    float borderAlpha = border - alpha;
    
    vec3 finalCol = mix(color * 0.2, color, v_hover);
    finalCol += scan * v_hover;
    
    return (vec4(finalCol, 0.6) * alpha) + (vec4(mix(vec3(0.5), vec3(1.0), v_hover), 1.0) * borderAlpha);
}

// --- EFFECT 2: LIQUID WOBBLE ---
vec4 effectLiquid(vec2 pos, vec2 center, float radius, vec3 color) {
    // Distort Position based on Time and Y
    vec2 wobblePos = pos;
    float freq = 10.0;
    float amp = 5.0 * v_hover; // Only wobble on hover
    
    wobblePos.x += sin(u_time * 5.0 + pos.y * 0.1) * amp;
    wobblePos.y += cos(u_time * 3.0 + pos.x * 0.1) * amp;
    
    float dist = sdRoundedBox(wobblePos, center, radius);
    float aa = fwidth(dist);
    float alpha = 1.0 - smoothstep(-aa, 0.0, dist);
    
    // Liquid internal movement
    float blobs = sin(v_uv.x * 10.0 + u_time) * sin(v_uv.y * 10.0 - u_time);
    vec3 liquidCol = mix(color * 0.2, color * (1.0 + blobs * 0.2), v_hover);
    
    return vec4(liquidCol, 0.7) * alpha;
}

// --- EFFECT 3: DIGITAL GLITCH ---
vec4 effectGlitch(vec2 pos, vec2 center, float radius, vec3 color) {
    // Chromatic Aberration offsets
    float shift = 4.0 * v_hover * sin(u_time * 20.0);
    
    float distR = sdRoundedBox(pos - vec2(shift, 0.0), center, radius);
    float distG = sdRoundedBox(pos, center, radius);
    float distB = sdRoundedBox(pos + vec2(shift, 0.0), center, radius);
    
    float aa = fwidth(distG);
    
    // Create 3 alpha channels
    float aR = 1.0 - smoothstep(-aa, 0.0, distR);
    float aG = 1.0 - smoothstep(-aa, 0.0, distG);
    float aB = 1.0 - smoothstep(-aa, 0.0, distB);
    
    // Random noise block
    float noise = step(0.9, fract(sin(dot(v_uv * u_time, vec2(12.9898, 78.233))) * 43758.5453));
    if (v_hover > 0.0) {
            if (noise > 0.5) aG = 0.0; // Randomly cut green channel
    }

    // Combine
    vec3 finalCol = vec3(aR * color.r, aG * color.g, aB * color.b);
    
    // Keep background visible
    float maxAlpha = max(max(aR, aG), aB);
    
    // Boost brightness on hover
    if (v_hover > 0.0) finalCol *= 1.5;
    
    return vec4(finalCol, 0.8 * maxAlpha);
}

void main() {
    // v_dims is not a standard varying, so we get it from a uniform or attribute.
    // In our new design, the vertex shader doesn't pass it automatically.
    // Let's assume the calling code has matched an `a_instanceRect` attribute `out`
    // to a varying `v_dims` or we can just use the rect's dimensions from an attribute.
    // For simplicity, we assume the VS has been written to provide v_dims.
    
    vec2 center = v_dims * 0.5;
    vec2 pos = (v_uv * v_dims) - center;
    float radius = 8.0 + (v_hover * 4.0);
    
    int effectID = int(round(v_effect));
    
    vec4 col = vec4(0.0);
    
    if (effectID == 0) {
        col = effectCyber(pos, center, radius, v_color);
    } else if (effectID == 1) {
        col = effectLiquid(pos, center, radius, v_color);
    } else {
        col = effectGlitch(pos, center, radius, v_color);
    }
    
    if (col.a < 0.01) discard;
    fragColor = col;
}
