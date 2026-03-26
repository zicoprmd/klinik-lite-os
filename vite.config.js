import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: ['klinik.zicozema.my.id', 'localhost', '127.0.0.1'],
    host: '0.0.0.0',
    port: 3002
  }
})