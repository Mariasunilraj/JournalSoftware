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

                // Safety guard for trade deletion
                const deletedIds = Array.isArray(parsed.deletedTradeIds) ? parsed.deletedTradeIds : []
                if (deletedIds.length > 0 && (!parsed.trades || parsed.trades.length === 0) && !parsed.isFullReset && fs.existsSync(userFile)) {
                  try {
                    const existing = JSON.parse(fs.readFileSync(userFile, 'utf-8'))
                    if (existing && Array.isArray(existing.trades) && existing.trades.length > 0) {
                      const deletedSet = new Set(deletedIds)
                      parsed.trades = existing.trades.filter((t) => t && t.id && !deletedSet.has(t.id))
                    }
                  } catch (e) {}
                }

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

        // Local AI Contract Note Parse Endpoint
        if (req.url && req.url.startsWith('/api/ai/parse-contract-note')) {
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
          }

          if (req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => { body += chunk })
            req.on('end', async () => {
              try {
                const { fileBase64, mimeType = 'application/pdf', apiKey: userApiKey } = JSON.parse(body || '{}')
                const apiKey = userApiKey || process.env.GEMINI_API_KEY
                if (!apiKey) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Please provide a free Gemini API key to parse PDF contract notes.', needsApiKey: true }))
                  return
                }

                const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '')

                const systemPrompt = `You are an expert Indian Stock & Derivatives (NSE/BSE) contract note and tradebook parser.
Analyze all executed trades in the document and match corresponding Buy and Sell orders for the same instrument into complete round-trip trades.
Extract: date (YYYY-MM-DD), symbol (e.g. NIFTY 25000 CE), underlying, segment (Options/Futures/Equity), tradeType (Call/Put), optionType (CE/PE), strikePrice, expiryDate, entryTime, exitTime, quantity, entryPrice, exitPrice, grossPnL, charges, netPnL, strategy, notes.
Statutory charges for Indian Options (FY 2026-27): STT = 0.15% on sell premium turnover, Stamp duty = 0.003% on buy premium turnover, NSE options turnover = 0.03553%, SEBI fee = 0.0001% (₹10/Cr), Brokerage = broker-specific (typically ₹20/order), GST = 18% on (Brokerage + NSE + SEBI).
Return ONLY a valid JSON object:
{ "broker": "Broker Name", "tradeDate": "YYYY-MM-DD", "totalCharges": 0, "trades": [...] }`

                const candidateModels = [
                  'gemini-1.5-flash',
                  'gemini-1.5-flash-latest',
                  'gemini-1.5-pro-latest',
                  'gemini-1.5-pro',
                ]

                const parts = []
                if (mimeType === 'application/pdf') {
                  parts.push({
                    inline_data: {
                      mime_type: 'application/pdf',
                      data: cleanBase64,
                    },
                  })
                } else {
                  const textContent = Buffer.from(cleanBase64, 'base64').toString('utf-8')
                  parts.push({
                    text: `Broker Tradebook / P&L Export Data (CSV):\n\`\`\`csv\n${textContent}\n\`\`\``,
                  })
                }
                parts.push({ text: systemPrompt })

                let gRes = null
                let lastErrText = ''

                for (const model of candidateModels) {
                  try {
                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
                    const resp = await fetch(geminiUrl, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        contents: [{ parts }],
                        generationConfig: { response_mime_type: 'application/json', temperature: 0.1 }
                      })
                    })

                    if (resp.ok) {
                      gRes = resp
                      break
                    }

                    const errText = await resp.text()
                    lastErrText = errText
                    if (resp.status === 404 || errText.includes('no longer available') || errText.includes('not found')) {
                      continue
                    } else {
                      gRes = resp
                      break
                    }
                  } catch (e) {
                    lastErrText = e.message
                  }
                }

                if (!gRes || !gRes.ok) {
                  res.statusCode = gRes?.status || 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: `Gemini API error: ${lastErrText}` }))
                  return
                }

                const data = await gRes.json()
                const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
                res.setHeader('Content-Type', 'application/json')
                res.end(rawText)
              } catch (err) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
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
