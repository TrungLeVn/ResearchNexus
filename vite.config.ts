import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Expose process.env variables to the client-side code
  define: {
    // Polyfill process.env
    'process.env': {}, 
    // Inject variables individually to ensure they exist even if import.meta.env fails
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.GOOGLE_API_KEY': JSON.stringify(process.env.GOOGLE_API_KEY || ''),
    'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || ''),
    'process.env.VITE_FIREBASE_API_KEY': JSON.stringify(process.env.VITE_FIREBASE_API_KEY || ''),
    'process.env.VITE_FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.VITE_FIREBASE_AUTH_DOMAIN || ''),
    'process.env.VITE_FIREBASE_PROJECT_ID': JSON.stringify(process.env.VITE_FIREBASE_PROJECT_ID || ''),
    'process.env.VITE_FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.VITE_FIREBASE_STORAGE_BUCKET || ''),
    'process.env.VITE_FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''),
    'process.env.VITE_FIREBASE_APP_ID': JSON.stringify(process.env.VITE_FIREBASE_APP_ID || '')
  },
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-ui': ['lucide-react', 'recharts', 'react-markdown'],
          'vendor-ai': ['@google/genai']
        }
      }
    }
  }
});