import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1' },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'pixi-engine', test: /node_modules[\\/](?:pixi\.js|@pixi)[\\/]/, maxSize: 320_000, priority: 20 },
            { name: 'react-runtime', test: /node_modules[\\/]react(?:-dom)?[\\/]/, priority: 15 },
          ],
        },
      },
    },
  },
})
