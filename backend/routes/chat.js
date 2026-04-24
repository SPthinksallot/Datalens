// ============================================================
// Unit 4: Express Route  — /api/chat
// Covers : POST route, streaming response, fetch to Ollama,
//          Node.js EventEmitter, middleware, error handling
// Unit 2 : ES6 classes, template literals, array methods,
//          destructuring, async/await, Promises
// ============================================================

const express  = require('express');
const Analysis = require('../models/Analysis');
const ChatLog  = require('../models/ChatLog');
const { memStore } = require('./analyze');

const router = express.Router();

// ── Ollama config ─────────────────────────────────────────────
const OLLAMA_URL   = process.env.OLLAMA_URL   || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'phi3';   // phi3 = fast ~2.3 GB

// ── In-memory chat history fallback (Unit 2: Map) ─────────────
const chatMemStore = new Map();

// ── Helper: build a rich system prompt from dataset analysis ──
// Unit 2: template literals, array methods (map, filter, slice)
function buildSystemPrompt(analysis) {
  const numCols = analysis.columnStats.filter(s => s.type === 'number');
  const strCols = analysis.columnStats.filter(s => s.type === 'string');

  // Unit 2: destructuring + default values
  const {
    fileName    = 'Unknown',
    rowCount    = 0,
    colCount    = 0,
    headers     = [],
    insights    = [],
    topCorrelations = []
  } = analysis;

  // Numeric summary block
  const numSummary = numCols.map(s =>
    `  - ${s.name}: mean=${s.mean?.toFixed(2)}, median=${s.median?.toFixed(2)}, ` +
    `min=${s.min}, max=${s.max}, stddev=${s.stddev?.toFixed(2)}, ` +
    `outliers=${s.outlierCount || 0}, missing=${s.missing || 0}`
  ).join('\n');

  // Categorical summary block
  const strSummary = strCols.map(s => {
    // Unit 2: optional chaining, slice, map
    const topVals = (s.topValues || []).slice(0, 5)
      .map(t => `${t.value}(${t.count})`).join(', ');
    return `  - ${s.name}: ${s.unique} unique values, top: [${topVals}], missing=${s.missing || 0}`;
  }).join('\n');

  // Correlation block
  const corrBlock = topCorrelations.slice(0, 6).map(p =>
    `  - "${p.colA}" ↔ "${p.colB}": r=${p.r} (${Math.abs(p.r) > 0.7 ? 'strong' : 'moderate'} ${p.r > 0 ? 'positive' : 'negative'})`
  ).join('\n');

  // Insights block
  const insightsBlock = insights.slice(0, 6).map(i =>
    `  [${i.type?.toUpperCase()}] ${i.title}: ${i.body}`
  ).join('\n');

  // Unit 2: multi-line template literal
  return `You are DataLens AI, an expert data analyst assistant embedded in a CSV analysis tool.

DATASET: "${fileName}"
SHAPE: ${rowCount.toLocaleString()} rows × ${colCount} columns
COLUMNS: ${headers.join(', ')}

NUMERIC COLUMN STATISTICS:
${numSummary || '  (none)'}

CATEGORICAL COLUMN STATISTICS:
${strSummary || '  (none)'}

TOP CORRELATIONS:
${corrBlock || '  (no numeric columns to correlate)'}

AUTO-GENERATED INSIGHTS:
${insightsBlock || '  (none)'}

INSTRUCTIONS:
- Answer questions about this specific dataset using the statistics above.
- Be concise and precise. Use numbers from the stats when relevant.
- If asked about a value not in the stats, say you can only see summary statistics.
- Format numbers clearly. Use bullet points for lists.
- If asked something unrelated to data analysis, politely redirect to the dataset.
- Never make up data that isn't in the statistics provided.`;
}

// ── POST /api/chat — send a message, get streaming response ───
router.post('/', async (req, res, next) => {
  try {
    // Unit 1: HTTP Request body
    const { sessionId, message, chatId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Load analysis for context
    let analysis = null;
    if (sessionId) {
      try {
        analysis = await Analysis.findOne({ sessionId });
      } catch {
        analysis = memStore.get(sessionId) || null;
      }
    }

    // Load existing chat history for this chatId
    let history = [];
    if (chatId) {
      try {
        const log = await ChatLog.findOne({ chatId });
        history = log?.messages || [];
      } catch {
        history = chatMemStore.get(chatId) || [];
      }
    }

    // Build messages array for Ollama
    // Unit 2: spread operator, array map
    const ollamaMessages = [
      // System prompt with full dataset context
      {
        role: 'system',
        content: analysis
          ? buildSystemPrompt(analysis)
          : 'You are DataLens AI, a data analyst assistant. No dataset is loaded yet — ask the user to upload and analyze a file first.'
      },
      // Prior conversation history (last 10 turns to keep context window manageable)
      ...history.slice(-10).map(m => ({ role: m.role, content: m.content })),
      // New user message
      { role: 'user', content: message.trim() }
    ];

    // ── Stream response from Ollama ───────────────────────────
    // Unit 1: HTTP headers for SSE (Server-Sent Events)
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.flushHeaders();

    // Unit 4: fetch to Ollama (Node 18+ built-in fetch)
    let fullResponse = '';
    try {
      const ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:    OLLAMA_MODEL,
          messages: ollamaMessages,
          stream:   true          // streaming mode
        })
      });

      if (!ollamaRes.ok) {
        // Ollama not running — send helpful error as SSE
        const errMsg = `Ollama is not running. Please start it with: ollama serve\nThen pull a model: ollama pull ${OLLAMA_MODEL}`;
        res.write(`data: ${JSON.stringify({ content: errMsg, done: true })}\n\n`);
        res.end();
        return;
      }

      // Unit 2: async iteration over stream chunks
      const reader = ollamaRes.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Ollama sends newline-delimited JSON
        const lines = chunk.split('\n').filter(l => l.trim());

        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const token  = parsed.message?.content || '';
            fullResponse += token;

            // Unit 1: SSE format — data: <json>\n\n
            res.write(`data: ${JSON.stringify({ content: token, done: parsed.done || false })}\n\n`);

            if (parsed.done) {
              // Save turn to chat history
              await saveChatTurn(chatId, sessionId, message, fullResponse, history);
              res.write(`data: ${JSON.stringify({ content: '', done: true })}\n\n`);
              res.end();
              return;
            }
          } catch { /* partial JSON line — skip */ }
        }
      }
    } catch (fetchErr) {
      // Ollama not reachable
      const errMsg = `Could not reach Ollama at ${OLLAMA_URL}.\n\nTo set up:\n1. Install Ollama: https://ollama.com\n2. Run: ollama serve\n3. Pull a model: ollama pull ${OLLAMA_MODEL}`;
      res.write(`data: ${JSON.stringify({ content: errMsg, done: true })}\n\n`);
      res.end();
    }

  } catch (err) {
    next(err);
  }
});

// ── Save conversation turn to DB ──────────────────────────────
async function saveChatTurn(chatId, sessionId, userMsg, assistantMsg, prevHistory) {
  if (!chatId) return;
  // Unit 2: spread to build updated history array
  const updatedHistory = [
    ...prevHistory,
    { role: 'user',      content: userMsg,      timestamp: new Date() },
    { role: 'assistant', content: assistantMsg, timestamp: new Date() }
  ];

  try {
    await ChatLog.findOneAndUpdate(
      { chatId },
      { chatId, sessionId, messages: updatedHistory, updatedAt: new Date() },
      { upsert: true, new: true }
    );
  } catch {
    // Fallback to in-memory
    chatMemStore.set(chatId, updatedHistory);
  }
}

// ── GET /api/chat/:chatId — load chat history ─────────────────
router.get('/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    let messages = [];
    try {
      const log = await ChatLog.findOne({ chatId });
      messages = log?.messages || [];
    } catch {
      messages = chatMemStore.get(chatId) || [];
    }
    res.json({ chatId, messages });
  } catch (err) {
    next(err);
  }
});

// ── DELETE /api/chat/:chatId — clear chat history ─────────────
router.delete('/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;
    try {
      await ChatLog.deleteOne({ chatId });
    } catch {
      chatMemStore.delete(chatId);
    }
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/chat/status — check if Ollama is running ─────────
router.get('/ollama/status', async (req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`);
    const data = await r.json();
    const models = (data.models || []).map(m => m.name);
    res.json({ running: true, models, recommended: OLLAMA_MODEL });
  } catch {
    res.json({ running: false, models: [], recommended: OLLAMA_MODEL });
  }
});

module.exports = router;
