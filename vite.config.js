import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

// Built-in Local Master Sync Middleware for instant Phone <-> Laptop Wi-Fi Sync
function localSyncPlugin() {
  const dataDir = path.resolve(process.cwd(), '.storage')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  return {
    name: 'local-sync-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Handle CORS for local network and cross-device access
        if (req.url && req.url.startsWith('/api/sync')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          // Registered Users DB Sync Endpoint
          if (req.url.startsWith('/api/sync/users')) {
            const usersFile = path.join(dataDir, 'users.json')
            if (req.method === 'GET') {
              res.setHeader('Content-Type', 'application/json')
              if (fs.existsSync(usersFile)) {
                res.end(fs.readFileSync(usersFile, 'utf-8'))
              } else {
                res.end(JSON.stringify([]))
              }
              return
            }
            if (req.method === 'POST') {
              let body = ''
              req.on('data', (chunk) => { body += chunk })
              req.on('end', () => {
                try {
                  fs.writeFileSync(usersFile, body, 'utf-8')
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ success: true }))
                } catch (err) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: err.message }))
                }
              })
              return
            }
          }

          // Server Health / Status Check Endpoint
          if (req.url.startsWith('/api/sync/status')) {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({
              online: true,
              timestamp: Date.now(),
              server: 'Delta Journal Master Sync Engine',
            }))
            return
          }

          // User Data Sync (Trades, Diary, Capital, Risk Settings)
          const url = new URL(req.url, 'http://localhost')
          const userId = url.searchParams.get('userId') || 'default'
          const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
          const userFile = path.join(dataDir, `user_${safeUserId}.json`)

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json')
            if (fs.existsSync(userFile)) {
              const fileContent = fs.readFileSync(userFile, 'utf-8')
              res.end(fileContent)
            } else {
              res.end(JSON.stringify({ trades: [], diary: [], capitalLogs: [], settings: null, updatedAt: 0 }))
            }
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body)
                parsed.updatedAt = parsed.updatedAt || Date.now()
                fs.writeFileSync(userFile, JSON.stringify(parsed, null, 2), 'utf-8')
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ success: true, updatedAt: parsed.updatedAt }))
              } catch (err) {
                res.statusCode = 400
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
        }
        next()
      })
    },
  }
}

// High-performance manual chunk splitting for buttery smooth page loads
export default defineConfig({
  plugins: [react(), localSyncPlugin()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'esnext',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('lucide-react')) return 'vendor-icons';
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
          }
        },
      },
    },
  },
})
