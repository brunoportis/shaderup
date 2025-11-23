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

`shaderup` now supports high-performance instanced rendering, allowing you to draw many objects (instances) with varied properties in a single draw call. This is ideal for particle systems, UI effects, and other scenarios where you need to render many similar but distinct elements efficiently.

To use instanced rendering:

1.  **Define your instance attributes**: These are the per-instance data (e.g., position, color, rotation) that your shaders will use.
2.  **Provide a custom vertex shader**: Your vertex shader will need to declare `in` attributes matching your instance data (along with `a_quadVertex` for base geometry).
3.  **Update instance data**: Use the `setData()` method to pass a `Float32Array` containing your interleaved instance data to the GPU.

```javascript
import { ShaderUp } from 'shaderup';
import fragmentShader from './instanced-shader.frag?raw'; // Your fragment shader

// Your vertex shader (must define 'a_quadVertex' and your instance attributes)
const vertexShader = `#version 300 es
    in vec2 a_quadVertex;
    in vec4 a_instancePositionSize; // e.g., xy=position, zw=size
    in vec3 a_instanceColor;

    uniform vec2 u_resolution;

    out vec3 v_color; // Pass to fragment shader

    void main() {
        vec2 position = a_instancePositionSize.xy;
        vec2 size = a_instancePositionSize.zw;

        vec2 finalPos = position + (a_quadVertex * size);
        vec2 clipSpace = (finalPos / u_resolution) * 2.0 - 1.0;
        clipSpace.y *= -1.0;
        gl_Position = vec4(clipSpace, 0.0, 1.0);

        v_color = a_instanceColor;
    }
`;

// Initialize with renderMode: 'instanced' and define attributes
const numInstances = 100;
const shader = new ShaderUp({
  canvasId: 'instanced-canvas',
  renderMode: 'instanced',
  fragmentShader,
  vertexShader,
  numInstances,
  attributes: {
    'a_instancePositionSize': { size: 4, instanced: true }, // vec4 for position (xy) and size (zw)
    'a_instanceColor':        { size: 3, instanced: true }, // vec3 for color (rgb)
  }
});

// Create and update instance data (e.g., in your animation loop)
const instanceData = new Float32Array(numInstances * (4 + 3)); // 4 for pos/size, 3 for color

function updateInstances() {
    let ptr = 0;
    for (let i = 0; i < numInstances; i++) {
        // Example: random position, size, and color for each instance
        instanceData[ptr++] = Math.random() * window.innerWidth;  // x
        instanceData[ptr++] = Math.random() * window.innerHeight; // y
        instanceData[ptr++] = 50 + Math.random() * 50;            // width
        instanceData[ptr++] = 50 + Math.random() * 50;            // height
        instanceData[ptr++] = Math.random();                      // r
        instanceData[ptr++] = Math.random();                      // g
        instanceData[ptr++] = Math.random();                      // b
    }
    shader.setData(instanceData);
}

updateInstances(); // Initial data setup
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