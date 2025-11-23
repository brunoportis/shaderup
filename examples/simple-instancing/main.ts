import { ShaderUp } from '../../src/index';
import fragmentShader from './main.frag?raw';

// A simple vertex shader to position each instance
const vertexShader = `#version 300 es
    in vec2 a_quadVertex;
    in vec4 a_instanceRect; // xy=position, zw=size
    in float a_hoverState;

    uniform vec2 u_resolution;
    out float v_hover;

    void main() {
        vec2 finalPos = a_instanceRect.xy + (a_quadVertex * a_instanceRect.zw);
        vec2 clipSpace = (finalPos / u_resolution) * 2.0 - 1.0;
        clipSpace.y *= -1.0;
        gl_Position = vec4(clipSpace, 0.0, 1.0);
        v_hover = a_hoverState;
    }
`;

// 1. Get the HTML elements
const buttons = document.querySelectorAll('.shader-button');

// 2. Create the shader instance using the factory
const shader = ShaderUp.fromElements({
  elements: buttons,
  canvasId: 'shader-canvas',
  fragmentShader,
  vertexShader,
  attributes: {
    // 'a_instanceRect' is handled automatically by the factory.
    // We only need to define our custom 'a_hoverState' attribute.
    'a_hoverState': { size: 1, instanced: true },
  },
  onUpdate: (data, elements, stride) => {
    // This function is called every frame before rendering.
    // We can use it to update our custom per-instance data.
    for (let i = 0; i < elements.length; i++) {
        const ptr = i * stride;
        const isHovering = elements[i].matches(':hover');
        
        // The factory handles the first 4 floats (the rect).
        // Our custom data comes after that.
        data[ptr + 4] = isHovering ? 1.0 : 0.0; // a_hoverState
    }
  }
});

// 3. Start the render loop
shader.start();
