// ═══════════════════════════════════════════════════════
// ERYN — LOCAL DESKTOP SERVER v3.0
// Run: node server.js
// ═══════════════════════════════════════════════════════

const express    = require('express');
const cors       = require('cors');
const http       = require('http');
const WebSocket  = require('ws');
const path       = require('path');
const fs         = require('fs');
const { exec, execFile, spawn } = require('child_process');
const os         = require('os');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

const PORT     = 3000;
const PLATFORM = process.platform;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── Lazy-load optional deps ──
let clipboardy, si, screenshotDesktop, openModule;
async function loadDeps() {
  try { clipboardy        = await import('clipboardy'); }        catch {}
  try { si                = require('systeminformation'); }       catch {}
  try { screenshotDesktop = require('screenshot-desktop'); }     catch {}
  try { openModule        = await import('open'); }              catch {}
}
loadDeps();

// ═══════════════════════════════
// WEBSOCKET
// ═══════════════════════════════
const clients = new Set();
wss.on('connection', ws => {
  clients.add(ws);
  ws.on('close', () => clients.delete(ws));
});
function broadcast(type, data) {
  const msg = JSON.stringify({ type, data });
  clients.forEach(ws => { if (ws.readyState === WebSocket.OPEN) ws.send(msg); });
}

// ═══════════════════════════════
// HELPERS
// ═══════════════════════════════
function run(cmd, opts = {}) {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 15000, ...opts }, (err, stdout, stderr) => {
      if (err) reject(new Error(stderr || err.message));
      else resolve(stdout.trim());
    });
  });
}

// ── Smart query extraction: strip filler, extract meaningful search terms ──
function extractSearchQuery(raw) {
  let q = raw
    .replace(/^(search|search for|search the web for|search google for|google|look up|find|find me|what is|what are|who is|who are|show me|tell me about|i want to know about|can you find|search the internet for)\s+/i, '')
    .replace(/\b(please|for me|right now|quickly|asap|immediately)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return q;
}

// ── Smart URL resolver: handles anything ──
function resolveUrl(input) {
  const clean = input.trim().toLowerCase();

  // Already a full URL
  if (/^https?:\/\//.test(input)) return input;

  // Known site map — comprehensive
  const SITES = {
    // Search & General
    'google': 'https://www.google.com',
    'bing': 'https://www.bing.com',
    'duckduckgo': 'https://duckduckgo.com',
    'yahoo': 'https://www.yahoo.com',
    'ecosia': 'https://www.ecosia.org',
    // Social
    'youtube': 'https://www.youtube.com',
    'twitter': 'https://twitter.com',
    'x': 'https://x.com',
    'instagram': 'https://www.instagram.com',
    'facebook': 'https://www.facebook.com',
    'tiktok': 'https://www.tiktok.com',
    'reddit': 'https://www.reddit.com',
    'linkedin': 'https://www.linkedin.com',
    'pinterest': 'https://www.pinterest.com',
    'snapchat': 'https://web.snapchat.com',
    'twitch': 'https://www.twitch.tv',
    'tumblr': 'https://www.tumblr.com',
    // Communication
    'gmail': 'https://mail.google.com',
    'outlook': 'https://outlook.live.com',
    'discord': 'https://discord.com/app',
    'slack': 'https://slack.com',
    'whatsapp': 'https://web.whatsapp.com',
    'telegram': 'https://web.telegram.org',
    'teams': 'https://teams.microsoft.com',
    'zoom': 'https://zoom.us',
    'meet': 'https://meet.google.com',
    'google meet': 'https://meet.google.com',
    // Google Suite
    'drive': 'https://drive.google.com',
    'google drive': 'https://drive.google.com',
    'docs': 'https://docs.google.com',
    'google docs': 'https://docs.google.com/document',
    'sheets': 'https://docs.google.com/spreadsheets',
    'google sheets': 'https://docs.google.com/spreadsheets',
    'slides': 'https://docs.google.com/presentation',
    'calendar': 'https://calendar.google.com',
    'maps': 'https://www.google.com/maps',
    'google maps': 'https://www.google.com/maps',
    'photos': 'https://photos.google.com',
    'translate': 'https://translate.google.com',
    // Productivity
    'notion': 'https://www.notion.so',
    'trello': 'https://trello.com',
    'asana': 'https://app.asana.com',
    'jira': 'https://jira.atlassian.com',
    'confluence': 'https://www.atlassian.com/software/confluence',
    'monday': 'https://monday.com',
    'clickup': 'https://app.clickup.com',
    'airtable': 'https://airtable.com',
    'todoist': 'https://todoist.com',
    'linear': 'https://linear.app',
    // AI
    'chatgpt': 'https://chatgpt.com',
    'claude': 'https://claude.ai',
    'gemini': 'https://gemini.google.com',
    'perplexity': 'https://www.perplexity.ai',
    'copilot': 'https://copilot.microsoft.com',
    'midjourney': 'https://www.midjourney.com',
    'anthropic': 'https://www.anthropic.com',
    'openai': 'https://openai.com',
    'hugging face': 'https://huggingface.co',
    'huggingface': 'https://huggingface.co',
    // Dev
    'github': 'https://github.com',
    'gitlab': 'https://gitlab.com',
    'bitbucket': 'https://bitbucket.org',
    'stackoverflow': 'https://stackoverflow.com',
    'stack overflow': 'https://stackoverflow.com',
    'npm': 'https://www.npmjs.com',
    'pypi': 'https://pypi.org',
    'codepen': 'https://codepen.io',
    'replit': 'https://replit.com',
    'codesandbox': 'https://codesandbox.io',
    'vscode': 'https://vscode.dev',
    'vs code': 'https://vscode.dev',
    'vercel': 'https://vercel.com',
    'netlify': 'https://app.netlify.com',
    'heroku': 'https://dashboard.heroku.com',
    'railway': 'https://railway.app',
    'supabase': 'https://supabase.com',
    'firebase': 'https://console.firebase.google.com',
    'aws': 'https://aws.amazon.com/console',
    'azure': 'https://portal.azure.com',
    'gcp': 'https://console.cloud.google.com',
    'mdn': 'https://developer.mozilla.org',
    'devdocs': 'https://devdocs.io',
    'can i use': 'https://caniuse.com',
    'caniuse': 'https://caniuse.com',
    // Media
    'spotify': 'https://open.spotify.com',
    'netflix': 'https://www.netflix.com',
    'hulu': 'https://www.hulu.com',
    'disney plus': 'https://www.disneyplus.com',
    'disney+': 'https://www.disneyplus.com',
    'hbo max': 'https://www.max.com',
    'max': 'https://www.max.com',
    'prime video': 'https://www.amazon.com/prime-video',
    'amazon prime': 'https://www.amazon.com/prime-video',
    'apple music': 'https://music.apple.com',
    'soundcloud': 'https://soundcloud.com',
    'bandcamp': 'https://bandcamp.com',
    // Shopping
    'amazon': 'https://www.amazon.com',
    'ebay': 'https://www.ebay.com',
    'etsy': 'https://www.etsy.com',
    'aliexpress': 'https://www.aliexpress.com',
    'shopify': 'https://www.shopify.com',
    // News / Info
    'wikipedia': 'https://www.wikipedia.org',
    'bbc': 'https://www.bbc.com',
    'cnn': 'https://www.cnn.com',
    'nytimes': 'https://www.nytimes.com',
    'the guardian': 'https://www.theguardian.com',
    'techcrunch': 'https://techcrunch.com',
    'hacker news': 'https://news.ycombinator.com',
    'hackernews': 'https://news.ycombinator.com',
    'hn': 'https://news.ycombinator.com',
    // Design
    'figma': 'https://www.figma.com',
    'canva': 'https://www.canva.com',
    'behance': 'https://www.behance.net',
    'dribbble': 'https://dribbble.com',
    'unsplash': 'https://unsplash.com',
    'pexels': 'https://www.pexels.com',
    // Finance
    'paypal': 'https://www.paypal.com',
    'stripe': 'https://dashboard.stripe.com',
    'coinbase': 'https://www.coinbase.com',
    'robinhood': 'https://robinhood.com',
  };

  if (SITES[clean]) return SITES[clean];

  // Fuzzy match — find closest key
  const keys = Object.keys(SITES);
  for (const k of keys) {
    if (clean.includes(k) || k.includes(clean)) return SITES[k];
  }

  // If it looks like a domain (has a dot), prepend https://
  if (/^[a-z0-9-]+\.[a-z]{2,}/.test(clean)) {
    return `https://${input.trim()}`;
  }

  return null;
}

// ── Smart app resolver for Windows ──
async function resolveAppWindows(name) {
  const lo = name.toLowerCase().trim();

  // Hardcoded well-known apps
  const known = {
    'chrome': 'chrome', 'google chrome': 'chrome',
    'firefox': 'firefox',
    'edge': 'msedge', 'microsoft edge': 'msedge',
    'opera': 'opera',
    'brave': 'brave',
    'notepad': 'notepad',
    'notepad++': 'notepad++',
    'vscode': 'code', 'vs code': 'code', 'visual studio code': 'code',
    'visual studio': 'devenv',
    'terminal': 'wt', 'windows terminal': 'wt',
    'cmd': 'cmd', 'command prompt': 'cmd',
    'powershell': 'powershell',
    'explorer': 'explorer', 'file explorer': 'explorer',
    'calculator': 'calc',
    'paint': 'mspaint', 'ms paint': 'mspaint',
    'paint.net': 'paintdotnet',
    'spotify': 'spotify',
    'discord': 'discord',
    'slack': 'slack',
    'teams': 'teams', 'microsoft teams': 'teams',
    'zoom': 'zoom',
    'word': 'winword', 'microsoft word': 'winword',
    'excel': 'excel', 'microsoft excel': 'excel',
    'powerpoint': 'powerpnt', 'microsoft powerpoint': 'powerpnt',
    'outlook': 'outlook', 'microsoft outlook': 'outlook',
    'onenote': 'onenote', 'one note': 'onenote',
    'task manager': 'taskmgr',
    'registry': 'regedit',
    'snipping tool': 'snippingtool',
    'xbox': 'xboxapp',
    'steam': 'steam',
    'epic games': 'epicgameslauncher', 'epic': 'epicgameslauncher',
    'obs': 'obs64', 'obs studio': 'obs64',
    'vlc': 'vlc', 'vlc media player': 'vlc',
    'winrar': 'winrar',
    '7zip': '7zfm', '7-zip': '7zfm',
    'photoshop': 'photoshop',
    'illustrator': 'illustrator',
    'premiere': 'premiere pro',
    'after effects': 'afterfx',
    'figma': 'figma',
    'blender': 'blender',
    'unity': 'unity hub', 'unity hub': 'unityhub',
    'unreal': 'unrealengine', 'unreal engine': 'unrealengine',
    'gimp': 'gimp',
    'davinci resolve': 'resolve', 'resolve': 'resolve',
    'postman': 'postman',
    'insomnia': 'insomnia',
    'docker': 'docker desktop', 'docker desktop': 'docker desktop',
    'git': 'git-bash', 'git bash': 'git-bash',
    'github desktop': 'githubdesktop',
    'skype': 'skype',
    'telegram': 'telegram',
    'whatsapp': 'whatsapp',
    'notepad': 'notepad',
    'wordpad': 'wordpad',
    'paint 3d': 'paint3d',
    'sticky notes': 'stickynotes',
    'cortana': 'cortana',
    'settings': 'ms-settings:',
    'control panel': 'control',
    'device manager': 'devmgmt.msc',
    'disk management': 'diskmgmt.msc',
    'event viewer': 'eventvwr.msc',
    'performance monitor': 'perfmon',
    'resource monitor': 'resmon',
    'character map': 'charmap',
    'remote desktop': 'mstsc',
    'on-screen keyboard': 'osk',
    'magnifier': 'magnify',
    'narrator': 'narrator',
    'media player': 'wmplayer', 'windows media player': 'wmplayer',
    'groove music': 'mswindowsmusic', 'music': 'mswindowsmusic',
    'movies': 'microsoftxde', 'movies & tv': 'microsoftxde',
    'photos': 'ms-photos:', 'windows photos': 'ms-photos:',
    'mail': 'outlookforwindows', 'windows mail': 'outlookforwindows',
    'maps': 'windowsmaps', 'windows maps': 'windowsmaps',
    'weather': 'microsoft.bingweather:',
    'news': 'microsoft.bingnews:',
    'calendar': 'outlookcal:', 'windows calendar': 'outlookcal:',
    'minecraft': 'minecraft',
    'roblox': 'roblox',
    'fortnite': 'com.epicgames.fortnite',
    'cursor': 'cursor', 'cursor ai': 'cursor',
    'warp': 'warp',
  };

  if (known[lo]) {
    return `start ${known[lo]}`;
  }

  // Try to find installed apps by searching Program Files
  try {
    const searchDirs = [
      process.env['ProgramFiles'],
      process.env['ProgramFiles(x86)'],
      process.env['LOCALAPPDATA'],
      process.env['APPDATA'],
    ].filter(Boolean);

    for (const dir of searchDirs) {
      const result = await run(`dir /s /b "${dir}\\${lo}*.exe" 2>nul | head -1`).catch(() => '');
      if (result && result.trim()) {
        return `start "" "${result.trim()}"`;
      }
    }
  } catch {}

  // Try Windows shell start (works for many installed apps)
  return `start ${lo}`;
}

async function resolveAppMac(name) {
  const lo = name.toLowerCase().trim();
  const known = {
    'chrome': 'Google Chrome', 'google chrome': 'Google Chrome',
    'firefox': 'Firefox', 'safari': 'Safari',
    'edge': 'Microsoft Edge', 'microsoft edge': 'Microsoft Edge',
    'vscode': 'Visual Studio Code', 'vs code': 'Visual Studio Code', 'visual studio code': 'Visual Studio Code',
    'terminal': 'Terminal', 'iterm': 'iTerm', 'iterm2': 'iTerm',
    'finder': 'Finder',
    'calculator': 'Calculator',
    'spotify': 'Spotify', 'discord': 'Discord', 'slack': 'Slack',
    'teams': 'Microsoft Teams', 'zoom': 'zoom.us',
    'word': 'Microsoft Word', 'excel': 'Microsoft Excel',
    'powerpoint': 'Microsoft PowerPoint', 'outlook': 'Microsoft Outlook',
    'notes': 'Notes', 'music': 'Music', 'photos': 'Photos',
    'xcode': 'Xcode', 'figma': 'Figma', 'sketch': 'Sketch',
    'blender': 'Blender', 'gimp': 'GIMP',
    'vlc': 'VLC', 'vlc media player': 'VLC',
    'steam': 'Steam', 'obs': 'OBS', 'obs studio': 'OBS',
    'postman': 'Postman', 'insomnia': 'Insomnia',
    'docker': 'Docker', 'github desktop': 'GitHub Desktop',
    'telegram': 'Telegram', 'whatsapp': 'WhatsApp',
    'skype': 'Skype', 'facetime': 'FaceTime',
    'messages': 'Messages', 'mail': 'Mail',
    'calendar': 'Calendar', 'maps': 'Maps',
    'safari': 'Safari', 'preview': 'Preview',
    'activity monitor': 'Activity Monitor',
    'system preferences': 'System Preferences',
    'system settings': 'System Settings',
    'app store': 'App Store',
    'cursor': 'Cursor',
    'warp': 'Warp',
    'rectangle': 'Rectangle',
    'alfred': 'Alfred',
    'raycast': 'Raycast',
    '1password': '1Password',
    'bitwarden': 'Bitwarden',
    'notion': 'Notion',
    'obsidian': 'Obsidian',
    'bear': 'Bear',
    'things': 'Things 3',
    'fantastical': 'Fantastical',
    'spark': 'Spark',
    'airmail': 'Airmail 5',
    'screenflow': 'ScreenFlow',
    'cleanmymac': 'CleanMyMac X',
    'bartender': 'Bartender 4',
    'magnet': 'Magnet',
    'cyberduck': 'Cyberduck',
    'transmit': 'Transmit',
    'sequel pro': 'Sequel Pro',
    'tableplus': 'TablePlus',
    'proxyman': 'Proxyman',
    'charles': 'Charles',
    'paw': 'Paw',
    'simulator': 'Simulator',
    'instruments': 'Instruments',
    'dash': 'Dash',
  };
  if (known[lo]) return `open -a "${known[lo]}"`;
  // Try to find app
  try {
    const result = await run(`find /Applications -maxdepth 2 -iname "*${lo}*.app" | head -1`).catch(() => '');
    if (result && result.trim()) return `open "${result.trim()}"`;
  } catch {}
  return `open -a "${name}"`;
}

async function getAppCmd(name) {
  if (PLATFORM === 'win32') return resolveAppWindows(name);
  if (PLATFORM === 'darwin') return resolveAppMac(name);
  return `xdg-open "${name}"`;
}

// ── Discover actually installed apps ──
async function getInstalledApps() {
  const apps = [];
  try {
    if (PLATFORM === 'win32') {
      // Read from registry / program files
      const raw = await run(`reg query HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App\\ Paths /s /v "" 2>nul`).catch(() => '');
      const lines = raw.split('\n').filter(l => l.includes('.exe'));
      const exeNames = [...new Set(lines.map(l => {
        const m = l.match(/([^\\]+\.exe)/i);
        return m ? m[1].replace(/\.exe$/i, '') : null;
      }).filter(Boolean))];
      apps.push(...exeNames.slice(0, 60));

      // Also check Start Menu
      const sm = await run(`dir "%ProgramData%\\Microsoft\\Windows\\Start Menu\\Programs" /s /b /a:-d 2>nul | findstr /i ".lnk"`).catch(() => '');
      const lnkNames = sm.split('\n').map(l => {
        const m = path.basename(l.trim()).replace(/\.lnk$/i, '');
        return m;
      }).filter(n => n && n.length > 1 && n.length < 40);
      apps.push(...lnkNames.slice(0, 60));

    } else if (PLATFORM === 'darwin') {
      const raw = await run('ls /Applications').catch(() => '');
      apps.push(...raw.split('\n').map(n => n.replace(/\.app$/, '')).filter(Boolean));
      const raw2 = await run('ls ~/Applications 2>/dev/null').catch(() => '');
      apps.push(...raw2.split('\n').map(n => n.replace(/\.app$/, '')).filter(Boolean));
    } else {
      // Linux — list from /usr/share/applications
      const raw = await run('ls /usr/share/applications').catch(() => '');
      apps.push(...raw.split('\n').map(n => n.replace(/\.desktop$/, '')).filter(Boolean));
    }
  } catch {}
  return [...new Set(apps)].sort();
}

// ══════════════════════════════════
// ROUTES
// ══════════════════════════════════

app.get('/api/status', async (req, res) => {
  let cpuLoad = null, memUsed = null, memTotal = null;
  try {
    if (si) {
      const [cpu, mem] = await Promise.all([si.currentLoad(), si.mem()]);
      cpuLoad  = Math.round(cpu.currentLoad);
      memUsed  = Math.round(mem.used  / 1e9 * 10) / 10;
      memTotal = Math.round(mem.total / 1e9 * 10) / 10;
    }
  } catch {}
  res.json({ ok:true, platform:PLATFORM, hostname:os.hostname(), uptime:Math.round(os.uptime()), cpuLoad, memUsed, memTotal, node:process.version });
});

// ── Open app (smart) ──
app.post('/api/app/open', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });

  try {
    const cmd = await getAppCmd(name);
    await run(cmd);
    broadcast('app_opened', { name });
    res.json({ ok: true, cmd, name });
  } catch (e) {
    // Last resort: try open module
    try {
      if (openModule) { await openModule.default(name); return res.json({ ok:true, name, method:'open' }); }
    } catch {}
    res.status(404).json({ error: `Could not open "${name}". Make sure it's installed.`, hint: 'Try the exact app name as it appears on your computer.' });
  }
});

// ── Get installed apps ──
app.get('/api/apps/installed', async (req, res) => {
  try {
    const apps = await getInstalledApps();
    res.json({ ok: true, apps });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── App actions (type into app, click, etc.) ──
app.post('/api/app/action', async (req, res) => {
  const { app: appName, action, value } = req.body;
  if (!action) return res.status(400).json({ error: 'action required' });

  try {
    let result = '';

    if (PLATFORM === 'darwin') {
      // AppleScript for Mac app control
      let script = '';
      if (action === 'type') {
        script = `tell application "System Events" to keystroke "${value.replace(/"/g, '\\"')}"`;
      } else if (action === 'click') {
        script = `tell application "System Events" to click button "${value}" of window 1 of process "${appName}"`;
      } else if (action === 'focus') {
        script = `tell application "${appName}" to activate`;
      } else if (action === 'spotify_play') {
        script = `tell application "Spotify" to play`;
      } else if (action === 'spotify_pause') {
        script = `tell application "Spotify" to pause`;
      } else if (action === 'spotify_next') {
        script = `tell application "Spotify" to next track`;
      } else if (action === 'spotify_prev') {
        script = `tell application "Spotify" to previous track`;
      } else if (action === 'spotify_volume') {
        script = `tell application "Spotify" to set sound volume to ${value}`;
      } else if (action === 'finder_open') {
        script = `tell application "Finder" to open POSIX file "${value}"`;
      } else if (action === 'safari_open') {
        script = `tell application "Safari" to open location "${value}"`;
      } else if (action === 'chrome_open') {
        script = `tell application "Google Chrome" to open location "${value}"`;
      }

      if (script) result = await run(`osascript -e '${script}'`);

    } else if (PLATFORM === 'win32') {
      // PowerShell / nircmd for Windows
      if (action === 'type') {
        // Use nircmd or xdotool equivalent
        const escaped = value.replace(/'/g, "''");
        result = await run(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${escaped}')"`);
      } else if (action === 'focus') {
        result = await run(`powershell -command "(New-Object -ComObject Shell.Application).Windows() | Where-Object {$_.Name -like '*${appName}*'} | ForEach-Object {$_.Activate()}"`);
      } else if (action === 'spotify_play') {
        result = await run(`powershell -command "& { Add-Type -AssemblyName System.Runtime.WindowsRuntime; [Windows.System.Launcher]::LaunchUriAsync([Uri]'spotify:') | Out-Null }"`);
      } else if (action === 'minimize_all') {
        result = await run(`powershell -command "(New-Object -ComObject Shell.Application).MinimizeAll()"`);
      } else if (action === 'show_desktop') {
        result = await run(`powershell -command "(New-Object -ComObject Shell.Application).ToggleDesktop()"`);
      } else if (action === 'screenshot') {
        result = await run(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('%{PRTSC}')"`);
      }
    }

    broadcast('app_action', { app: appName, action, result });
    res.json({ ok: true, app: appName, action, result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Close app ──
app.post('/api/app/close', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  try {
    let cmd;
    if (PLATFORM === 'win32') {
      const exe = name.toLowerCase().replace(/\s+/g, '') + '.exe';
      cmd = `taskkill /IM ${exe} /F`;
    } else {
      cmd = `pkill -i "${name}" || killall -i "${name}"`;
    }
    await run(cmd);
    broadcast('app_closed', { name });
    res.json({ ok: true, name });
  } catch (e) {
    res.status(500).json({ error: e.message, hint: 'App may not be running' });
  }
});

// ── Running processes ──
app.get('/api/processes', async (req, res) => {
  try {
    let list = [];
    if (si) {
      const procs = await si.processes();
      list = procs.list
        .filter(p => p.name && p.cpu > 0.05)
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 25)
        .map(p => ({ name: p.name, pid: p.pid, cpu: Math.round(p.cpu * 10) / 10, mem: Math.round(p.mem * 10) / 10 }));
    } else {
      const raw = PLATFORM === 'win32' ? await run('tasklist /fo csv /nh') : await run('ps aux --sort=-%cpu | head -25');
      list = [{ name: raw.slice(0, 300), pid: 0, cpu: 0, mem: 0 }];
    }
    res.json({ ok: true, processes: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Smart search — extract query from natural language ──
app.post('/api/search', (req, res) => {
  const { query, engine = 'google' } = req.body;
  if (!query) return res.status(400).json({ error: 'query required' });
  const q = extractSearchQuery(query);
  const urls = {
    google: `https://www.google.com/search?q=${encodeURIComponent(q)}`,
    youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    github: `https://github.com/search?q=${encodeURIComponent(q)}`,
    reddit: `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
    wikipedia: `https://en.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`,
    amazon: `https://www.amazon.com/s?k=${encodeURIComponent(q)}`,
    bing: `https://www.bing.com/search?q=${encodeURIComponent(q)}`,
  };
  res.json({ ok: true, query: q, url: urls[engine] || urls.google, urls });
});

// ── Open URL in browser ──
app.post('/api/browser/open', async (req, res) => {
  let { url } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  // Resolve smart URLs
  const resolved = resolveUrl(url);
  const finalUrl = resolved || (url.includes('.') ? `https://${url}` : `https://www.google.com/search?q=${encodeURIComponent(url)}`);

  try {
    if (openModule) {
      await openModule.default(finalUrl);
    } else {
      const cmd = PLATFORM === 'win32' ? `start "" "${finalUrl}"` : PLATFORM === 'darwin' ? `open "${finalUrl}"` : `xdg-open "${finalUrl}"`;
      await run(cmd);
    }
    res.json({ ok: true, url: finalUrl });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Shell ──
app.post('/api/shell', async (req, res) => {
  const { cmd, cwd } = req.body;
  if (!cmd) return res.status(400).json({ error: 'cmd required' });
  const blocked = ['rm -rf /', 'format c:', 'del /f /s /q c:\\', 'mkfs', ':(){ :|:& };:'];
  if (blocked.some(b => cmd.toLowerCase().includes(b))) return res.status(403).json({ error: 'Blocked.' });
  try {
    const output = await run(cwd ? `cd "${cwd}" && ${cmd}` : cmd);
    broadcast('shell_output', { cmd, output });
    res.json({ ok: true, output });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── File ops ──
app.post('/api/file/read', (req, res) => {
  const { filePath } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    const resolved = path.resolve(filePath.replace('~', os.homedir()));
    const content  = fs.readFileSync(resolved, 'utf8');
    res.json({ ok:true, content, path:resolved, lines:content.split('\n').length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/file/write', (req, res) => {
  const { filePath, content } = req.body;
  if (!filePath) return res.status(400).json({ error: 'filePath required' });
  try {
    const resolved = path.resolve(filePath.replace('~', os.homedir()));
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, content || '', 'utf8');
    broadcast('file_written', { path: resolved });
    res.json({ ok:true, path:resolved });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/file/list', (req, res) => {
  const { dirPath } = req.body;
  const resolved = path.resolve((dirPath || os.homedir()).replace('~', os.homedir()));
  try {
    const entries = fs.readdirSync(resolved, { withFileTypes:true }).map(e => ({
      name: e.name, type: e.isDirectory() ? 'dir' : 'file', path: path.join(resolved, e.name)
    }));
    res.json({ ok:true, entries, cwd:resolved });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Clipboard ──
app.get('/api/clipboard/read', async (req, res) => {
  try {
    if (!clipboardy) return res.status(503).json({ error: 'clipboardy not loaded' });
    const text = await clipboardy.default.read();
    res.json({ ok:true, text });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/clipboard/write', async (req, res) => {
  const { text } = req.body;
  try {
    if (!clipboardy) return res.status(503).json({ error: 'clipboardy not loaded' });
    await clipboardy.default.write(text || '');
    res.json({ ok:true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Screenshot ──
app.get('/api/screenshot', async (req, res) => {
  try {
    if (!screenshotDesktop) return res.status(503).json({ error: 'screenshot-desktop not loaded' });
    const img = await screenshotDesktop({ format:'png' });
    const b64 = img.toString('base64');
    res.json({ ok:true, image:`data:image/png;base64,${b64}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── System info ──
app.get('/api/system', async (req, res) => {
  try {
    const info = {
      platform:PLATFORM, arch:os.arch(), hostname:os.hostname(),
      user:os.userInfo().username, home:os.homedir(), uptime:Math.round(os.uptime()),
      memory:{ total:Math.round(os.totalmem()/1e9*10)/10, free:Math.round(os.freemem()/1e9*10)/10 },
      cpus:os.cpus().length, cpuModel:os.cpus()[0]?.model||'Unknown', node:process.version,
    };
    if (si) {
      const [cpu, disk] = await Promise.all([si.currentLoad(), si.fsSize()]);
      info.cpuLoad = Math.round(cpu.currentLoad);
      info.disks   = disk.map(d => ({ fs:d.fs, size:Math.round(d.size/1e9), used:Math.round(d.used/1e9) }));
    }
    res.json({ ok:true, ...info });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Volume ──
app.post('/api/volume', async (req, res) => {
  const { level, action } = req.body;
  try {
    let cmd;
    if (PLATFORM === 'darwin') {
      if (action === 'mute')        cmd = 'osascript -e "set volume output muted true"';
      else if (action === 'unmute') cmd = 'osascript -e "set volume output muted false"';
      else if (action === 'up')     cmd = 'osascript -e "set volume output volume ((output volume of (get volume settings)) + 10)"';
      else if (action === 'down')   cmd = 'osascript -e "set volume output volume ((output volume of (get volume settings)) - 10)"';
      else if (level !== undefined) cmd = `osascript -e "set volume output volume ${Math.max(0, Math.min(100, level))}"`;
    } else if (PLATFORM === 'win32') {
      if (action === 'mute')        cmd = 'nircmd mutesysvolume 1';
      else if (action === 'up')     cmd = 'nircmd changesysvolume 6554';
      else if (action === 'down')   cmd = 'nircmd changesysvolume -6554';
    }
    if (cmd) await run(cmd);
    res.json({ ok:true, action: action || `set ${level}` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

server.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════╗`);
  console.log(`║   ERYN DESKTOP SERVER v3.0     ║`);
  console.log(`╠════════════════════════════════╣`);
  console.log(`║  http://localhost:${PORT}          ║`);
  console.log(`║  Platform: ${PLATFORM.padEnd(20)}║`);
  console.log(`╚════════════════════════════════╝\n`);
});
