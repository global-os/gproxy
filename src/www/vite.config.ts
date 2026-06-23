import { defineConfig } from 'vite'
import preact from '@preact/preset-vite'

export default defineConfig({
  plugins: [preact()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'GlobalOSWWW',
      fileName: () => 'rotating.js',
      formats: ['iife'],
    },
    outDir: 'dist',
  },
})
