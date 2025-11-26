import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Expose process.env.API_KEY to the client-side code
  define: {
    // Crucial fix: Add || '' to ensure it is always a string, preventing undefined error
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
  },
  build: {
    chunkSizeWarningLimit: 1000, // Increase warning limit to 1MB
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunks for better caching and performance
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react', 'recharts', 'react-markdown'],
          'vendor-ai': ['@google/genai']
        }
      }
    }
  }
});