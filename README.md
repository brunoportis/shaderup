# shaderup

`shaderup` is a minimal library for rendering GLSL fragment shaders on a canvas. It handles the WebGL boilerplate, so you can focus on creative coding.

## Quick Start

1.  **HTML:** Add a `<canvas>` to your page.

    ```html
    <canvas id="shader-canvas"></canvas>
    <script type="module" src="main.js"></script>
    ```

2.  **GLSL:** Write your shader (`shader.frag`). `shaderup` provides `u_time` and `u_resolution` uniforms automatically.

    ```glsl
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;

    void main() {
      vec2 st = gl_FragCoord.xy / u_resolution.xy;
      gl_FragColor = vec4(st.x, st.y, 0.5 + 0.5 * sin(u_time), 1.0);
    }
    ```

3.  **JavaScript:** Initialize the library.

    ```javascript
    import { ShaderUp } from 'shaderup';
    import fragmentShader from './shader.frag?raw'; // Vite example

    // Point to your canvas and shader code
    const shader = new ShaderUp({
      canvasId: 'shader-canvas',
      fragmentShader: fragmentShader,
    });

    shader.start();
    ```

## Interactivity: Uniforms & Textures

Pass data from your JavaScript into the shader.

```javascript
// Register custom uniforms during setup
const shader = new ShaderUp({
  // ...,
  uniforms: {
    u_mouse: 'vec2', // Tell shaderup about your uniform's type
  }
});

// Then update it from your code
window.addEventListener('mousemove', (e) => {
  shader.uniforms.u_mouse = [e.clientX, e.clientY];
});

// To use an image:
const img = new Image();
img.src = 'path/to/your/image.png';
img.onload = () => {
  // Make sure you have a `sampler2D` uniform registered
  shader.setTexture('u_your_texture', img);
};
```

## Instanced Rendering for UI

`shaderup` can apply high-performance shader effects to many UI elements at once. The easiest way is with the `ShaderUp.fromElements` factory, which automatically synchronizes rendering with your HTML elements.

```javascript
import { ShaderUp } from 'shaderup';
import fragmentShader from './ui-shader.frag?raw'; // Your fragment shader

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

// 1. Get your HTML elements
const buttons = document.querySelectorAll('.my-button');

// 2. Create the shader with the factory
const shader = ShaderUp.fromElements({
  elements: buttons,
  fragmentShader,
  vertexShader,
  attributes: {
    // 'a_instanceRect' is handled automatically.
    // Define any other custom data you want per-element.
    'a_hoverState': { size: 1, instanced: true },
  },
  onUpdate: (data, elements, stride) => {
    // This runs every frame. Populate your custom data here.
    for (let i = 0; i < elements.length; i++) {
        const ptr = i * stride;
        const isHovering = elements[i].matches(':hover');
        data[ptr + 4] = isHovering ? 1.0 : 0.0; // a_hoverState
    }
  }
});

// 3. Start the render loop
shader.start();
```

## API Quick Reference


-   `new ShaderUp({ canvasId, fragmentShader, uniforms })`: Creates the instance.
-   `shader.start()`: Starts the render loop.
-   `shader.uniforms.your_uniform = value`: Sets a uniform's value.
-   `shader.setTexture('sampler_name', image)`: Applies a texture.
-   `shader.stop()` / `shader.dispose()`: Stops the loop and cleans up.

## Installation

```bash
npm install shaderup
```

## License

[MIT](./LICENSE)