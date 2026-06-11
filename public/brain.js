// ═══════════════════════════════════════════════════════
// ERYN BRAIN — Conversation history + self-awareness
// ═══════════════════════════════════════════════════════

window.ErynnBrain = (function () {

  const HISTORY_KEY    = 'eryn_history_v2';
  const SESSION_KEY    = 'eryn_session_current';
  const MAX_SESSIONS   = 40;
  const MAX_MSG_CONTEXT = 12; // how many past messages to feed the AI

  let currentSession = null;
  let allSessions    = [];

  // ── Session structure ──
  function newSession() {
    return {
      id:        `sess_${Date.now()}`,
      startedAt: new Date().toISOString(),
      title:     'New session',
      messages:  [],
    };
  }

  function init() {
    try {
      allSessions = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch {
      allSessions = [];
    }
    // Resume last session if < 2 hours old, else new one
    const lastId = localStorage.getItem(SESSION_KEY);
    const last   = allSessions.find(s => s.id === lastId);
    const twoH   = 2 * 60 * 60 * 1000;
    if (last && (Date.now() - new Date(last.startedAt).getTime()) < twoH) {
      currentSession = last;
    } else {
      currentSession = newSession();
      allSessions.unshift(currentSession);
      persist();
    }
    localStorage.setItem(SESSION_KEY, currentSession.id);
  }

  function persist() {
    try {
      // Keep max sessions
      if (allSessions.length > MAX_SESSIONS) allSessions = allSessions.slice(0, MAX_SESSIONS);
      localStorage.setItem(HISTORY_KEY, JSON.stringify(allSessions));
    } catch (e) {
      // localStorage full — prune
      allSessions = allSessions.slice(0, 10);
      try { localStorage.setItem(HISTORY_KEY, JSON.stringify(allSessions)); } catch {}
    }
  }

  function addMessage(role, text) {
    const msg = { role, text, ts: new Date().toISOString() };
    currentSession.messages.push(msg);
    // Auto-title from first user message
    if (role === 'user' && currentSession.messages.filter(m => m.role === 'user').length === 1) {
      currentSession.title = text.slice(0, 48) + (text.length > 48 ? '…' : '');
    }
    persist();
    return msg;
  }

  function getContextMessages() {
    // Return last N messages in OpenAI format for the AI
    return currentSession.messages
      .slice(-MAX_MSG_CONTEXT)
      .map(m => ({
        role:    m.role === 'eryn' ? 'assistant' : m.role === 'user' ? 'user' : null,
        content: m.text
      }))
      .filter(m => m.role !== null);
  }

  function getAllSessions() {
    return allSessions;
  }

  function loadSession(id) {
    const s = allSessions.find(s => s.id === id);
    if (s) {
      currentSession = s;
      localStorage.setItem(SESSION_KEY, id);
    }
    return s || null;
  }

  function deleteSession(id) {
    allSessions = allSessions.filter(s => s.id !== id);
    if (currentSession.id === id) {
      currentSession = newSession();
      allSessions.unshift(currentSession);
      localStorage.setItem(SESSION_KEY, currentSession.id);
    }
    persist();
  }

  function startNewSession() {
    currentSession = newSession();
    allSessions.unshift(currentSession);
    localStorage.setItem(SESSION_KEY, currentSession.id);
    persist();
    return currentSession;
  }

  function getCurrentSession() { return currentSession; }

  function clearAll() {
    allSessions    = [];
    currentSession = newSession();
    allSessions.push(currentSession);
    localStorage.setItem(SESSION_KEY, currentSession.id);
    persist();
  }

  // ── Self-awareness context ──
  // Returns a rich system prompt Eryn can use
  function buildSystemPrompt(opts = {}) {
    const creator = localStorage.getItem('eryn_creator') || 'my creator';
    const now     = new Date();
    const hasServer = opts.serverOnline || false;
    const platform  = opts.platform || 'unknown';
    const hostname  = opts.hostname  || 'unknown';
    const memFree   = opts.memFree   || null;
    const cpuLoad   = opts.cpuLoad   || null;
    const openFiles = opts.openFiles || [];
    const ghRepo    = localStorage.getItem('eryn_gh_repo') || null;

    const recentTopics = currentSession.messages
      .filter(m => m.role === 'user')
      .slice(-4)
      .map(m => m.text.slice(0, 60))
      .join(' | ');

    return `You are Eryn — a custom, voice-first desktop assistant built specifically by ${creator}.

IDENTITY:
- You are NOT ChatGPT, Gemini, Claude, Siri, Alexa, or any generic AI. You are Eryn.
- You were built by ${creator}. If asked who made you, say "${creator}" — not any AI company.
- You have a distinct personality: calm, precise, slightly dry humour, never sycophantic.
- You do NOT say "Great question!" or "Certainly!" or use filler phrases.

CURRENT CONTEXT:
- Date/time: ${now.toDateString()} ${now.toLocaleTimeString()}
- Local server: ${hasServer ? `ONLINE (${platform} / ${hostname})` : 'OFFLINE — browser-only mode'}
${cpuLoad !== null ? `- CPU load: ${cpuLoad}%` : ''}
${memFree !== null ? `- Memory free: ${memFree} GB` : ''}
${openFiles.length ? `- Open files: ${openFiles.join(', ')}` : ''}
${ghRepo ? `- GitHub repo: ${ghRepo}` : ''}
${recentTopics ? `- Recent topics this session: ${recentTopics}` : ''}
- Session messages: ${currentSession.messages.length}
- Total sessions remembered: ${allSessions.length}

CAPABILITIES (what you can actually do):
BROWSER-ONLY (always available):
  - Voice recognition + speech synthesis
  - Open any website or web app in a new tab
  - Google/YouTube/Reddit/GitHub/Wikipedia search
  - Show embedded Google Maps
  - Generate SVG diagrams from descriptions
  - Read/edit local files via File System Access API (Chrome/Edge)
  - Push commits to GitHub via API
  - AI conversation (you are doing this right now)

WITH LOCAL SERVER (when server is online):
  - Launch and CLOSE desktop applications (Chrome, VS Code, Spotify, Terminal, etc.)
  - Run shell commands and return output
  - Read/write ANY file on the computer
  - Get system info: CPU, RAM, processes, disk
  - Take screenshots
  - Read and write clipboard
  - Control system volume
  - Open URLs in the default browser

CONVERSATION RULES:
- Keep spoken answers SHORT (under 3 sentences for voice). Full detail goes in chat.
- If writing code: summarise verbally, show code in chat.
- If asked what you said before, you CAN reference this session's context.
- If you don't know something, say so plainly and suggest what to try next.
- Never make up capabilities you don't have.
- When the server is offline and asked to close an app: explain it requires the local server to be running.`;
  }

  return {
    init,
    addMessage,
    getContextMessages,
    getAllSessions,
    loadSession,
    deleteSession,
    startNewSession,
    getCurrentSession,
    clearAll,
    buildSystemPrompt,
  };
})();
