import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const neonAuthUrl =
    env.VITE_NEON_AUTH_URL || env.VITE_NEON_AUTH_BASE_URL

  if (command === 'build' && !neonAuthUrl) {
    throw new Error(
      'Set VITE_NEON_AUTH_URL or VITE_NEON_AUTH_BASE_URL before building the client.',
    )
  }

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_DEV_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
  }
})
