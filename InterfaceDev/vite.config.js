import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import fs from 'fs'
import path from 'path'

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '..')
  const env = loadEnv(mode, envDir)

  return {
    server: {
      port:2000,
      host: true,
      https: {
        key: fs.readFileSync(path.resolve(__dirname, env.VITE_SSL_KEY)),
        cert: fs.readFileSync(path.resolve(__dirname, env.VITE_SSL_CERT)),
      }
      
    },
    plugins: [react()],
  }
})
