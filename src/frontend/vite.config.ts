import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const felaPackages = [
  'fela',
  'fela-beautifier',
  'fela-perf',
  'fela-plugin-embedded',
  'fela-plugin-fallback-value',
  'fela-plugin-prefixer',
  'fela-plugin-unit',
  'fela-sort-media-query-mobile-first',
  'fela-bindings',
  'fela-dom',
  'fela-tools',
  'fela-utils',
  'react-fela',
];

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  resolve: {
    mainFields: ['module', 'jsnext:main', 'browser', 'main'],
    conditions: ['import', 'module', 'browser', 'default'],
    alias: Object.fromEntries(
      felaPackages.map((pkg) => [
        pkg,
        path.resolve(dirname, `node_modules/${pkg}/es/index.js`),
      ]),
    ),
  },
  build: {
    manifest: true,
    target: 'es2020',
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        format: 'es',
      },
    },
  },
  optimizeDeps: {
    include: ['cssbeautify', ...felaPackages],
    needsInterop: ['cssbeautify'],
  },
  plugins: [tailwindcss(), {
    name: 'debug-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        console.log('Vite request:', req.method, req.url);
        next();
      });
    }
  }, tanstackRouter({
    target: 'react',
    autoCodeSplitting: true
  }), react()],
  server: {
    host: '0.0.0.0',
    port: 3443,
    https: {
      cert: path.resolve(dirname, '../../certs/dev.pem'),
      key: path.resolve(dirname, '../../certs/dev-key.pem'),
    },
    allowedHosts: ['app.app.dev.onetrueos.com'],
    fs: {
      strict: false
    },
    proxy: {
      // Proxy /assets to /static/assets
      '^/assets/.*': {
        target: 'http://app.app.dev.onetrueos.com:3000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/assets/, '/static/assets'),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Asset proxy:', req.url, '→', req.url?.replace(/^\/assets/, '/static/assets'));
          });
        }
      },
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy ERROR:', err.message);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying:', req.method, req.url, '→', (options?.target ?? 'undefined') + (req?.url ?? 'undefined'));
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Proxy response:', proxyRes.statusCode, req.url);
          });
        }
      }
    }
  },
});