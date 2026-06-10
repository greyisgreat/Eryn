# Eryn — Desktop Assistant v2.0

A voice-first desktop assistant with full OS control. Launch and close apps, run shell commands, read/write any file, take screenshots, control volume, and have full AI conversations.

---

## Quick Setup

### Step 1 — Download & Place the Folder

1. Download the ZIP from the repo
2. Unzip it
3. Place the **eryn** folder on your **Desktop**

---

### Step 2 — Install Node.js (if you don't have it)

**Mac:**
- Go to https://nodejs.org and download the LTS version
- Run the installer

**Windows:**
- Go to https://nodejs.org and download the LTS version
- Run the installer, click through all defaults
- Restart your computer after installing

Check it worked — open Terminal (Mac) or Command Prompt (Windows) and type:
```
node --version
```
You should see something like `v20.x.x`

---

### Step 3 — Install Dependencies

**Mac:**
1. Open **Terminal**
2. Type this and press Enter:
```
cd ~/Desktop/eryn && npm install
```
Wait for it to finish (takes about 30 seconds)

**Windows:**
1. Press `Win + R`, type `cmd`, press Enter
2. Type this and press Enter:
```
cd %USERPROFILE%\Desktop\eryn && npm install
```
Wait for it to finish

---

### Step 4 — Start the Server

**Mac:**
```
cd ~/Desktop/eryn && node server.js
```

**Windows:**
```
cd %USERPROFILE%\Desktop\eryn && node server.js
```

You should see:
```
╔════════════════════════════════╗
║   ERYN DESKTOP SERVER v2.0     ║
╠════════════════════════════════╣
║  http://localhost:3000          ║
╚════════════════════════════════╝
```

**Leave this terminal window open.** It must stay running.

---

### Step 5 — Open Eryn

Open **Chrome** or **Edge** and go to:
```
http://localhost:3000
```

> ⚠️ Must use Chrome or Edge. Firefox does not support the File System API.

---

### Step 6 — Add Your API Keys

1. Click the **Settings** tab in the right panel
2. Add your **Groq API key** (free at https://console.groq.com)
3. Add your **Gemini API key** (free at https://aistudio.google.com)
4. Click **Save Keys**
5. Enter your name under **Identity** and click Save

---

## Auto-Start on Boot (Optional)

### Mac — run Eryn automatically when you log in:

1. Open Terminal and run:
```
chmod +x ~/Desktop/eryn/start-eryn.sh
```
2. Open **System Settings → General → Login Items**
3. Click **+** and add the `start-eryn.sh` file from the eryn folder

### Windows — run Eryn automatically on startup:

1. Press `Win + R`, type `shell:startup`, press Enter
2. In the folder that opens, create a new file called `start-eryn.bat`
3. Right-click it → Edit, paste this:
```
cd %USERPROFILE%\Desktop\eryn
node server.js
```
4. Save and close

---

## Voice Commands (Examples)

| Say this | What happens |
|---|---|
| "Open VS Code" | Launches VS Code |
| "Close Spotify" | Kills Spotify process |
| "Run ls ~" | Runs shell command |
| "Make a diagram of my login flow" | AI generates a diagram |
| "Show a map of Tokyo" | Loads embedded map |
| "Read my clipboard" | Returns clipboard contents |
| "Volume up" | Increases system volume |
| "Search the web for..." | Opens Google search |
| "What can you do" | Shows capabilities |

---

## Troubleshooting

**"Server offline" badge in Eryn:**
→ The terminal running `node server.js` may have closed. Restart it.

**npm install fails:**
→ Make sure Node.js is installed. Run `node --version` to check.

**Voice not working:**
→ Only works in Chrome/Edge. Click Allow when the browser asks for microphone access.

**Can't open apps on Mac:**
→ Go to System Settings → Privacy & Security → Automation and allow Terminal to control apps.

**Port 3000 already in use:**
→ Open `server.js` and change `const PORT = 3000` to `3001`, then visit `http://localhost:3001`

---

## What Eryn Can Do

**Always (browser):**
- Voice recognition + speech
- Open websites and web apps
- AI conversation (Groq / Gemini)
- Diagrams, maps, GitHub, file editing

**With server running:**
- Launch any desktop app
- Kill/close any app
- Run shell commands
- Read/write any file on your computer
- System stats (CPU, RAM, disk)
- Screenshots
- Clipboard read/write
- Volume control
