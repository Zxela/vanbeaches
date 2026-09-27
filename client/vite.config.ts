import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Van Beaches',
        short_name: 'Van Beaches',
        description: 'Real-time beach conditions for Vancouver',
        theme_color: '#0A84FF',
        background_color: '#F5F7FA',
        display: 'standalone',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Terrain is streamed by the world runtime, never precached by the PWA.
        globIgnores: ['**/coast-assets/**', '**/Coast-*.js', '**/Coast-*.css'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/coast-assets\//],
        runtimeCaching: [
          {
            urlPattern: /^.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@van-beaches/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8788' },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
