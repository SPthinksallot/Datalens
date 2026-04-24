// ============================================================
// backend/routes/chat.js
// AI Backend Route
// ============================================================

const express = require('express');
const OpenAI = require('openai');
const Analysis = require('../models/Analysis');
const ChatLog = require('../models/ChatLog');
const { memStore } = require('./analyze');

const router = express.Router();

const client = new OpenAI({

  baseURL:
    'https://openrouter.ai/api/v1',

  apiKey:
    process.env.OPENROUTER_API_KEY

});

// ── Memory fallback ──────────────────────────────────────────
const chatMemStore = new Map();

// ── Build Dataset Context ────────────────────────────────────
function buildSystemPrompt(analysis) {

  if (!analysis) {

    return `
You are DataLens AI.

No dataset is currently loaded.

Ask the user to upload a dataset first.
`;

  }

  const {

    fileName = 'Unknown',

    rowCount = 0,

    colCount = 0,

    headers = [],

    insights = [],

    topCorrelations = [],

    columnStats = []

  } = analysis;

  const numericCols =
    columnStats.filter(
      c => c.type === 'number'
    );

  const categoricalCols =
    columnStats.filter(
      c => c.type === 'string'
    );

  return `

You are DataLens AI.

You are an expert data analyst.

ONLY answer using the dataset below.

Dataset:
${fileName}

Rows:
${rowCount}

Columns:
${colCount}

Headers:
${headers.join(', ')}

Numeric Columns:
${numericCols.map(c => `
- ${c.name}
  mean=${c.mean}
  median=${c.median}
  min=${c.min}
  max=${c.max}
`).join('\n')}

Categorical Columns:
${categoricalCols.map(c => `
- ${c.name}
  unique=${c.unique}
`).join('\n')}

Insights:
${insights.map(i => `
- ${i.title}: ${i.body}
`).join('\n')}

Top Correlations:
${topCorrelations.map(c => `
- ${c.colA} ↔ ${c.colB}
  correlation=${c.r}
`).join('\n')}

Rules:
- be concise
- use statistics
- do not hallucinate
- answer clearly

`;

}

// ── POST /api/chat ───────────────────────────────────────────
router.post('/', async (req, res) => {

  try {

    const {

      sessionId,

      chatId,

      message

    } = req.body;

    if (!message?.trim()) {

      return res.status(400).json({
        error: 'Message required'
      });

    }

    // ── Load dataset analysis ───────────────────────────────

    let analysis = null;

    if (sessionId) {

      try {

        analysis =
          await Analysis.findOne({
            sessionId
          });

      } catch {

        analysis =
          memStore.get(sessionId)
          || null;

      }

    }

    // ── Load history ────────────────────────────────────────

    let history = [];

    if (chatId) {

      try {

        const chat =
          await ChatLog.findOne({
            chatId
          });

        history =
          chat?.messages || [];

      } catch {

        history =
          chatMemStore.get(chatId)
          || [];

      }

    }

    // ── Build final prompt ──────────────────────────────────

    const prompt = `

${buildSystemPrompt(analysis)}

Conversation History:

${history.map(h =>
      `${h.role}: ${h.content}`
    ).join('\n')}

User Question:

${message}

`;

    // ── Request ──────────────────────────────────────

    const completion =
      await client.chat.completions.create({

        model:
          'openai/gpt-4o-mini',

        messages: [

          {
            role: 'user',
            content: prompt
          }

        ]

      });

    const text =
      completion.choices[0]
        ?.message
        ?.content
      || 'No response';

    // ── Save history ────────────────────────────────────────

    await saveChatHistory(

      chatId,

      sessionId,

      message,

      text,

      history

    );

    // ── Return AI response ──────────────────────────────────

    res.json({

      reply: text

    });

  } catch (err) {

    console.error(
      'OPENROUTER ERROR:',
      err
    );

    res.status(500).json({

      error:
        err.message
        || 'AI request failed'

    });

  }

});

// ── Save Chat History ────────────────────────────────────────
async function saveChatHistory(

  chatId,

  sessionId,

  userMessage,

  aiReply,

  previousHistory

) {

  if (!chatId) {
    return;
  }

  const updated = [

    ...previousHistory,

    {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    },

    {
      role: 'assistant',
      content: aiReply,
      timestamp: new Date()
    }

  ];

  try {

    await ChatLog.findOneAndUpdate(

      { chatId },

      {

        chatId,

        sessionId,

        messages: updated,

        updatedAt: new Date()

      },

      {

        upsert: true,

        new: true

      }

    );

  } catch {

    chatMemStore.set(
      chatId,
      updated
    );

  }

}

// ── GET Chat History ─────────────────────────────────────────
router.get('/:chatId', async (req, res) => {

  try {

    const { chatId } =
      req.params;

    let messages = [];

    try {

      const chat =
        await ChatLog.findOne({
          chatId
        });

      messages =
        chat?.messages || [];

    } catch {

      messages =
        chatMemStore.get(chatId)
        || [];

    }

    res.json({

      chatId,

      messages

    });

  } catch (err) {

    res.status(500).json({

      error:
        err.message

    });

  }

});

// ── DELETE Chat History ──────────────────────────────────────
router.delete('/:chatId', async (req, res) => {

  try {

    const { chatId } =
      req.params;

    try {

      await ChatLog.deleteOne({
        chatId
      });

    } catch {

      chatMemStore.delete(
        chatId
      );

    }

    res.json({

      deleted: true

    });

  } catch (err) {

    res.status(500).json({

      error:
        err.message

    });

  }

});

// ── Health Test Route ────────────────────────────────────────
router.get('/test/ping', (req, res) => {

  res.json({

    ok: true,

    message:
      'Chat API working'

  });

});

module.exports = router;