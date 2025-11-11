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