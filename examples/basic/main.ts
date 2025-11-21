import { ShaderUp } from '../../src/ShaderUp';
// Import the fragment shader as a raw string using Vite's ?raw syntax
import fragmentShader from './main.frag?raw';

// --- 1. Initialize ShaderUp ---
const shader = new ShaderUp({
  // Automatically finds the first <canvas> element on the page
  fragmentShader: fragmentShader,
  uniforms: {
    // Register custom uniforms and their types
    u_mouse: 'vec2',
    u_color: 'vec4',
  },
  onResize: (width, height) => {
    console.log(`Canvas resized to: ${width}x${height}`);
  },
});

// --- 2. Set Initial Uniform Values ---
shader.uniforms.u_color = [0.2, 0.5, 1.0, 1.0]; // A nice blue color

// --- 3. Add Event Listeners ---
window.addEventListener('mousemove', (e) => {
  // Update the u_mouse uniform with the current mouse position
  shader.uniforms.u_mouse = [e.clientX, e.clientY];
});

// --- 4. Start the Render Loop ---
shader.start();

// --- 5. Clean up on Hot Module Replacement (for development) ---
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    shader.dispose();
  });
}