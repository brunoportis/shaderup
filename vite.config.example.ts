import { defineConfig } from 'vite';

// Config for building the example to be deployed to GitHub Pages
export default defineConfig({
  root: 'examples', // Set the root to the 'examples' directory
  base: './', // Use relative paths for assets
  build: {
    outDir: '../docs', // Output to a 'docs' directory in the project root
    emptyOutDir: true, // Clean the output directory before building
  },
});
