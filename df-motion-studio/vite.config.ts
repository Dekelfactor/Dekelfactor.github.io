import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { SECURITY_HEADERS } from './security-headers';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1600,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: id => {
          if (!id.includes('node_modules')) return undefined;
          if (/node_modules\/three\//.test(id)) return 'three';
          if (/@react-three|postprocessing|troika|three-stdlib|three-mesh-bvh|maath|camera-controls/.test(id)) return 'r3f';
          if (/remotion|mediabunny/.test(id)) return 'remotion';
          if (/react-dom|scheduler|\/react\//.test(id)) return 'react';
          return 'vendor';
        },
      },
    },
  },
  // preview serves the same headers as production so the CSP is tested locally
  preview: { headers: SECURITY_HEADERS },
  test: { environment: 'node' },
} as never);
