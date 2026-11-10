import { defineConfig } from 'vite'
import { readdirSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(fileURLToPath(import.meta.url))
const htmlEntries = Object.fromEntries(
  readdirSync(rootDir)
    .filter((file) => file.endsWith('.html'))
    .map((file) => [basename(file, '.html'), resolve(rootDir, file)]),
)

export default defineConfig({
  build: {
    rollupOptions: {
      input: htmlEntries,
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    strictPort: true,
  }
})
