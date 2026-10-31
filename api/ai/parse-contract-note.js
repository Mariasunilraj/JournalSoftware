export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileBase64, mimeType = 'application/pdf', apiKey: userApiKey, pdfPassword } = req.body || {};

    if (!fileBase64) {
      return res.status(400).json({ error: 'Please upload a PDF contract note file.' });
    }

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'Missing Gemini API Key. Please provide a free Gemini API key from Google AI Studio (aistudio.google.com) or configure GEMINI_API_KEY in Vercel. For Excel and CSV tradebooks, no API key is required.',
        needsApiKey: true,
      });
    }

    if (apiKey && !apiKey.startsWith('AIzaSy')) {
      return res.status(400).json({
        error: "Invalid Gemini API key. Google Gemini API keys from Google AI Studio (aistudio.google.com) start with 'AIzaSy...'. The provided key appears to be an Azure or external token. Excel & CSV tradebooks are parsed automatically without any key!",
        needsApiKey: true,
      });
    }

    const systemPrompt = `You are an expert Indian Stock & Derivatives (NSE/BSE) contract note and tradebook parser.
Your task is to analyze the uploaded broker Contract Note / Trade Confirmation / Tradebook PDF (from brokers like Zerodha, Groww, Angel One, Dhan, Upstox, Kotak Neo, Shoonya, ICICI Direct, HDFC Sky, Fyers, etc.).

Analyze all executed trades in the document and match corresponding Buy and Sell orders for the same instrument to produce complete round-trip trades.

For each trade, extract and compute:
1. "date": Trade execution date in YYYY-MM-DD format.
2. "symbol": Full trading symbol, e.g. "NIFTY 25000 CE", "BANKNIFTY 52000 PE", "RELIANCE", "TCS".
3. "underlying": The index or stock name, e.g. "NIFTY", "BANKNIFTY", "FINNIFTY", "MIDCPNIFTY", "SENSEX", "RELIANCE".
4. "segment": One of ["Options", "Futures", "Equity"].
5. "tradeType": "Call" if Call option (CE) or Long equity, "Put" if Put option (PE).
6. "optionType": "CE" for Call, "PE" for Put, or null for Equity/Futures.
7. "strikePrice": Strike price number (e.g. 25000), or null for Equity.
8. "expiryDate": Option/Future expiry date (YYYY-MM-DD) if available, otherwise trade date.
9. "entryTime": Approximate execution entry time (e.g. "09:35") or "09:30".
10. "exitTime": Approximate execution exit time (e.g. "10:15") or "15:15".
11. "quantity": Executed quantity (positive integer).
12. "entryPrice": Buy average price per unit (number).
13. "exitPrice": Sell average price per unit (number).
14. "grossPnL": (exitPrice - entryPrice) * quantity (number rounded to 2 decimals).
15. "charges": Proportionate statutory charges + brokerage for this trade. Apply official Government circular rates (FY 2026-27): STT = 0.15% on sell premium turnover, Stamp duty = 0.003% on buy premium turnover, NSE options turnover = 0.03553%, SEBI fee = 0.0001% (₹10/Cr), Brokerage = broker-specific (typically ₹20/order), GST = 18% on (Brokerage + NSE + SEBI).
16. "netPnL": grossPnL - charges (number rounded to 2 decimals).
17. "strategy": Strategy detected, e.g. "Intraday Options", "Momentum", "Breakout", "Expiry Scalp".
18. "notes": Brief summary, e.g. "Contract note execution for NIFTY 25000 CE".

IMPORTANT:
- Output MUST be a strict JSON object with this exact structure:
{
  "broker": "Detected Broker Name (e.g. Zerodha, Groww, Angel One, Dhan, etc.)",
  "contractNoteNo": "Contract note / settlement number if visible",
  "tradeDate": "YYYY-MM-DD",
  "totalCharges": 0.00,
  "trades": [
    { ...trade fields... }
  ]
}
- Return ONLY valid JSON, without any markdown formatting or commentary.`;

    const cleanBase64 = fileBase64.replace(/^data:[^;]+;base64,/, '');

    const parts = [];
    if (mimeType === 'application/pdf') {
      parts.push({
        inline_data: {
          mime_type: 'application/pdf',
          data: cleanBase64,
        },
      });
    } else {
      // For CSV / Excel text, send as direct text prompt (Gemini accepts text natively)
      const textContent = Buffer.from(cleanBase64, 'base64').toString('utf-8');
      parts.push({
        text: `Broker Tradebook / P&L Export Data (CSV):\n\`\`\`csv\n${textContent}\n\`\`\``,
      });
    }
    parts.push({
      text: systemPrompt,
    });

    const requestPayload = {
      contents: [
        {
          parts,
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    const candidateModels = [
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-pro',
    ];

    let response = null;
    let lastErrMessage = '';

    for (const model of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const respAttempt = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestPayload),
        });

        if (respAttempt.ok) {
          response = respAttempt;
          break;
        }

        const errText = await respAttempt.text();
        let parsedMsg = errText;
        try {
          const errJson = JSON.parse(errText);
          parsedMsg = errJson.error?.message || errText;
        } catch (e) {}

        lastErrMessage = parsedMsg;

        // If model is discontinued or not found, try the next model
        if (
          respAttempt.status === 404 ||
          parsedMsg.includes('no longer available') ||
          parsedMsg.includes('not found') ||
          parsedMsg.includes('unsupported')
        ) {
          continue;
        } else {
          // If it's a key or auth error, don't keep trying
          response = respAttempt;
          break;
        }
      } catch (err) {
        lastErrMessage = err.message;
      }
    }

    if (!response || !response.ok) {
      if (lastErrMessage.includes('API_KEY_INVALID') || lastErrMessage.includes('API key not valid')) {
        return res.status(400).json({
          error: 'The provided Gemini API key is invalid. Please verify your key from Google AI Studio (aistudio.google.com).',
          needsApiKey: true,
        });
      }

      return res.status(response?.status || 500).json({
        error: `Gemini API error: ${lastErrMessage || 'Failed to call Gemini model.'}`,
      });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      return res.status(500).json({ error: 'AI did not return any trade data from this PDF.' });
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(rawText);
    } catch (e) {
      // Clean possible backticks
      const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    }

    return res.status(200).json({
      success: true,
      broker: parsedResult.broker || 'Contract Note',
      tradeDate: parsedResult.tradeDate || new Date().toISOString().slice(0, 10),
      totalCharges: parsedResult.totalCharges || 0,
      trades: Array.isArray(parsedResult.trades) ? parsedResult.trades : [],
    });
  } catch (err) {
    console.error('Contract note parse error:', err);
    return res.status(500).json({ error: err.message || 'Failed to parse contract note PDF' });
  }
}
