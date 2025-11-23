import { ShaderUp } from '../../src/index';
import fragmentShader from './main.frag?raw';

// --- PHYSICS ---
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
        if (Math.abs(this.velocity) < 0.001 && Math.abs(this.value - this.target) < 0.001) {
            this.value = this.target;
            this.velocity = 0;
        }
    }
}

// --- DOM & DATA SETUP ---
const domButtons = Array.from(document.querySelectorAll('.shader-btn')) as HTMLButtonElement[];
const springs = domButtons.map(() => new Spring());

const configs = domButtons.map((_, i) => ({
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

// This custom vertex shader is needed to pass all the instance attributes
// to the fragment shader as varyings.
const vertexShader = `#version 300 es
    in vec2 a_quadVertex;      // Instanced geometry
    
    // Instanced attributes
    in vec4 a_instanceRect;    // {x, y, w, h}
    in float a_instanceHover;  // hover state
    in vec3 a_instanceColor;   // {r, g, b}
    in float a_instanceEffect; // effect ID
    
    uniform vec2 u_resolution;
    uniform float u_time;
    
    // Varyings to pass to fragment shader
    out vec2 v_uv;
    out vec2 v_dims;
    out float v_hover;
    out vec3 v_color;
    flat out float v_effect;
    
    void main() {
        vec2 pixelPos = a_instanceRect.xy;
        vec2 pixelSize = a_instanceRect.zw;
        
        vec2 finalPos = pixelPos + (a_quadVertex * pixelSize);
    
        vec2 clipSpace = (finalPos / u_resolution) * 2.0 - 1.0;
        clipSpace.y *= -1.0;
    
        gl_Position = vec4(clipSpace, 0.0, 1.0);
    
        v_uv = a_quadVertex;
        v_dims = pixelSize;
        v_hover = a_instanceHover;
        v_color = a_instanceColor;
        v_effect = a_instanceEffect;
    }
`;

// 9 floats per instance: vec4 rect, float hover, vec3 color, float effectId
const instanceData = new Float32Array(domButtons.length * 9);

const shader = new ShaderUp({
    canvasId: 'gl-canvas',
    renderMode: 'instanced',
    fragmentShader,
    vertexShader, // Use our custom VS
    numInstances: domButtons.length,
    attributes: {
        // This layout MUST match the vertex shader 'in' attributes
        // and the order in the data array below.
        'a_instanceRect':   { size: 4, instanced: true },
        'a_instanceHover':  { size: 1, instanced: true },
        'a_instanceColor':  { size: 3, instanced: true },
        'a_instanceEffect': { size: 1, instanced: true }
    }
});

// --- RENDER LOOP ---
function render() {
    let ptr = 0;
    const dpr = window.devicePixelRatio;

    for (let i = 0; i < domButtons.length; i++) {
        const btn = domButtons[i];
        const spring = springs[i];
        const cfg = configs[i];
        
        spring.update();
        const rect = btn.getBoundingClientRect();

        // 1. Rect (x, y, w, h)
        instanceData[ptr++] = rect.left * dpr;
        instanceData[ptr++] = rect.top * dpr;
        instanceData[ptr++] = rect.width * dpr;
        instanceData[ptr++] = rect.height * dpr;
        
        // 2. Hover
        instanceData[ptr++] = spring.value;
        
        // 3. Color
        instanceData[ptr++] = cfg.color[0];
        instanceData[ptr++] = cfg.color[1];
        instanceData[ptr++] = cfg.color[2];

        // 4. Effect ID
        instanceData[ptr++] = cfg.effectId;
    }

    // Upload the updated data to the GPU
    shader.setData(instanceData);

    requestAnimationFrame(render);
}

// Start the animation loop
shader.start();
render();
