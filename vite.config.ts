import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/grod/' : '/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.png'],
      manifest: {
        name: 'Gród',
        short_name: 'Gród',
        description: 'Spokojna gra budowlana o Słowianach z VIII wieku.',
        lang: 'pl',
        start_url: '.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#2b2016',
        theme_color: '#6fa83f',
        icons: [
          { src: 'icons/icon.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,mp3,m4a,ogg,wav}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
}));
