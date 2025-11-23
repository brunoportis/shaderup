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

## Instanced Rendering

`shaderup` supports high-performance instanced rendering, allowing you to draw many objects (instances) with varied properties in a single draw call. This is ideal for applying GPU effects to multiple UI elements, creating particle systems, and more.

Instead of rendering a fullscreen effect, you can draw a small quad for each of your HTML elements and position it using `getBoundingClientRect()`.

To use instanced rendering:

1.  **Define your instance attributes**: These are the per-instance data (e.g., position, color) that your shaders will use.
2.  **Provide a custom vertex shader**: Your vertex shader will declare `in` attributes matching your instance data.
3.  **Update instance data**: In your animation loop, get the position of your HTML elements and use `setData()` to pass the updated coordinates to the GPU.

```javascript
import { ShaderUp } from 'shaderup';
import fragmentShader from './instanced-shader.frag?raw'; // Your fragment shader

// A simple vertex shader to position and size each instance
const vertexShader = `#version 300 es
    in vec2 a_quadVertex;
    in vec4 a_instanceRect; // xy=position, zw=size
    in vec3 a_instanceColor;

    uniform vec2 u_resolution;
    out vec3 v_color;

    void main() {
        vec2 finalPos = a_instanceRect.xy + (a_quadVertex * a_instanceRect.zw);
        vec2 clipSpace = (finalPos / u_resolution) * 2.0 - 1.0;
        clipSpace.y *= -1.0;
        gl_Position = vec4(clipSpace, 0.0, 1.0);
        v_color = a_instanceColor;
    }
`;

// 1. Get your HTML elements
const elements = Array.from(document.querySelectorAll('.my-button-class'));
const numInstances = elements.length;

// 2. Initialize ShaderUp for instancing
const shader = new ShaderUp({
  canvasId: 'instanced-canvas',
  renderMode: 'instanced',
  fragmentShader,
  vertexShader,
  numInstances,
  attributes: {
    'a_instanceRect':  { size: 4, instanced: true },
    'a_instanceColor': { size: 3, instanced: true },
  }
});

// 3. Create a data array and update it in a loop
const instanceData = new Float32Array(numInstances * (4 + 3)); // 4 for rect, 3 for color

function updateAndRender() {
    const dpr = window.devicePixelRatio;
    let ptr = 0;
    for (let i = 0; i < numInstances; i++) {
        const rect = elements[i].getBoundingClientRect();

        // Position & Size
        instanceData[ptr++] = rect.left * dpr;
        instanceData[ptr++] = rect.top * dpr;
        instanceData[ptr++] = rect.width * dpr;
        instanceData[ptr++] = rect.height * dpr;
        
        // Color (e.g., cycle colors)
        instanceData[ptr++] = Math.sin(i * 0.5) * 0.5 + 0.5;
        instanceData[ptr++] = Math.cos(i * 0.3) * 0.5 + 0.5;
        instanceData[ptr++] = Math.sin(i * 0.7) * 0.5 + 0.5;
    }
    shader.setData(instanceData);
    requestAnimationFrame(updateAndRender);
}

shader.start();
updateAndRender(); // Start the loop
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