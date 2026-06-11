# ERYN — Desktop AI Assistant v3.0

Eryn is a voice-first desktop AI assistant with a Jarvis-style particle orb, smart search, intelligent app launching, and full OS control.

---

## What's New in v3.0

- **Jarvis-style particle orb** — 4,500 particles + 6 rotating arc rings, much more visible and dramatic across all states (idle, listening, thinking, speaking)
- **Smart search** — Say *"search for the new World Cup"* and Eryn extracts the meaningful query, not the filler words. Supports Google, YouTube, Reddit, Wikipedia auto-routing
- **Smart site opening** — Say *"open chatgpt"* / *"open YouTube"* / *"open figma"* and it opens in your actual browser — not a list, not a tab preview. 100+ sites supported
- **Better app launching** — Eryn scans your actual installed apps on Windows (Start Menu + Program Files) and Mac (/Applications). Say *"open Cursor"*, *"open Warp"*, *"open OBS"* — anything installed works
- **App actions** — Control Spotify (play/pause/next/previous), minimize all windows, show desktop, and more
- **Smarter open routing** — Eryn intelligently decides: is this a website or a desktop app? Opens the right one automatically

---

## Quick Start

### Requirements
- [Node.js](https://nodejs.org) v18+
- Chrome or Edge (for voice recognition)

### Install & Run

**Windows:**
```
Double-click start-eryn.bat
```

**Mac / Linux:**
```bash
chmod +x start-eryn.sh
./start-eryn.sh
```

**Manual:**
```bash
npm install
node server.js
```

Then open **http://localhost:3000** in Chrome or Edge.

---

## API Keys (Required for AI responses)

Eryn needs at least one AI API key to answer questions:

1. Open Eryn → click the **⚙ Settings** tab (right panel)
2. Paste your **Groq API key** (free at [console.groq.com](https://console.groq.com)) — recommended, very fast
3. Or paste a **Gemini API key** (free at [aistudio.google.com](https://aistudio.google.com))
4. Click **Save Keys**

---

## Voice Commands

### Search
| Say | Does |
|-----|------|
| `search for the new World Cup` | Googles "World Cup" (strips filler) |
| `search for how to make pasta` | Googles "how to make pasta" |
| `look up GPT-5` | Googles "GPT-5" |
| `search YouTube for lofi beats` | YouTube search |
| `find videos about space` | YouTube search |

### Open Sites
| Say | Does |
|-----|------|
| `open YouTube` | Opens youtube.com in your browser |
| `open ChatGPT` | Opens chatgpt.com in your browser |
| `open GitHub` | Opens github.com in your browser |
| `go to Figma` | Opens figma.com |
| `open netflix` | Opens netflix.com |
| Any of 100+ sites... | Opens the real URL in your default browser |

### Open Apps
| Say | Does |
|-----|------|
| `open VS Code` | Launches VS Code |
| `open Spotify` | Launches Spotify |
| `open Discord` | Launches Discord |
| `open Terminal` | Launches Terminal / CMD |
| `open Blender` | Launches Blender |
| `launch Cursor` | Launches Cursor AI editor |
| `open [any app name]` | Searches your installed apps and opens it |

### App Actions
| Say | Does |
|-----|------|
| `Spotify play` | Plays current track |
| `Spotify pause` | Pauses |
| `Spotify next` | Next track |
| `Spotify previous` | Previous track |
| `show desktop` | Minimizes all windows |
| `minimize all` | Minimizes all windows |

### System
| Say | Does |
|-----|------|
| `volume up / down / mute` | Controls system volume |
| `run [shell command]` | Runs any terminal command |
| `read clipboard` | Reads clipboard contents |
| `take a screenshot` | Captures the screen |
| `system info` | Shows CPU, RAM, disk |

### Other
| Say | Does |
|-----|------|
| `make a diagram of [topic]` | Generates SVG diagram |
| `show map of [place]` | Embedded Google Maps |
| `close [app]` | Kills a running app |
| `hands-free on/off` | Toggles always-listening mode |

---

## Architecture

```
eryn/
├── server.js          ← Node.js backend (Express + WebSocket)
├── package.json
├── start-eryn.bat     ← Windows launcher
├── start-eryn.sh      ← Mac/Linux launcher
└── public/
    ├── index.html     ← Main UI + all frontend logic
    ├── orb.js         ← Three.js particle orb (Jarvis-style, v3)
    ├── brain.js       ← Conversation history + session memory
    └── diagrams.js    ← SVG diagram generator
```

### How Smart Open Works

1. You say *"open YouTube"*
2. Eryn checks if it's a known website (100+ in the map) → yes → calls `/api/browser/open` on the server → your OS opens `youtube.com` in your default browser
3. If not a known site, checks if it's a bare domain (e.g. `myapp.io`) → opens that
4. If it looks like a desktop app name → calls `/api/app/open` → server resolves the launch command for your OS → app launches

### How Smart Search Works

1. You say *"search for the new World Cup results"*
2. Eryn strips: `search for the` → leaves: `new World Cup results`
3. Detects engine: mentions "YouTube"? → YouTube URL. Mentions "Reddit"? → Reddit URL. Default → Google
4. Opens the actual search URL in your browser

---

## Deploy to GitHub Pages (UI only)

The UI works in browser-only mode (no app launching, no shell). Push the `public/` folder to a GitHub Pages repo.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| No voice recognition | Use Chrome or Edge. Check microphone permissions |
| Server offline | Run `node server.js` in the eryn folder |
| App won't open | Make sure the app is installed. Try the exact name it shows in your Start Menu / Applications folder |
| No AI responses | Add a Groq or Gemini API key in Settings |
| Pop-up blocked | Allow pop-ups for localhost:3000 in your browser |

