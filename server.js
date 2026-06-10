// ═══════════════════════════════════════════════════════
// ERYN — LOCAL DESKTOP SERVER v2.0
// Run: node server.js
// ═══════════════════════════════════════════════════════

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const WebSocket  = require('ws');
const path       = require('path');
const fs         = require('fs');
const { exec, spawn } = require('child_process');
const os         = require('os');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

const PORT     = 3000;
const PLATFORM = process.platform; // 'win32' | 'darwin' | 'linux'

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Lazy-load optional deps ──
let clipboardy, si, screenshotDesktop, openModule;
async function loadDeps() {
  try { clipboardy      = await import('clipboardy'); }      catch {}
  try { si              = require('systeminformation'); }     catch {}
  try { screenshotDesktop = require('screenshot-desktop'); } catch {}
  try { openModule      = await import('open'); }            catch {}
}
loadDeps();

// ════════════════════════════════════════
// WEBSOCKET — real-time push to frontend
// ════════════════════════════════════════
const clients = new Set();
wss.on('connection', ws => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

// ════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════
function run(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

// App name → launch command map
const APP_COMMANDS = {
  win32: {
    'chrome':       'start chrome',
    'firefox':      'start firefox',
    'edge':         'start msedge',
    'notepad':      'start notepad',
    'vscode':       'code .',
    'vs code':      'code .',
    'terminal':     'start cmd',
    'cmd':          'start cmd',
    'powershell':   'start powershell',
    'explorer':     'start explorer',
    'calculator':   'start calc',
    'paint':        'start mspaint',
    'spotify':      'start spotify',
    'discord':      'start discord',
    'slack':        'start slack',
    'teams':        'start teams',
    'word':         'start winword',
    'excel':        'start excel',
    'powerpoint':   'start powerpnt',
    'outlook':      'start outlook',
    'task manager': 'start taskmgr',
  },
  darwin: {
    'chrome':       'open -a "Google Chrome"',
    'firefox':      'open -a Firefox',
    'safari':       'open -a Safari',
    'edge':         'open -a "Microsoft Edge"',
    'vscode':       'open -a "Visual Studio Code"',
    'vs code':      'open -a "Visual Studio Code"',
    'terminal':     'open -a Terminal',
    'iterm':        'open -a iTerm',
    'finder':       'open -a Finder',
    'calculator':   'open -a Calculator',
    'spotify':      'open -a Spotify',
    'discord':      'open -a Discord',
    'slack':        'open -a Slack',
    'teams':        'open -a "Microsoft Teams"',
    'word':         'open -a "Microsoft Word"',
    'excel':        'open -a "Microsoft Excel"',
    'powerpoint':   'open -a "Microsoft PowerPoint"',
    'outlook':      'open -a "Microsoft Outlook"',
    'notes':        'open -a Notes',
    'music':        'open -a Music',
    'xcode':        'open -a Xcode',
    'figma':        'open -a Figma',
  }
};

function getAppCmd(appName) {
  const map = APP_COMMANDS[PLATFORM] || APP_COMMANDS['darwin'];
  const key = appName.toLowerCase().trim();
  return map[key] || null;
}

// ════════════════════════════════════════
// ROUTES
// ════════════════════════════════════════

// ── Status / ping ──
app.get('/api/status', async (req, res) => {
  let cpuLoad = null, memUsed = null, memTotal = null;
  try {
    if (si) {
      const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
      cpuLoad  = Math.round(cpu.currentLoad);
      memUsed  = Math.round(mem.used  / 1024 / 1024 / 1024 * 10) / 10;
      memTotal = Math.round(mem.total / 1024 / 1024 / 1024 * 10) / 10;
    }
  } catch {}
  res.json({
    ok: true,
    platform: PLATFORM,
    hostname: os.hostname(),
    uptime: Math.round(os.uptime()),
    cpuLoad,
    memUsed,
    memTotal,
    node: process.version,
    cwd: process.cwd()
  });
});

// ── Open app ──
app.post('/api/app/open', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  const cmd = getAppCmd(name);
  if (!cmd) {
    // Try generic open
    try {
      if (PLATFORM === 'win32') await run(`start ${name}`);
      else await run(`open -a "${name}"`);
      return res.json({ ok: true, method: 'generic', name });
    } catch (e) {
      return res.status(404).json({ error: `App not found: ${name}`, hint: 'Try the exact app name' });
    }
  }

  try {
    await run(cmd);
    broadcast('app_opened', { name });
    res.json({ ok: true, cmd, name });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Close / kill app ──
app.post('/api/app/close', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    let cmd;
    if (PLATFORM === 'win32') {
      // Try exe name variants
      const exe = name.toLowerCase().replace(/\s+/g, '') + '.exe';
      cmd = `taskkill /IM ${exe} /F`;
    } else {
      cmd = `pkill -i "${name}" || killall -i "${name}"`;
    }
    await run(cmd);
    broadcast('app_closed', { name });
    res.json({ ok: true, name });
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'App may already be closed or name mismatch' });
  }
});

// ── List running processes ──
app.get('/api/processes', async (req, res) => {
  try {
    let list = [];
    if (si) {
      const procs = await si.processes();
      list = procs.list
        .filter(p => p.name && p.cpu > 0.1)
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 20)
        .map(p => ({ name: p.name, pid: p.pid, cpu: Math.round(p.cpu * 10) / 10, mem: Math.round(p.mem * 10) / 10 }));
    } else {
      const raw = PLATFORM === 'win32'
        ? await run('tasklist /fo csv /nh')
        : await run('ps aux | head -20');
      list = [{ name: raw.slice(0, 200), pid: 0, cpu: 0, mem: 0 }];
    }
    res.json({ ok: true, processes: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Run shell command ──
app.post('/api/shell', async (req, res) => {
  const { cmd, cwd } = req.body;
  if (!cmd) return res.status(400).json({ error: 'cmd required' });

  // Safety: block truly destructive commands
  const blocked = ['rm -rf /', 'format c:', 'del /f /s /q c:\\', 'mkfs', ':(){ :|:& };:'];
  if (blocked.some(b => cmd.toLowerCase().includes(b))) {
    return res.status(403).json({ error: 'Command blocked for safety.' });
  }

  try {
    const output = await run(cwd ? `cd "${cwd}" && ${cmd}` : cmd);
    broadcast('shell_output', { cmd, output });
    res.json({ ok: true, output });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── File read ──
app.post('/api/file/read', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    const resolved = path.resolve(filePath.replace('~', os.homedir()));
    const content  = fs.readFileSync(resolved, 'utf8');
    res.json({ ok: true, content, path: resolved, lines: content.split('\n').length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── File write ──
app.post('/api/file/write', (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    const resolved = path.resolve(filePath.replace('~', os.homedir()));
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content || '', 'utf8');
    broadcast('file_written', { path: resolved });
    res.json({ ok: true, path: resolved });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── File list ──
app.post('/api/file/list', (req, res) => {
  const { dirPath } = req.body;
  const resolved = path.resolve((dirPath || os.homedir()).replace('~', os.homedir()));
  try {
    const entries = fs.readdirSync(resolved, { withFileTypes: true }).map(e => ({
      name: e.name,
      type: e.isDirectory() ? 'dir' : 'file',
      path: path.join(resolved, e.name)
    }));
    res.json({ ok: true, entries, cwd: resolved });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Clipboard read ──
app.get('/api/clipboard/read', async (req, res) => {
  try {
    if (!clipboardy) return res.status(503).json({ error: 'clipboardy not loaded' });
    const text = await clipboardy.default.read();
    res.json({ ok: true, text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Clipboard write ──
app.post('/api/clipboard/write', async (req, res) => {
  const { text } = req.body;
  try {
    if (!clipboardy) return res.status(503).json({ error: 'clipboardy not loaded' });
    await clipboardy.default.write(text || '');
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Screenshot ──
app.get('/api/screenshot', async (req, res) => {
  try {
    if (!screenshotDesktop) return res.status(503).json({ error: 'screenshot-desktop not loaded' });
    const img = await screenshotDesktop({ format: 'png' });
    const b64 = img.toString('base64');
    res.json({ ok: true, image: `data:image/png;base64,${b64}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── System info ──
app.get('/api/system', async (req, res) => {
  try {
    const info = {
      platform: PLATFORM,
      arch:     os.arch(),
      hostname: os.hostname(),
      user:     os.userInfo().username,
      home:     os.homedir(),
      uptime:   Math.round(os.uptime()),
      memory: {
        total: Math.round(os.totalmem() / 1024 / 1024 / 1024 * 10) / 10,
        free:  Math.round(os.freemem()  / 1024 / 1024 / 1024 * 10) / 10,
      },
      cpus: os.cpus().length,
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      node: process.version,
    };
    if (si) {
      const [cpu, disk] = await Promise.all([si.currentLoad(), si.fsSize()]);
      info.cpuLoad = Math.round(cpu.currentLoad);
      info.disks   = disk.map(d => ({ fs: d.fs, size: Math.round(d.size/1e9), used: Math.round(d.used/1e9) }));
    }
    res.json({ ok: true, ...info });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Open URL in default browser ──
app.post('/api/browser/open', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    if (openModule) {
      await openModule.default(url);
    } else {
      const cmd = PLATFORM === 'win32' ? `start ${url}` : PLATFORM === 'darwin' ? `open "${url}"` : `xdg-open "${url}"`;
      await run(cmd);
    }
    res.json({ ok: true, url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Volume control ──
app.post('/api/volume', async (req, res) => {
  const { level, action } = req.body; // level 0-100, action: up/down/mute
  try {
    let cmd;
    if (PLATFORM === 'darwin') {
      if (action === 'mute')        cmd = 'osascript -e "set volume output muted true"';
      else if (action === 'unmute') cmd = 'osascript -e "set volume output muted false"';
      else if (action === 'up')     cmd = 'osascript -e "set volume output volume ((output volume of (get volume settings)) + 10)"';
      else if (action === 'down')   cmd = 'osascript -e "set volume output volume ((output volume of (get volume settings)) - 10)"';
      else if (level !== undefined) cmd = `osascript -e "set volume output volume ${Math.max(0, Math.min(100, level))}"`;
    } else if (PLATFORM === 'win32') {
      // Uses nircmd if available, otherwise skip
      if (action === 'mute')   cmd = 'nircmd mutesysvolume 1';
      else if (action === 'up') cmd = 'nircmd changesysvolume 6554';
      else if (action === 'down') cmd = 'nircmd changesysvolume -6554';
    }
    if (cmd) await run(cmd);
    res.json({ ok: true, action: action || `set ${level}` });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Serve index.html for root ──
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ════════════════════════════════════════
// START
// ════════════════════════════════════════
server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════╗`);
  console.log(`║   ERYN DESKTOP SERVER v2.0     ║`);
  console.log(`╠════════════════════════════════╣`);
  console.log(`║  http://localhost:${PORT}          ║`);
  console.log(`║  Platform: ${PLATFORM.padEnd(20)}║`);
  console.log(`║  Node: ${process.version.padEnd(23)}║`);
  console.log(`╚════════════════════════════════╝`);
  console.log(`\n  Open http://localhost:${PORT} in Chrome or Edge\n`);
});
