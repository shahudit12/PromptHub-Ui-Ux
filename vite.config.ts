import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.png',
        'favicon.svg',
        'logo.png',
        'brand-logo-square.jpg',
        'branding/prompthub-icon.png',
        'branding/prompthub-symbol.png',
        'icons/pwa-192x192.png',
        'icons/pwa-512x512.png',
      ],
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
        globIgnores: ['**/*.apk', '**/node_modules/**'],
      },
      manifest: {
        name: 'PromptHub — AI Prompt Engineering Studio',
        short_name: 'PromptHub',
        description: 'The developer studio for production prompt engineering, multi-model LLM benchmarking, and deterministic rubric evaluations.',
        theme_color: '#2B5844',
        background_color: '#F7F5EF',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/brand-logo-square.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
          },
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
          },
        ],
      },
    }),
  ],
  build: {
    chunkSizeWarningLimit: 2500,
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('src/data/masterPrompts')) {
            return 'master-prompts';
          }
          if (id.includes('src/data/curatedAdminPrompts')) {
            return 'curated-prompts';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'motion-vendor';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
          if (id.includes('node_modules/@tanstack')) {
            return 'query-vendor';
          }
          if (id.includes('node_modules/dompurify')) {
            return 'purify-vendor';
          }
        },
      },
    },
  },
})
