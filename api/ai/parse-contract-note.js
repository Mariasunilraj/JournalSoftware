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
        error: 'Missing Gemini API Key. Please provide a free Gemini API key from Google AI Studio (aistudio.google.com) or configure GEMINI_API_KEY in Vercel.',
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
15. "charges": Proportionate statutory charges + brokerage for this trade (STT, Exchange turnover, GST, SEBI fee, Stamp duty, Brokerage). If document lists total charges, allocate proportionately.
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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const requestPayload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: cleanBase64,
              },
            },
            {
              text: systemPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        response_mime_type: 'application/json',
        temperature: 0.1,
      },
    };

    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const errJson = JSON.parse(errText);
        parsedErr = errJson.error?.message || errText;
      } catch (e) {}

      if (response.status === 400 && parsedErr.includes('API_KEY_INVALID')) {
        return res.status(400).json({
          error: 'The provided Gemini API key is invalid. Please verify your key from Google AI Studio.',
          needsApiKey: true,
        });
      }

      return res.status(response.status).json({
        error: `Gemini API error: ${parsedErr}`,
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
