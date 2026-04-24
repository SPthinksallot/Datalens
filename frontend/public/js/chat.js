// ============================================================
// Unit 2: ES6 — ChatUI module
//   classes, async/await, Promises, template literals,
//   arrow functions, let/const, string methods,
//   EventSource (SSE), DOM manipulation
// Unit 3: jQuery — event handling, effects, DOM manipulation
// Unit 4: Connects to POST /api/chat via SSE streaming
// ============================================================

'use strict';

// Unit 2: ES6 Class — manages one chat session
class ChatSession {
  constructor(sessionId) {
    this.sessionId = sessionId;
    // Unit 2: static method on Date for unique id
    this.chatId    = `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.messages  = [];  // Unit 2: array
    this.streaming = false;
  }

  // Unit 2: method — adds message to local history
  addMessage(role, content) {
    this.messages.push({ role, content, timestamp: new Date() });
  }

  // Unit 2: getter — number of turns
  get turnCount() {
    return this.messages.filter(m => m.role === 'user').length;
  }
}

// ── ChatUI — IIFE module pattern ─────────────────────────────
// Unit 2: IIFE, closures, let, const
const ChatUI = (() => {

  let _session  = null;   // current ChatSession instance
  let _abortCtl = null;   // AbortController for cancelling streams

  // ── Init — called after analysis loads ────────────────────
  function init(sessionId) {
    _session = new ChatSession(sessionId);

    // Load any saved history for this session
    _loadHistory();

    // Unit 3: jQuery event — send on Enter key
    $('#chatInput').off('keydown').on('keydown', function (e) {
      // Unit 2: string method — key detection
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
      }
    });

    // Unit 3: jQuery event — send button click
    $('#chatSendBtn').off('click').on('click', send);

    // Unit 3: jQuery event — clear button
    $('#chatClearBtn').off('click').on('click', clearChat);

    // Check Ollama status
    _checkOllamaStatus();

    // Show suggested questions based on data
    _buildSuggestions();
  }

  // ── Send a message ─────────────────────────────────────────
  async function send() {
    const $input = $('#chatInput');
    const text   = $input.val().trim();
    if (!text || _session?.streaming) return;

    $input.val('');
    _appendMessage('user', text);
    _session.addMessage('user', text);

    // Show typing indicator — Unit 3: jQuery DOM
    const $typing = _appendTyping();
    _session.streaming = true;
    _updateSendBtn(true);

    try {
      // Unit 2: async/await, fetch with SSE
      await _streamFromBackend(text, $typing);
    } catch (err) {
      $typing.remove();
      _appendMessage('assistant', `Error: ${err.message}`, 'error');
    } finally {
      _session.streaming = false;
      _updateSendBtn(false);
      // Unit 3: jQuery focus
      $input.focus();
    }
  }

  // ── Stream response via SSE fetch ─────────────────────────
  // Unit 2: async/await, ReadableStream, TextDecoder
  async function _streamFromBackend(message, $typingEl) {
    _abortCtl = new AbortController();

    const res = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        sessionId: _session.sessionId,
        chatId:    _session.chatId,
        message
      }),
      signal: _abortCtl.signal
    });

    if (!res.ok) throw new Error(`Server error: ${res.status}`);

    // SSE streaming — Unit 2: ReadableStream API
    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText  = '';

    // Create the assistant bubble now (empty)
    $typingEl.remove();
    const $bubble = _appendMessage('assistant', '', 'streaming');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      // SSE lines: "data: {...}\n\n"
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '));

      for (const line of lines) {
        try {
          // Unit 2: string method slice, JSON.parse
          const payload = JSON.parse(line.slice(6));
          if (payload.content) {
            fullText += payload.content;
            // Unit 2: DOM update — innerHTML with markdown-lite rendering
            $bubble.find('.msg-content').html(_renderMarkdown(fullText) + '<span class="cursor">▋</span>');
            _scrollToBottom();
          }
          if (payload.done) {
            // Remove cursor, finalise
            $bubble.find('.cursor').remove();
            $bubble.removeClass('streaming');
            _session.addMessage('assistant', fullText);
            _scrollToBottom();
            return;
          }
        } catch { /* skip malformed SSE line */ }
      }
    }
  }

  // ── Append a chat message bubble ──────────────────────────
  // Unit 2: template literals, DOM manipulation
  function _appendMessage(role, content, extraClass = '') {
    const isUser = role === 'user';
    const html   = `
      <div class="chat-msg ${isUser ? 'msg-user' : 'msg-bot'} ${extraClass}">
        <div class="msg-avatar">${isUser ? 'U' : 'AI'}</div>
        <div class="msg-body">
          <div class="msg-content">${isUser ? _escHtml(content) : _renderMarkdown(content)}</div>
          <div class="msg-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
      </div>`;
    // Unit 3: jQuery append + fadeIn effect
    const $el = $(html).hide();
    $('#chatMessages').append($el);
    $el.fadeIn(180);
    _scrollToBottom();
    return $el;
  }

  // ── Typing indicator ───────────────────────────────────────
  function _appendTyping() {
    const html = `
      <div class="chat-msg msg-bot typing-msg">
        <div class="msg-avatar">AI</div>
        <div class="msg-body">
          <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
      </div>`;
    const $el = $(html).hide();
    $('#chatMessages').append($el);
    // Unit 3: jQuery slideDown
    $el.slideDown(150);
    _scrollToBottom();
    return $el;
  }

  // ── Suggestions — smart questions based on dataset ─────────
  function _buildSuggestions() {
    if (!window._analysisData) return;
    const data    = window._analysisData;
    const numCols = (data.headers || []).filter(h => data.types?.[h] === 'number');
    const strCols = (data.headers || []).filter(h => data.types?.[h] === 'string');

    // Unit 2: template literals, conditional expressions
    const suggestions = [
      `What are the key insights from this dataset?`,
      numCols[0] ? `What is the distribution of ${numCols[0]}?` : null,
      numCols[1] ? `Is there a correlation between ${numCols[0]} and ${numCols[1]}?` : null,
      strCols[0] ? `What are the most common values in ${strCols[0]}?` : null,
      `Are there any outliers I should be worried about?`,
      `Which columns have the most missing data?`,
      data.topCorrelations?.[0] ? `Explain the correlation between ${data.topCorrelations[0].colA} and ${data.topCorrelations[0].colB}` : null,
    ].filter(Boolean).slice(0, 5); // Unit 2: filter, slice

    // Unit 3: jQuery — build suggestion chips
    const $chips = $('#chatSuggestions');
    $chips.empty();
    suggestions.forEach(s => {
      const $chip = $(`<button class="suggestion-chip">${_escHtml(s)}</button>`);
      $chip.on('click', function () {
        $('#chatInput').val(s);
        send();
        // Unit 3: jQuery slideUp after use
        $chips.slideUp(200);
      });
      $chips.append($chip);
    });
    // Unit 3: jQuery slideDown
    $chips.hide().slideDown(300);
  }

  // ── Load existing chat history from backend ────────────────
  async function _loadHistory() {
    if (!_session?.chatId) return;
    try {
      const data = await ApiClient.getChatHistory(_session.chatId);
      if (data.messages?.length) {
        // Replay messages into UI
        data.messages.forEach(m => {
          if (m.role !== 'system') _appendMessage(m.role, m.content);
        });
        _session.messages = data.messages;
        // Unit 3: jQuery hide suggestions if history exists
        $('#chatSuggestions').hide();
      }
    } catch { /* no history yet */ }
  }

  // ── Clear chat ─────────────────────────────────────────────
  async function clearChat() {
    if (!confirm('Clear this conversation?')) return;
    // Unit 3: jQuery fadeOut + empty
    $('#chatMessages').fadeOut(200, async function () {
      $(this).empty().fadeIn(200);
      _session = new ChatSession(_session?.sessionId);
      _buildSuggestions();
      try {
        await fetch(`/api/chat/${_session.chatId}`, { method: 'DELETE' });
      } catch { /* offline */ }
    });
  }

  // ── Check Ollama status ────────────────────────────────────
  async function _checkOllamaStatus() {
    try {
      const data = await (await fetch('/api/chat/ollama/status')).json();
      const $status = $('#ollamaStatus');
      if (data.running) {
        // Unit 3: jQuery DOM + CSS
        $status.html(`
          <span class="status-dot dot-green"></span>
          Ollama running · model: <strong>${data.models[0] || data.recommended}</strong>
        `).show();
      } else {
        $status.html(`
          <span class="status-dot dot-red"></span>
          Ollama not running —
          <a href="https://ollama.com" target="_blank">install</a> then run:
          <code>ollama serve</code> &amp; <code>ollama pull llama3</code>
        `).show();
      }
    } catch {
      $('#ollamaStatus').html(`<span class="status-dot dot-red"></span> Could not reach backend`).show();
    }
  }

  // ── Markdown-lite renderer ─────────────────────────────────
  // Unit 2: string methods — replace with regex
  function _renderMarkdown(text) {
    return _escHtml(text)
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g,     '<em>$1</em>')
      .replace(/`(.+?)`/g,       '<code>$1</code>')
      .replace(/^#{1,3} (.+)$/gm, '<strong>$1</strong>')
      .replace(/^[-•] (.+)$/gm,  '<div class="md-li">• $1</div>')
      .replace(/^\d+\. (.+)$/gm, '<div class="md-li">$1</div>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g,   '<br>');
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _scrollToBottom() {
    const el = document.getElementById('chatMessages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  function _updateSendBtn(isStreaming) {
    // Unit 3: jQuery prop + text
    $('#chatSendBtn')
      .prop('disabled', isStreaming)
      .text(isStreaming ? '…' : 'Send');
  }

  return { init, send, clearChat };
})();

// Add getChatHistory to ApiClient (extends existing api.js)
// Unit 4: GET /api/chat/:chatId
ApiClient.getChatHistory = async function (chatId) {
  const res = await fetch(`/api/chat/${chatId}`);
  if (!res.ok) throw new Error('Could not load chat history');
  return res.json();
};
