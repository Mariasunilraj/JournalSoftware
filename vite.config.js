import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'
import loginHandler from './api/auth/login.js'
import registerHandler from './api/auth/register.js'
import logoutHandler from './api/auth/logout.js'
import meHandler from './api/auth/me.js'
import { getAuthenticatedUser } from './api/_auth.js'

// Adapter to run Vercel serverless function handlers in Connect/Vite dev middleware
function adaptVercelHandler(handler) {
  return async (req, res) => {
    if (!res.status) {
      res.status = function (code) {
        this.statusCode = code
        return this
      }
    }
    if (!res.json) {
      res.json = function (data) {
        if (!this.getHeader('Content-Type')) {
          this.setHeader('Content-Type', 'application/json')
        }
        this.end(JSON.stringify(data))
        return this
      }
    }
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body === undefined) {
      let body = ''
      for await (const chunk of req) {
        body += chunk
      }
      try {
        req.body = JSON.parse(body || '{}')
      } catch (e) {
        req.body = {}
      }
    }
    return handler(req, res)
  }
}

// Built-in Local Master Sync Middleware for instant Phone <-> Laptop Wi-Fi Sync
function localSyncPlugin() {
  const dataDir = path.resolve(process.cwd(), '.storage')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  return {
    name: 'local-sync-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ? req.url.split('?')[0] : ''

        // Auth Endpoints (mirroring Vercel serverless in local dev)
        if (url === '/api/auth/login') {
          return adaptVercelHandler(loginHandler)(req, res)
        }
        if (url === '/api/auth/register') {
          return adaptVercelHandler(registerHandler)(req, res)
        }
        if (url === '/api/auth/logout') {
          return adaptVercelHandler(logoutHandler)(req, res)
        }
        if (url === '/api/auth/me') {
          return adaptVercelHandler(meHandler)(req, res)
        }

        if (req.url && req.url.startsWith('/api/sync')) {
          if (req.method === 'OPTIONS') {
            res.statusCode = 204
            res.end()
            return
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
          // 1. Authenticate request & derive userId from session token
          const sessionUser = getAuthenticatedUser(req)
          if (!sessionUser || !sessionUser.userId) {
            res.statusCode = 401
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Authentication required. Valid session required for sync.' }))
            return
          }

          const userId = sessionUser.userId
          const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
          const userFile = path.join(dataDir, `user_${safeUserId}.json`)

          // 2. Validate payload size
          const contentLength = parseInt(req.headers['content-length'] || '0', 10)
          if (contentLength > 10 * 1024 * 1024) {
            res.statusCode = 413
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'Payload too large. Maximum size is 10MB.' }))
            return
          }

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
                if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid payload shape: root must be a JSON object.' }))
                  return
                }

                if (parsed.trades !== undefined && !Array.isArray(parsed.trades)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid payload shape: trades must be an array.' }))
                  return
                }
                if (Array.isArray(parsed.trades) && parsed.trades.length > 50000) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Trades array exceeds maximum limit of 50,000 items.' }))
                  return
                }

                if (parsed.diary !== undefined && !Array.isArray(parsed.diary)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid payload shape: diary must be an array.' }))
                  return
                }
                if (Array.isArray(parsed.diary) && parsed.diary.length > 10000) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Diary array exceeds maximum limit of 10,000 items.' }))
                  return
                }

                if (parsed.capitalLogs !== undefined && !Array.isArray(parsed.capitalLogs)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid payload shape: capitalLogs must be an array.' }))
                  return
                }
                if (Array.isArray(parsed.capitalLogs) && parsed.capitalLogs.length > 5000) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Capital logs array exceeds maximum limit of 5,000 items.' }))
                  return
                }

                if (parsed.settings !== undefined && parsed.settings !== null && (typeof parsed.settings !== 'object' || Array.isArray(parsed.settings))) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid payload shape: settings must be an object or null.' }))
                  return
                }

                if (parsed.updatedAt !== undefined && (typeof parsed.updatedAt !== 'number' || isNaN(parsed.updatedAt))) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'Invalid payload shape: updatedAt must be a numeric timestamp.' }))
                  return
                }

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
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message }))
              }
            })
            return
          }
        }

        // Local AI Contract Note Parse Endpoint
        if (req.url && req.url.startsWith('/api/ai/parse-contract-note')) {
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
                  res.end(JSON.stringify({ error: 'Please provide a free Gemini API key to parse PDF contract notes. Excel/CSV tradebooks are parsed automatically without any key!', needsApiKey: true }))
                  return
                }

                if (apiKey && !apiKey.startsWith('AIzaSy')) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: "Invalid Gemini API key. Google Gemini API keys from Google AI Studio (aistudio.google.com) start with 'AIzaSy...'. Note: Broker Excel/CSV files are parsed 100% locally without any API key!", needsApiKey: true }))
                  return
                }

                const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '')

                const systemPrompt = `You are an expert Indian Stock & Derivatives (NSE/BSE) contract note and tradebook parser.
Analyze all executed trades in the document and match corresponding Buy and Sell orders for the same instrument into complete round-trip trades.
Extract: date (YYYY-MM-DD), symbol (e.g. NIFTY 25000 CE), underlying, segment (Options/Futures/Equity), tradeType (Call/Put), optionType (CE/PE), strikePrice, expiryDate, entryTime, exitTime, quantity, entryPrice, exitPrice, grossPnL, charges, netPnL, strategy, notes.
Statutory charges for Indian Options & Futures (FY 2026-27): STT = 0.15% on sell premium turnover (Options) or 0.05% on sell turnover (Futures), Stamp duty = 0.003% on buy premium turnover, NSE options turnover = 0.03553%, SEBI fee = 0.0001% (₹10/Cr), Brokerage = broker-specific (typically ₹20/order), GST = 18% on (Brokerage + NSE + SEBI).
Return ONLY a valid JSON object:
{ "broker": "Broker Name", "tradeDate": "YYYY-MM-DD", "totalCharges": 0, "trades": [...] }`

                const candidateModels = [
                  'gemini-2.5-flash',
                  'gemini-2.0-flash',
                  'gemini-1.5-flash',
                  'gemini-1.5-flash-latest',
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
