# Local LLM & Whisper Setup Guide

This guide explains how to set up the new local speech-to-text and browser-based LLM features in Vysper.

## Overview

The updated Vysper now uses:
1. **Faster-Whisper** - Local, offline speech-to-text with automatic language detection (Russian/English)
2. **Local LLM Agent** - Small local model (via LM Studio) for fast transcription processing
3. **Browser LLM Service** - Automated browser interaction with free online LLMs (HuggingChat, Perplexity, You.com)

## Architecture Flow

```
Voice Input 
    ↓
[Whisper Service] → Real-time STT (Russian/English auto-detect)
    ↓
[Local LLM Agent] → Process & refine question (LM Studio, ~1-3 sec)
    ↓
[Browser LLM Service] → Send to big free LLM via web automation (HuggingFace/Perplexity)
    ↓
[Response Formatter] → Format for quick reading
    ↓
[Invisible Display] → Show on undetectable overlay window
```

## Installation Steps

### 1. Install Node.js Dependencies

```bash
npm install
# This now includes puppeteer for browser automation
```

### 2. Install Python Dependencies for Whisper

```bash
# Option A: Using npm script
npm run install-whisper

# Option B: Manual installation
pip install faster-whisper sounddevice webrtcvad numpy
```

### 3. Install Chrome for Puppeteer

```bash
# Option A: Using npm script
npm run install-browser

# Option B: Manual installation
npx puppeteer browsers install chrome
```

### 4. Setup LM Studio (for Local LLM Agent)

1. Download LM Studio from https://lmstudio.ai/
2. Install and launch LM Studio
3. Download a small, fast model (recommended):
   - **Phi-3-mini-4k-instruct** (3.8B) - Excellent speed/quality ratio
   - **Mistral-7B-Instruct-v0.3** - Good multilingual support
   - **Llama-3-8B-Instruct** - Best quality, slightly slower
4. Start the local server in LM Studio:
   - Go to "Local Server" tab
   - Click "Start Server"
   - Default endpoint: `http://localhost:1234/v1`

### 5. Configure Settings

Create or update `.env` file:

```bash
# Optional: Keep Azure as fallback
AZURE_SPEECH_KEY=your_azure_key
AZURE_SPEECH_REGION=your_region

# Local LLM Configuration
LOCAL_LLM_ENDPOINT=http://localhost:1234/v1
LOCAL_LLM_MODEL=phi-3-mini-4k-instruct

# Browser LLM Configuration  
BROWSER_LLM_MODEL=huggingface
BROWSER_LLM_HEADLESS=true
BROWSER_LLM_AUTO_CLEAR=true

# Whisper Configuration
WHISPER_MODEL=large-v3
WHISPER_LANGUAGE=auto
WHISPER_DEVICE=cpu
WHISPER_COMPUTE_TYPE=int8
```

## Model Recommendations

### For LM Studio (Local LLM Agent)

| Model | Size | Speed | Quality | Russian Support | Recommendation |
|-------|------|-------|---------|-----------------|----------------|
| Phi-3-mini-4k-instruct | 3.8B | ⚡⚡⚡ | ⭐⭐⭐ | ⭐⭐ | **Best for speed** |
| Mistral-7B-Instruct | 7B | ⚡⚡ | ⭐⭐⭐⭐ | ⭐⭐⭐ | **Balanced choice** |
| Llama-3-8B-Instruct | 8B | ⚡⚡ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Best quality |
| Qwen2-7B-Instruct | 7B | ⚡⚡ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Best Russian support |

**Recommended**: Start with **Phi-3-mini-4k-instruct** for speed during interviews.

### For Whisper STT

| Model | Size | Speed | Accuracy | Languages | Recommendation |
|-------|------|-------|----------|-----------|----------------|
| tiny | 39M | ⚡⚡⚡ | ⭐⭐ | All | Too inaccurate |
| base | 74M | ⚡⚡ | ⭐⭐⭐ | All | Okay for clear speech |
| small | 244M | ⚡ | ⭐⭐⭐⭐ | All | Good balance |
| medium | 769M | 🐌 | ⭐⭐⭐⭐⭐ | All | Slow for real-time |
| large-v3 | 1.5G | 🐌🐌 | ⭐⭐⭐⭐⭐⭐ | All | **Best accuracy** |

**Recommended**: Use **large-v3** with `int8` quantization for best accuracy with acceptable speed.

## Usage

### Starting the Application

```bash
npm start
```

### Voice Recording Workflow

1. Press `Alt+R` to start voice recording
2. Speak your question (Russian, English, or mixed)
3. Whisper transcribes in real-time
4. Local LLM processes and refines the question (~1-3 sec)
5. Browser service sends to HuggingChat/Perplexity automatically
6. Formatted response appears in invisible window

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+R` | Toggle voice recording |
| `Cmd+Shift+S` | Screenshot + AI Analysis |
| `Cmd+Shift+C` | Open chat window |
| `Cmd+Shift+\` | Clear session memory |
| `Alt+A` | Toggle interactive mode |

## Troubleshooting

### Whisper Not Working

1. Check Python installation: `python3 --version`
2. Verify dependencies: `pip list | grep -E "(faster-whisper|sounddevice|webrtcvad)"`
3. Test microphone permissions in System Settings
4. Check logs in `logs/whisper.log`

### Local LLM Not Connecting

1. Ensure LM Studio is running
2. Check server is started in LM Studio
3. Verify endpoint: `curl http://localhost:1234/v1/models`
4. Update endpoint in settings if using custom port

### Browser LLM Failing

1. Check Chrome installation: `npx puppeteer browsers install chrome`
2. Some platforms may require login - use incognito mode
3. Try switching platforms in settings (huggingface → perplexity → you)
4. Increase timeout in configuration

### Performance Issues

1. Reduce Whisper model size (large-v3 → small)
2. Use smaller local LLM model (Phi-3 instead of Llama-3)
3. Enable GPU acceleration in LM Studio if available
4. Close other resource-intensive applications

## Advanced Configuration

### Custom Prompts

Edit prompts in `src/services/local-llm-agent.service.js`:

```javascript
this.prompts = {
  transcriptionProcessor: `Your custom prompt here...`,
  responseFormatter: `Your custom formatting rules...`
};
```

### Platform Selection

Change browser LLM platform programmatically:

```javascript
const browserLLMService = require('./src/services/browser-llm.service');
browserLLMService.switchPlatform('perplexity'); // or 'huggingface', 'you'
```

### Custom Whisper Settings

```javascript
const whisperService = require('./src/services/whisper.service');
whisperService.updateConfig({
  model: 'small',
  language: 'en', // or 'ru' for Russian-only
  device: 'cuda', // if you have NVIDIA GPU
  computeType: 'float16'
});
```

## Cost Comparison

| Solution | Cost | Speed | Quality | Privacy |
|----------|------|-------|---------|---------|
| Azure Speech (old) | $0.01/min | Fast | ⭐⭐⭐⭐ | Cloud |
| **Whisper (new)** | **FREE** | Fast | ⭐⭐⭐⭐⭐ | **Local** |
| Gemini API (old) | Free tier limits | Fast | ⭐⭐⭐⭐ | Cloud |
| **Browser LLM (new)** | **FREE** | Medium | ⭐⭐⭐⭐⭐ | Semi-local |

## Success Tips for Interviews

1. **Test before the interview**: Run through the entire flow at least once
2. **Position windows strategically**: Place response window in corner, outside screen share area
3. **Use clear speech**: Whisper works best with clear pronunciation
4. **Keep questions focused**: Specific questions get better answers
5. **Practice the workflow**: Get comfortable with the timing (transcription → processing → response)

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review error messages in developer console
3. Ensure all dependencies are installed correctly
4. Verify LM Studio server is running

Good luck with your interviews! 🚀
