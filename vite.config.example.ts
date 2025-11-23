import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // The base path for assets. './' makes it relative.
  base: './',
  // The directory with static files to copy to the output root.
  publicDir: 'public',
  build: {
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // This nested structure is intentional. It creates the 'docs/examples/...'
        // output that you discovered was working.
        'examples/index': resolve(__dirname, 'examples/index.html'),
        'examples/basic/index': resolve(__dirname, 'examples/basic/index.html'),
        'examples/color-cycle/index': resolve(__dirname, 'examples/color-cycle/index.html'),
        'examples/instanced-effects/index': resolve(__dirname, 'examples/instanced-effects/index.html'),
        'examples/simple-instancing/index': resolve(__dirname, 'examples/simple-instancing/index.html'),
      },
    },
  },
});
