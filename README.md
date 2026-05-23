# Vysper - Interview Assistant with Local STT & Browser LLM

[![Build Status](https://github.com/actions/workflows/status/badge.svg)](https://github.com/)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()

Professional interview assistant that provides real-time AI-powered responses during technical interviews. **Now with 100% free local speech-to-text and browser-based LLM automation - no API costs!**

## 🌟 Key Features

- **🎤 Local Speech Recognition** - Faster-Whisper with automatic RU/EN language detection
- **🧠 Two-Tier LLM Architecture**:
  - Small local model (Qwen2.5-7B via LM Studio) for fast question processing
  - Big free online model (HuggingChat/Perplexity) for high-quality answers
- **🌐 Browser Automation** - Puppeteer-based interaction with free LLM websites
- **👻 Invisible Display** - Undetectable overlay window for answer display
- **💰 Zero Cost** - No API keys required, completely free to use

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
pip install faster-whisper sounddevice webrtcvad numpy
npx puppeteer browsers install chrome
```

### 2. Setup LM Studio

1. Download from https://lmstudio.ai/
2. Install **Qwen2.5-7B-Instruct** model
3. Start Local Server on `http://localhost:1234/v1`

### 3. Configure Big LLM Platform

1. Open Settings (`Cmd+,`)
2. Select **HuggingChat** (no login required) or **Perplexity** (better quality)
3. Save settings

### 4. Run

```bash
npm start
```

Press `Alt+R` to start voice recording and ask your first question!

## 📖 Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Russian quick start guide
- **[RU_SETUP_GUIDE.md](./RU_SETUP_GUIDE.md)** - Detailed Russian setup guide  
- **[SETUP_LOCAL_LLM.md](./SETUP_LOCAL_LLM.md)** - English technical setup guide

## ⚙️ Architecture

```
Voice Input
    ↓
[Whisper Service] → Local STT (Russian/English auto-detect)
    ↓
[Local LLM Agent] → Process & refine question (LM Studio, ~2 sec)
    ↓
[Browser LLM Service] → Send to big free LLM (HuggingFace/Perplexity)
    ↓
[Response Formatter] → Format for quick reading
    ↓
[Invisible Display] → Show on undetectable overlay window
```

## 🎯 Recommended Models

### Local LLM (LM Studio)

| Model | Size | Speed | Russian | Best For |
|-------|------|-------|---------|----------|
| **Qwen2.5-7B-Instruct** | 7B | ⚡⚡ | ⭐⭐⭐⭐⭐ | **Best for RU/EN mixed** |
| Qwen2.5-3B-Instruct | 3B | ⚡⚡⚡ | ⭐⭐⭐⭐ | Faster, slightly worse |
| Phi-3-mini-4k-instruct | 3.8B | ⚡⚡⚡ | ⭐⭐ | Fastest |

### Whisper STT

| Model | Accuracy | Speed | Recommendation |
|-------|----------|-------|----------------|
| **large-v3** | ⭐⭐⭐⭐⭐⭐ | 🐌🐌 | **Best accuracy** |
| small | ⭐⭐⭐⭐ | ⚡ | Good balance |

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+R` | Toggle voice recording |
| `Cmd+Shift+S` | Screenshot + AI Analysis |
| `Cmd+Shift+C` | Open chat window |
| `Cmd+Shift+\` | Clear session memory |
| `Cmd+,` | Open settings |

## 🆚 Comparison

| Solution | Cost | Quality | Privacy | Reliability |
|----------|------|---------|---------|-------------|
| Azure Speech (old) | $0.01/min | ⭐⭐⭐⭐ | Cloud | Depends on Azure |
| **Whisper (new)** | **FREE** | ⭐⭐⭐⭐⭐ | **Local** | **Always works** |
| Gemini API (old) | Free tier limits | ⭐⭐⭐⭐ | Cloud | Rate limited |
| **Browser LLM (new)** | **FREE** | ⭐⭐⭐⭐⭐ | Semi-local | **Stable** |

**Savings:** ~$50-100/month compared to API-based solutions

## 🛠️ Building for Windows

### Via GitHub Actions (Recommended for Private Repos)

1. Push to private repository
2. Go to Actions → "Build Windows Executable"
3. Download artifact from `dist/*.exe`

The workflow is optimized for GitHub Actions free tier:
- Caches dependencies to save time
- Only builds on private repos or manual trigger
- 14-day artifact retention

### Local Build

```bash
npm run build:win
```

Output: `dist/Vysper Setup x.x.x.exe`

## 🔒 Privacy & Security

- **Whisper STT**: Completely local, offline processing
- **Local LLM**: Only localhost communication, no internet
- **Browser LLM**: Requests go only to your chosen free platform
- **No API Keys**: Nothing to configure or pay for

## 💡 Tips for Interviews

1. **Test beforehand** - Run through the entire flow at least once
2. **Speak clearly** - Whisper works best with clear pronunciation
3. **Ask specific questions** - "How does async/await work in Python?" vs "Tell me about asynchrony"
4. **Position windows strategically** - Place response window outside screen share area
5. **Use technical English terms** - Keep technical terms in English even in Russian questions

## 📦 Tech Stack

- **Electron** - Cross-platform desktop app
- **Faster-Whisper** - Local speech-to-text
- **LM Studio** - Local LLM server
- **Puppeteer** - Browser automation
- **Node.js** - Backend logic
- **Qwen2.5** - Recommended local model

## 🆘 Troubleshooting

### Whisper not working
```bash
python --version
pip list | grep faster-whisper
```

### LM Studio not connecting
1. Ensure server is running (green "Start Server" button)
2. Check: http://localhost:1234/v1/models
3. Update endpoint in settings if using custom port

### Browser LLM failing
1. Try different platform (huggingface → perplexity)
2. Some platforms require login - sign in beforehand
3. Disable headless mode in settings for debugging

## 📄 License

MIT License - see [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [Faster-Whisper](https://github.com/guillaumekln/faster-whisper) - Optimized inference
- [LM Studio](https://lmstudio.ai/) - Local LLM hosting
- [Puppeteer](https://pptr.dev/) - Browser automation
- [HuggingFace](https://huggingface.co/chat) - Free LLM platform

---

**Good luck with your interviews!** 🍀
