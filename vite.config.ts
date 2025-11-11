import { resolve } from 'path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts'; // Optional, but great for TS types

export default defineConfig({
  // This is the key 'build' block for library mode
  build: {
    lib: {
      // The entry file that contains your 'export class ShaderUp'
      entry: resolve(__dirname, 'src/index.ts'), 
      
      // The global variable name when used in a <script> tag
      name: 'ShaderUp', 
      
      // The formats to build. 'es' for ESM, 'cjs' for CommonJS
      formats: ['es', 'cjs'], 
      
      // The filenames for the built files
      fileName: (format) => `index.${format}.js`, 
    },
    // Optional: Minify output for production
    minify: true,
    copyPublicDir: false,
  },
  
  // This plugin automatically generates .d.ts files
  // You may need to install it: npm i -D vite-plugin-dts
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
  ],
});
