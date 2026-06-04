[README.md](https://github.com/user-attachments/files/28575058/README.md)# Eryn — Desktop Voice Assistant

A fully custom, self-aware desktop assistant. Built for voice-first use with a Three.js cosmic orb, glassmorphism shell, and real desktop-like capabilities. 100% free to run.

---

## Quick Start

1. Open `index.html` in Chrome or Edge (recommended for full feature access)
2. Go to **Settings → AI Keys** and add a free Groq key (console.groq.com) or Gemini key (aistudio.google.com)
3. Go to **Settings → Creator** and set your name so Eryn knows who built her
4. Click the mic button or type a command

---

## What Eryn Can Do

### Voice & Conversation
- Browser-native voice recognition and speech synthesis (completely free)
- Hands-free mode: keeps listening after each response
- Full AI conversation with Groq (Llama 3) or Gemini Flash — both free tier available
- Knows she is Eryn, a custom assistant — not a generic chatbot

### Browser & Web
- Open any website, app, or URL by voice or text
- 35+ pre-mapped sites: GitHub, Spotify, YouTube, VS Code, Figma, Notion, Discord, Linear, etc.
- Search Google, YouTube, Reddit, Wikipedia by voice
- Play music on YouTube or Spotify by name
- Embedded Google Maps + tab opening

### File & Code (Chrome/Edge)
- Connect a local folder and browse/read/edit files
- Summarize code without reading every line aloud
- Save edits back to disk

### GitHub Integration
- Read README and file contents via GitHub API (no token needed for public repos)
- Push file commits using a Personal Access Token
- Free GitHub account is all you need

### Diagrams
- Generate SVG diagrams from any topic by voice or text
- Simple or complex layout
- Download as SVG

### Self-Awareness
- Knows her capabilities and creator
- Explains errors plainly
- Never claims success if an action was blocked

---

## Saying Commands

Voice examples:
- "Open GitHub"
- "Play lofi hip hop on YouTube"
- "Show a map of Tokyo"
- "Make a diagram of my product roadmap"
- "Search the web for latest AI news"
- "Who are you?" — Eryn will tell you what she is and who built her
- "What can you do?" — opens the full capabilities panel
- "Read my GitHub README"
- "Hands-free on"
- "Open VS Code"
- "Open Spotify"

---

## API Keys (Free)

| Service | Where to get | Cost |
|---------|-------------|------|
| Groq    | console.groq.com | Free tier, fast Llama 3 |
| Gemini  | aistudio.google.com | Free tier, Gemini Flash |
| GitHub  | github.com → Settings → Developer settings → Personal Access Tokens | Free, public repos need no token |

Keys are stored in your browser's localStorage only. Never sent anywhere except the official API endpoints.

---

## Files

- `index.html` — the entire application (single file, no build step)

---

## Browser Support

- **Chrome** — full support including folder access and voice
- **Edge** — full support
- **Firefox** — voice recognition and folder access not supported; typing and AI conversation still work

---

## Creator Setup

Go to **Settings → Creator** and enter your name. Eryn will use this in her self-introduction and when talking about who built her.

