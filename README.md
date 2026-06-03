# Eryn Assistant

Eryn is a browser-based voice assistant prototype focused on practical actions: opening tabs, showing maps, creating diagrams, and answering naturally through optional Groq or Gemini model keys.

## What Eryn Can Do

- Listen through the browser microphone when speech recognition is available.
- Speak with a more natural voice profile using the best local browser voice it can find.
- Open new tabs for common destinations, websites, searches, and maps.
- Generate clean SVG diagrams from plain language prompts.
- Show interactive OpenStreetMap map embeds inside the app.
- Use Groq first and Gemini as a fallback for general conversation when keys are saved.
- Keep API keys in local browser storage only.

## Try It

Open `index.html` in a modern browser. Chrome usually has the best support for speech recognition. Safari and other browsers may still work for text commands and speech output.

Useful commands:

- `open GitHub in a new tab`
- `search the web for natural browser voices`
- `make a complex diagram of product discovery to launch`
- `show a map of Seattle`
- `open maps for coffee near me`

## Eryn Notes

Eryn is designed to feel calm, direct, and capable. The app keeps replies brief so speech output sounds more natural and less like a paragraph being read aloud. Local actions run before model calls, which means core tools still work without API keys.

## Browser Permissions

The microphone prompt is controlled by the browser. If voice input is blocked, allow microphone access for the page or use the text command box.

New tabs can be blocked by pop-up settings. If Eryn says a tab was blocked, allow pop-ups for the page and try again.

## Files

- `index.html`: The complete Eryn app.
- `README.md`: Project overview and usage notes.
- `eryn-profile.md`: Short identity and behavior guide for the assistant.

## Security

This is a client-side prototype. API keys are stored in browser local storage and are sent directly from the browser to Groq or Gemini. For production use, move model calls behind a small server so keys are never exposed to the browser.
