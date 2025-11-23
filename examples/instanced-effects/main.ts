import { ShaderUp } from '../../src/index';
import fragmentShader from './main.frag?raw';

// --- PHYSICS ---
// A simple spring class for smooth animations
class Spring {
    public value = 0;
    public target = 0;
    private velocity = 0;
    private stiffness = 0.08;
    private damping = 0.85;

    update() {
        const force = (this.target - this.value) * this.stiffness;
        this.velocity += force;
        this.velocity *= this.damping;
        this.value += this.velocity;
    }
}

// --- DOM & DATA SETUP ---
const domButtons = document.querySelectorAll('.shader-btn');
const springs = Array.from(domButtons).map(() => new Spring());

const configs = Array.from(domButtons).map((_, i) => ({
    effectId: i % 3,
    color: [
        [0.2, 0.8, 1.0], // Cyan
        [1.0, 0.2, 0.5], // Pink
        [0.4, 1.0, 0.2]  // Lime
    ][i % 3]
}));

domButtons.forEach((btn, i) => {
    btn.addEventListener('mouseenter', () => springs[i].target = 1.0);
    btn.addEventListener('mouseleave', () => springs[i].target = 0.0);
});

// --- SHADER SETUP ---

// This custom vertex shader passes all instance attributes to the fragment shader
const vertexShader = `#version 300 es
    in vec2 a_quadVertex;
    in vec4 a_instanceRect;
    in float a_instanceHover;
    in vec3 a_instanceColor;
    in float a_instanceEffect;
    
    uniform vec2 u_resolution;
    
    out vec2 v_uv;
    out vec2 v_dims;
    out float v_hover;
    out vec3 v_color;
    flat out float v_effect;
    
    void main() {
        vec2 pixelSize = a_instanceRect.zw;
        vec2 clipSpace = ((a_instanceRect.xy + (a_quadVertex * pixelSize)) / u_resolution) * 2.0 - 1.0;
        clipSpace.y *= -1.0;
    
        gl_Position = vec4(clipSpace, 0.0, 1.0);
    
        v_uv = a_quadVertex;
        v_dims = pixelSize;
        v_hover = a_instanceHover;
        v_color = a_instanceColor;
        v_effect = a_instanceEffect;
    }
`;

// Use the new high-level factory method
const shader = ShaderUp.fromElements({
    elements: domButtons,
    fragmentShader,
    vertexShader,
    attributes: {
        // Define only our custom per-instance attributes.
        // 'a_instanceRect' is handled automatically by fromElements.
        'a_instanceHover':  { size: 1, instanced: true },
        'a_instanceColor':  { size: 3, instanced: true },
        'a_instanceEffect': { size: 1, instanced: true },
    },
    onUpdate: (data, elements, stride) => {
        // This callback is run every frame to update our custom data.
        for (let i = 0; i < elements.length; i++) {
            springs[i].update();

            // The pointer to the start of this instance's data
            const ptr = i * stride;
            const cfg = configs[i];

            // Populate the data for our custom attributes.
            // Pointer starts after the 4 floats of the automatic 'a_instanceRect'.
            data[ptr + 4] = springs[i].value;   // a_instanceHover
            data[ptr + 5] = cfg.color[0];       // a_instanceColor.r
            data[ptr + 6] = cfg.color[1];       // a_instanceColor.g
            data[ptr + 7] = cfg.color[2];       // a_instanceColor.b
            data[ptr + 8] = cfg.effectId;       // a_instanceEffect
        }
    }
});

// Start the synchronized render loop
shader.start();
