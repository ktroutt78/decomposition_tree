import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import fs from 'fs';
import path from 'path';

const certFile = path.resolve('./certs/cert.pem');
const keyFile  = path.resolve('./certs/key.pem');
const hasCerts = fs.existsSync(certFile) && fs.existsSync(keyFile);

const httpsOpts = hasCerts
  ? { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) }
  : false;

export default defineConfig({
  plugins: [svelte()],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.js']
  },
  base: '/decomposition_tree/',
  server:  { port: 8000, strictPort: true, https: httpsOpts },
  preview: { port: 8000, strictPort: true, https: httpsOpts },
  build: {
    outDir: 'docs',   // GitHub Pages serves from /docs on main branch
    emptyOutDir: true,
    target: 'es2020'
  },
  optimizeDeps: {
    include: ['d3']
  }
});
