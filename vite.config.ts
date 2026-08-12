import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages deploys at /virtufit/ — apply the base only for the
// production build so local dev stays at root (/).
const base = process.env.NODE_ENV === 'production' ? '/virtufit/' : '/';

export default defineConfig({
  plugins: [react()],
  base,
  server: { port: 5273, host: '0.0.0.0', allowedHosts: true },
});
