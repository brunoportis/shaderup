import { resolve } from 'path';
import { defineConfig } from 'vite';
import { globSync } from 'glob';

// Find all HTML files within the 'examples' directory and its subdirectories
const htmlEntries = globSync('examples/**/*.html').reduce((acc, file) => {
    // Create a logical name for the entry, e.g., 'basic/index'
    const name = file.replace('examples/', '').replace('.html', '');
    acc[name] = resolve(__dirname, file);
    return acc;
}, {} as Record<string, string>);

export default defineConfig({
  // The base path for the deployed site. './' makes it relative.
  base: './',
  build: {
    // Output directory is 'docs'
    outDir: 'docs',
    emptyOutDir: true,
    rollupOptions: {
      // Pass the found HTML files as entry points
      input: htmlEntries,
    },
  },
});