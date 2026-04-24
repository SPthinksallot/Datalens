// ============================================================
// Unit 4: Express Route — /api/chat
// Gemini AI Integration
// ============================================================

const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const Analysis = require('../models/Analysis');
const ChatLog = require('../models/ChatLog');
const { memStore } = require('./analyze');

const router = express.Router();

// ── Gemini Setup ──────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash'
});

// ── In-memory fallback ────────────────────────────────────────
const chatMemStore = new Map();

// ── Build dataset-aware system prompt ─────────────────────────
function buildSystemPrompt(analysis) {
  const numCols = analysis.columnStats.filter(s => s.type === 'number');
  const strCols = analysis.columnStats.filter(s => s.type === 'string');

  const {
    fileName = 'Unknown',
    rowCount = 0,
    colCount = 0,
    headers = [],
    insights = [],
    topCorrelations = []
  } = analysis;

  const numSummary = numCols.map(s =>
    `- ${s.name}: mean=${s.mean?.toFixed(2)}, median=${s.median?.toFixed(2)}, min=${s.min}, max=${s.max}`
  ).join('\n');

  const strSummary = strCols.map(s => {
    const topVals = (s.topValues || [])
      .slice(0, 5)
      .map(t => `${t.value}(${t.count})`)
      .join(', ');

    return `- ${s.name}: ${s.unique} unique values, top: ${topVals}`;
  }).join('\n');

  const corrBlock = topCorrelations.map(c =>
    `- ${c.colA} ↔ ${c.colB}: r=${c.r}`
  ).join('\n');

  const insightsBlock = insights.map(i =>
    `- ${i.title}: ${i.body}`
  ).join('\n');

  return `
You are DataLens AI, a professional data analyst assistant.

Dataset: ${fileName}
Rows: ${rowCount}
Columns: ${colCount}

Headers:
${headers.join(', ')}

Numeric Statistics:
${numSummary || 'None'}

Categorical Statistics:
${strSummary || 'None'}

Top Correlations:
${corrBlock || 'None'}

Insights:
${insightsBlock || 'None'}

Instructions:
- Answer ONLY based on dataset information
- Be concise and accurate
- Use numbers/statistics when possible
- Do not hallucinate data
`;
}

// ── POST /api/chat ────────────────────────────────────────────
router.post('/', async (req, res, next) => {
  try {
    const { sessionId, message, chatId } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    // Load analysis
    let analysis = null;

    if (sessionId) {
      try {
        analysis = await Analysis.findOne({ sessionId });
      } catch {
        analysis = memStore.get(sessionId) || null;
      }
    }

    // Load history
    let history = [];

    if (chatId) {
      try {
        const log = await ChatLog.findOne({ chatId });
        history = log?.messages || [];
      } catch {
        history = chatMemStore.get(chatId) || [];
      }
    }

    // Build prompt
    const prompt = `
${analysis
        ? buildSystemPrompt(analysis)
        : 'No dataset loaded yet.'}

Conversation History:
${history.map(h => `${h.role}: ${h.content}`).join('\n')}

User Question:
${message}
`;

    // Gemini request
    const result = await model.generateContent(prompt);

    const response = await result.response;
    const text = response.text();

    // Save history
    await saveChatTurn(
      chatId,
      sessionId,
      message,
      text,
      history
    );

    res.json({
      reply: text
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'AI response failed'
    });
  }
});

// ── Save chat history ─────────────────────────────────────────
async function saveChatTurn(
  chatId,
  sessionId,
  userMsg,
  assistantMsg,
  prevHistory
) {
  if (!chatId) return;

  const updatedHistory = [
    ...prevHistory,
    {
      role: 'user',
      content: userMsg,
      timestamp: new Date()
    },
    {
      role: 'assistant',
      content: assistantMsg,
      timestamp: new Date()
    }
  ];

  try {
    await ChatLog.findOneAndUpdate(
      { chatId },
      {
        chatId,
        sessionId,
        messages: updatedHistory,
        updatedAt: new Date()
      },
      {
        upsert: true,
        new: true
      }
    );
  } catch {
    chatMemStore.set(chatId, updatedHistory);
  }
}

// ── GET chat history ──────────────────────────────────────────
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

    res.json({
      chatId,
      messages
    });

  } catch (err) {
    next(err);
  }
});

// ── DELETE chat history ───────────────────────────────────────
router.delete('/:chatId', async (req, res, next) => {
  try {
    const { chatId } = req.params;

    try {
      await ChatLog.deleteOne({ chatId });
    } catch {
      chatMemStore.delete(chatId);
    }

    res.json({
      deleted: true
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;