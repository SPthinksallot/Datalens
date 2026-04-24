// ============================================================
// Chat UI — Gemini AI Version
// ============================================================

'use strict';

// ── Chat Session Class ───────────────────────────────────────
class ChatSession {
  constructor(sessionId) {
    this.sessionId = sessionId;

    this.chatId =
      `chat_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 7)}`;

    this.messages = [];
    this.streaming = false;
  }

  addMessage(role, content) {
    this.messages.push({
      role,
      content,
      timestamp: new Date()
    });
  }

  get turnCount() {
    return this.messages.filter(
      m => m.role === 'user'
    ).length;
  }
}

// ── Chat UI Module ───────────────────────────────────────────
const ChatUI = (() => {

  let _session = null;

  // ── Init ──────────────────────────────────────────────────
  function init(sessionId) {

    _session = new ChatSession(sessionId);

    _loadHistory();

    $('#chatInput')
      .off('keydown')
      .on('keydown', function (e) {

        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }

      });

    $('#chatSendBtn')
      .off('click')
      .on('click', send);

    $('#chatClearBtn')
      .off('click')
      .on('click', clearChat);

    _buildSuggestions();
  }

  // ── Send Message ──────────────────────────────────────────
  async function send() {

    const $input = $('#chatInput');

    const text = $input
      .val()
      .trim();

    if (!text || _session?.streaming) {
      return;
    }

    $input.val('');

    _appendMessage(
      'user',
      text
    );

    _session.addMessage(
      'user',
      text
    );

    const $typing =
      _appendTyping();

    _session.streaming = true;

    _updateSendBtn(true);

    try {

      await _sendToBackend(
        text,
        $typing
      );

    } catch (err) {

      $typing.remove();

      _appendMessage(
        'assistant',
        `Error: ${err.message}`,
        'error'
      );

    } finally {

      _session.streaming = false;

      _updateSendBtn(false);

      $input.focus();
    }
  }

  // ── Send to Backend ───────────────────────────────────────
  async function _sendToBackend(
    message,
    $typingEl
  ) {

    const res = await fetch(
      '/api/chat',
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json'
        },

        body: JSON.stringify({
          sessionId:
            _session.sessionId,

          chatId:
            _session.chatId,

          message
        })
      }
    );

    if (!res.ok) {
      throw new Error(
        `Server error: ${res.status}`
      );
    }

    const data =
      await res.json();

    $typingEl.remove();

    const reply =
      data.reply ||
      'No response received';

    _appendMessage(
      'assistant',
      reply
    );

    _session.addMessage(
      'assistant',
      reply
    );
  }

  // ── Append Message ────────────────────────────────────────
  function _appendMessage(
    role,
    content,
    extraClass = ''
  ) {

    const isUser =
      role === 'user';

    const html = `
      <div class="chat-msg ${isUser ? 'msg-user' : 'msg-bot'} ${extraClass}">
        
        <div class="msg-avatar">
          ${isUser ? 'U' : 'AI'}
        </div>

        <div class="msg-body">

          <div class="msg-content">
            ${isUser
        ? _escHtml(content)
        : _renderMarkdown(content)
      }
          </div>

          <div class="msg-time">
            ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })}
          </div>

        </div>

      </div>
    `;

    const $el =
      $(html).hide();

    $('#chatMessages')
      .append($el);

    $el.fadeIn(180);

    _scrollToBottom();

    return $el;
  }

  // ── Typing Indicator ──────────────────────────────────────
  function _appendTyping() {

    const html = `
      <div class="chat-msg msg-bot typing-msg">

        <div class="msg-avatar">
          AI
        </div>

        <div class="msg-body">
          <div class="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

      </div>
    `;

    const $el =
      $(html).hide();

    $('#chatMessages')
      .append($el);

    $el.slideDown(150);

    _scrollToBottom();

    return $el;
  }

  // ── Suggestions ───────────────────────────────────────────
  function _buildSuggestions() {

    if (!window._analysisData) {
      return;
    }

    const data =
      window._analysisData;

    const numCols =
      (data.headers || [])
        .filter(
          h => data.types?.[h]
            === 'number'
        );

    const strCols =
      (data.headers || [])
        .filter(
          h => data.types?.[h]
            === 'string'
        );

    const suggestions = [

      'What are the key insights from this dataset?',

      numCols[0]
        ? `What is the distribution of ${numCols[0]}?`
        : null,

      numCols[1]
        ? `Is there a correlation between ${numCols[0]} and ${numCols[1]}?`
        : null,

      strCols[0]
        ? `What are the most common values in ${strCols[0]}?`
        : null,

      'Are there any outliers?',

      'Which columns have the most missing values?'

    ]
      .filter(Boolean)
      .slice(0, 5);

    const $chips =
      $('#chatSuggestions');

    $chips.empty();

    suggestions.forEach(s => {

      const $chip = $(`
        <button class="suggestion-chip">
          ${_escHtml(s)}
        </button>
      `);

      $chip.on(
        'click',
        function () {

          $('#chatInput')
            .val(s);

          send();

          $chips.slideUp(200);
        }
      );

      $chips.append($chip);

    });

    $chips
      .hide()
      .slideDown(300);
  }

  // ── Load Chat History ─────────────────────────────────────
  async function _loadHistory() {

    if (!_session?.chatId) {
      return;
    }

    try {

      const data =
        await ApiClient
          .getChatHistory(
            _session.chatId
          );

      if (data.messages?.length) {

        data.messages
          .forEach(m => {

            if (m.role !== 'system') {

              _appendMessage(
                m.role,
                m.content
              );

            }

          });

        _session.messages =
          data.messages;

        $('#chatSuggestions')
          .hide();
      }

    } catch {

      // ignore

    }
  }

  // ── Clear Chat ────────────────────────────────────────────
  async function clearChat() {

    if (
      !confirm(
        'Clear this conversation?'
      )
    ) {
      return;
    }

    $('#chatMessages')
      .fadeOut(
        200,

        async function () {

          $(this)
            .empty()
            .fadeIn(200);

          _session =
            new ChatSession(
              _session?.sessionId
            );

          _buildSuggestions();

          try {

            await fetch(
              `/api/chat/${_session.chatId}`,
              {
                method: 'DELETE'
              }
            );

          } catch { }

        }
      );
  }

  // ── Markdown Renderer ─────────────────────────────────────
  function _renderMarkdown(
    text
  ) {

    return _escHtml(text)

      .replace(
        /\*\*(.+?)\*\*/g,
        '<strong>$1</strong>'
      )

      .replace(
        /\*(.+?)\*/g,
        '<em>$1</em>'
      )

      .replace(
        /`(.+?)`/g,
        '<code>$1</code>'
      )

      .replace(
        /^[-•] (.+)$/gm,
        '<div class="md-li">• $1</div>'
      )

      .replace(
        /\n/g,
        '<br>'
      );
  }

  // ── Escape HTML ───────────────────────────────────────────
  function _escHtml(str) {

    return String(str)

      .replace(
        /&/g,
        '&amp;'
      )

      .replace(
        /</g,
        '&lt;'
      )

      .replace(
        />/g,
        '&gt;'
      )

      .replace(
        /"/g,
        '&quot;'
      );
  }

  // ── Scroll ────────────────────────────────────────────────
  function _scrollToBottom() {

    const el =
      document.getElementById(
        'chatMessages'
      );

    if (el) {
      el.scrollTop =
        el.scrollHeight;
    }
  }

  // ── Send Button State ─────────────────────────────────────
  function _updateSendBtn(
    loading
  ) {

    $('#chatSendBtn')

      .prop(
        'disabled',
        loading
      )

      .text(
        loading
          ? '...'
          : 'Send'
      );
  }

  return {
    init,
    send,
    clearChat
  };

})();

// ── Chat History API ─────────────────────────────────────────
ApiClient.getChatHistory =
  async function (chatId) {

    const res =
      await fetch(
        `/api/chat/${chatId}`
      );

    if (!res.ok) {
      throw new Error(
        'Could not load chat history'
      );
    }

    return res.json();
  };