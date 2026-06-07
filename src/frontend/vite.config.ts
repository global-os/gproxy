/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import rewriteAll from 'vite-plugin-rewrite-all';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  build: {
    manifest: true
  },
  plugins: [{
    name: 'debug-middleware',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        console.log('Vite request:', req.method, req.url);
        next();
      });
    }
  }, rewriteAll(), tanstackRouter({
    target: 'react',
    autoCodeSplitting: true
  }), react()],
  server: {
    host: '0.0.0.0',
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
        // Changed to 127.0.0.1
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
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});