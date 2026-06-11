[README.md](https://github.com/user-attachments/files/28857570/README.md)
# ERYN — Desktop AI Assistant v3.0

Eryn is a voice-first desktop AI assistant with a Jarvis-style particle orb, smart search, intelligent app launching, and full OS control.

---

## ⚠️ IMPORTANT — Folder Setup

**The folder MUST be named `eryn` and placed directly on your Desktop.**

```
Windows:   C:\Users\YourName\Desktop\eryn\
Mac:       /Users/YourName/Desktop/eryn/
```

If the folder is named anything else or placed anywhere else, the launcher scripts will not work.

---

## Quick Start

### Step 1 — Make sure the folder is set up correctly

Your Desktop should look like this:

```
Desktop/
└── eryn/
    ├── server.js
    ├── package.json
    ├── start-eryn.bat     ← Windows
    ├── start-eryn.sh      ← Mac / Linux
    └── public/
        ├── index.html
        ├── orb.js
        ├── brain.js
        └── diagrams.js
```

### Step 2 — Install Node.js (if you haven't already)

Download and install Node.js v18 or newer from: https://nodejs.org

### Step 3 — Launch Eryn

**Windows:**
Double-click `start-eryn.bat` inside the `eryn` folder on your Desktop.

**Mac:**
Open Terminal (press `Cmd + Space`, type Terminal, hit Enter), then run these two commands:

```bash
chmod +x ~/Desktop/eryn/start-eryn.sh
~/Desktop/eryn/start-eryn.sh
```

The first command only needs to be run once. After that you can just run the second line each time.

**Or manually from any terminal (Windows, Mac, or Linux):**
```bash
cd ~/Desktop/eryn
npm install
node server.js
```

### Step 4 — Open in your browser

Once the server is running, open **http://localhost:3000** in Chrome or Edge.

> Voice recognition requires Chrome or Edge. It will not work in Firefox or Safari.

---

## API Keys (Required for AI responses)

Eryn needs at least one AI API key to answer questions. Without a key it can still open apps, search, and run commands — but won't give AI responses.

1. Open Eryn at http://localhost:3000
2. Click the **Settings** tab in the right panel
3. Paste your **Groq API key** — free at https://console.groq.com (recommended, very fast)
4. Or paste a **Gemini API key** — free at https://aistudio.google.com
5. Click **Save Keys**

---

## Voice Commands

### Search
| Say | What Eryn does |
|-----|----------------|
| `search for the new World Cup` | Googles "new World Cup" — strips the filler |
| `search for how to make pasta` | Googles "how to make pasta" |
| `look up GPT-5` | Googles "GPT-5" |
| `search YouTube for lofi beats` | YouTube search |
| `find videos about space` | YouTube search |
| `search Reddit for best headphones` | Reddit search |

### Open Websites
| Say | What Eryn does |
|-----|----------------|
| `open YouTube` | Opens youtube.com in your browser |
| `open ChatGPT` | Opens chatgpt.com in your browser |
| `open GitHub` | Opens github.com in your browser |
| `go to Figma` | Opens figma.com |
| `open Netflix` | Opens netflix.com |
| `open Discord` | Opens discord.com |

100+ sites are supported including Google Suite, AI tools, dev tools, streaming services, social media, shopping, news, and design tools.

### Open Desktop Apps
| Say | What Eryn does |
|-----|----------------|
| `open VS Code` | Launches VS Code |
| `open Spotify` | Launches Spotify |
| `open Terminal` | Launches Terminal or CMD |
| `open Blender` | Launches Blender |
| `launch Cursor` | Launches Cursor AI editor |
| `open [any app name]` | Finds it in your installed apps and opens it |

### App Actions
| Say | What Eryn does |
|-----|----------------|
| `Spotify play` | Plays current track |
| `Spotify pause` | Pauses |
| `Spotify next` | Next track |
| `Spotify previous` | Previous track |
| `show desktop` | Minimizes all windows |

### System Control
| Say | What Eryn does |
|-----|----------------|
| `volume up` / `volume down` | Adjusts system volume |
| `mute volume` | Mutes audio |
| `run [any terminal command]` | Executes a shell command |
| `read clipboard` | Reads what's on your clipboard |
| `take a screenshot` | Captures your screen |
| `system info` | Shows CPU, RAM, and disk usage |

### Other
| Say | What Eryn does |
|-----|----------------|
| `make a diagram of [topic]` | Generates a visual SVG diagram |
| `show map of [place]` | Shows an embedded Google Maps view |
| `close [app name]` | Kills a running application |
| `hands-free on` / `hands-free off` | Toggles always-listening mode |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `start-eryn.bat` or `start-eryn.sh` does nothing | Make sure the folder is named `eryn` and is on your Desktop |
| "Node is not recognized" | Install Node.js from https://nodejs.org then try again |
| Server shows offline in Eryn | Run `node server.js` manually from inside the eryn folder |
| No voice recognition | Use Chrome or Edge. Allow microphone access when prompted |
| App won't open | Make sure the app is installed. Use the exact name shown in your Start Menu or Applications folder |
| No AI responses | Add a Groq or Gemini API key in the Settings tab |
| Pop-up blocked | Allow pop-ups for localhost:3000 in your browser settings |
| Page won't load | Make sure the server is running and go to http://localhost:3000 |

---

## File Structure

```
eryn/                        ← Must be named exactly "eryn"
├── server.js                ← Backend server (Node.js)
├── package.json             ← Dependencies
├── start-eryn.bat           ← Windows one-click launcher
├── start-eryn.sh            ← Mac/Linux one-click launcher
└── public/
    ├── index.html           ← Full UI and frontend logic
    ├── orb.js               ← Jarvis-style particle orb (Three.js)
    ├── brain.js             ← Conversation memory and session history
    └── diagrams.js          ← SVG diagram generator
```
