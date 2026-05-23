/**
 * Whisper Service - Local Speech-to-Text using Faster-Whisper
 * Provides real-time transcription with automatic language detection
 * Supports Russian, English, and code-switching for technical interviews
 */

const { spawn, exec } = require('child_process');
const { EventEmitter } = require('events');
const fs = require('fs');
const path = require('path');
const logger = require('../core/logger').createServiceLogger('WHISPER');
const config = require('../core/config');

class WhisperService extends EventEmitter {
  constructor() {
    super();
    this.isRecording = false;
    this.whisperProcess = null;
    this.audioProcess = null;
    this.tempAudioFile = null;
    this.chunkBuffer = [];
    this.lastTranscription = '';
    this.interimTranscription = '';
    
    // Configuration for Faster-Whisper
    this.config = {
      model: config.get('whisper.model') || 'large-v3',
      language: config.get('whisper.language') || 'auto',
      device: config.get('whisper.device') || 'cpu',
      computeType: config.get('whisper.computeType') || 'int8',
      beamSize: 5,
      bestOf: 5,
      temperature: 0.0,
      compressionRatioThreshold: 2.4,
      logProbThreshold: -1.0,
      noSpeechThreshold: 0.6,
      conditionOnPreviousText: true,
      initialPrompt: '',
      prefix: null,
      suppressBlank: true,
      suppressTokens: [-1],
      withoutTimestamps: false,
      maxInitialTimestamp: null,
      wordTimestamps: false
    };
    
    this.initializeWhisper();
  }

  /**
   * Initialize Faster-Whisper backend
   * Checks if faster-whisper is installed and downloads model if needed
   */
  async initializeWhisper() {
    try {
      logger.info('Initializing Faster-Whisper service', {
        model: this.config.model,
        language: this.config.language,
        device: this.config.device
      });

      // Check if faster-whisper is installed
      const isInstalled = await this.checkWhisperInstallation();
      
      if (!isInstalled) {
        logger.warn('Faster-Whisper not found, attempting to install...');
        await this.installWhisper();
      }

      // Download model if not present
      await this.downloadModelIfNeeded();

      this.emit('status', 'Whisper service ready');
      logger.info('Whisper service initialized successfully');
      
    } catch (error) {
      logger.error('Failed to initialize Whisper service', { 
        error: error.message, 
        stack: error.stack 
      });
      this.emit('error', `Whisper initialization failed: ${error.message}`);
    }
  }

  /**
   * Check if faster-whisper is installed
   */
  async checkWhisperInstallation() {
    return new Promise((resolve) => {
      exec('faster-whisper --help', (error, stdout, stderr) => {
        if (error) {
          logger.debug('faster-whisper CLI not found');
          resolve(false);
        } else {
          logger.debug('faster-whisper CLI found');
          resolve(true);
        }
      });
    });
  }

  /**
   * Install faster-whisper via pip
   */
  async installWhisper() {
    return new Promise((resolve, reject) => {
      logger.info('Installing faster-whisper...');
      
      const install = spawn('pip', ['install', 'faster-whisper', '--quiet'], {
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      install.stdout.on('data', (data) => {
        output += data.toString();
      });

      install.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.debug('Install output:', data.toString());
      });

      install.on('close', (code) => {
        if (code === 0) {
          logger.info('faster-whisper installed successfully');
          resolve(true);
        } else {
          logger.error('faster-whisper installation failed', { 
            code, 
            error: errorOutput 
          });
          reject(new Error(`Installation failed with code ${code}: ${errorOutput}`));
        }
      });
    });
  }

  /**
   * Download Whisper model if not present
   */
  async downloadModelIfNeeded() {
    return new Promise((resolve) => {
      const modelPath = path.join(
        require('os').homedir(),
        '.cache',
        'huggingface',
        'hub',
        `models--Systran--faster-whisper-${this.config.model}`
      );

      if (fs.existsSync(modelPath)) {
        logger.debug('Whisper model already cached', { model: this.config.model });
        resolve(true);
        return;
      }

      logger.info('Downloading Whisper model...', { model: this.config.model });
      this.emit('status', `Downloading model: ${this.config.model}...`);

      // Model will be downloaded automatically on first use
      resolve(true);
    });
  }

  /**
   * Start recording and transcribing audio in real-time
   */
  startRecording() {
    try {
      if (this.isRecording) {
        logger.warn('Recording already in progress');
        return;
      }

      this.isRecording = true;
      this.chunkBuffer = [];
      this.lastTranscription = '';
      this.interimTranscription = '';

      logger.info('Starting Whisper recording', {
        model: this.config.model,
        language: this.config.language
      });

      this.emit('recording-started');
      this._startStreamingTranscription();

    } catch (error) {
      logger.error('Failed to start recording', { 
        error: error.message, 
        stack: error.stack 
      });
      this.emit('error', `Recording failed to start: ${error.message}`);
      this.isRecording = false;
    }
  }

  /**
   * Start streaming transcription using Python subprocess
   * This implements real-time transcription with chunked audio processing
   */
  _startStreamingTranscription() {
    try {
      // Create Python script for streaming transcription
      const pythonScript = this._getStreamingPythonScript();
      
      // Start Python process for streaming transcription
      this.whisperProcess = spawn('python3', ['-c', pythonScript], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
      });

      this.whisperProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter(line => line.trim());
        
        lines.forEach(line => {
          try {
            const result = JSON.parse(line);
            
            if (result.type === 'final') {
              this.lastTranscription = result.text;
              logger.debug('Final transcription', { text: result.text });
              this.emit('transcription', result.text);
            } else if (result.type === 'interim') {
              this.interimTranscription = result.text;
              logger.debug('Interim transcription', { text: result.text });
              this.emit('interim-transcription', result.text);
            }
          } catch (parseError) {
            logger.debug('Non-JSON output from whisper:', line);
          }
        });
      });

      this.whisperProcess.stderr.on('data', (data) => {
        const errorOutput = data.toString();
        logger.debug('Whisper stderr:', errorOutput);
        
        // Check for common errors
        if (errorOutput.includes('model') && errorOutput.includes('download')) {
          this.emit('status', 'Downloading model, please wait...');
        }
      });

      this.whisperProcess.on('error', (error) => {
        logger.error('Whisper process error', { error: error.message });
        this.emit('error', `Whisper process error: ${error.message}`);
      });

      this.whisperProcess.on('close', (code) => {
        logger.debug('Whisper process closed', { code });
        if (this.isRecording) {
          this.stopRecording();
        }
      });

      logger.info('Streaming transcription started');

    } catch (error) {
      logger.error('Failed to start streaming transcription', { 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get Python script for streaming transcription
   * Uses faster-whisper with VAD-based segmentation for real-time processing
   */
  _getStreamingPythonScript() {
    const model = this.config.model;
    const language = this.config.language;
    const device = this.config.device;
    const computeType = this.config.computeType;

    return `
import sys
import json
import numpy as np
import sounddevice as sd
from faster_whisper import WhisperModel
import collections
import webrtcvad
import wave
import io
import time

# Configuration
MODEL_SIZE = "${model}"
LANGUAGE = "${language}" if "${language}" != "auto" else None
DEVICE = "${device}"
COMPUTE_TYPE = "${computeType}"
SAMPLE_RATE = 16000
CHANNELS = 1
CHUNK_DURATION = 1.0  # seconds
VAD_AGGRESSIVENESS = 2

# Initialize VAD
vad = webrtcvad.Vad(VAD_AGGRESSIVENESS)

# Initialize Whisper model
print(f"Loading Whisper model: {MODEL_SIZE}", file=sys.stderr)
model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE_TYPE)
print("Model loaded successfully", file=sys.stderr)

# Audio buffer for continuous recording
audio_buffer = collections.deque(maxlen=int(SAMPLE_RATE * 30))  # 30 seconds buffer
speech_buffer = []
is_speaking = False
silence_start = None
SILENCE_THRESHOLD = 1.5  # seconds of silence before processing

def frame_generator(frame_duration_ms, source, sample_rate):
    """Generates audio frames from PCM audio data."""
    frame_size = int(sample_rate * (frame_duration_ms / 1000.0))
    while True:
        chunk = source.read(frame_size)
        if len(chunk) < frame_size:
            break
        yield chunk

def vad_is_speech(frame, sample_rate):
    """Check if frame contains speech using VAD."""
    try:
        return vad.is_speech(frame, sample_rate)
    except:
        return False

def transcribe_audio(audio_data):
    """Transcribe audio data using Whisper."""
    try:
        # Convert to float32 and normalize
        audio_float = audio_data.astype(np.float32)
        audio_float = audio_float / 32768.0
        
        # Transcribe
        segments, info = model.transcribe(
            audio_float,
            language=LANGUAGE,
            beam_size=5,
            vad_filter=True,
            vad_parameters=dict(
                min_silence_duration_ms=500,
                speech_pad_ms=400
            )
        )
        
        text = " ".join([segment.text for segment in segments]).strip()
        return text
    except Exception as e:
        print(f"Transcription error: {e}", file=sys.stderr)
        return ""

def process_speech_buffer():
    """Process accumulated speech buffer and emit transcription."""
    global speech_buffer, is_speaking
    
    if len(speech_buffer) == 0:
        return
    
    # Combine speech frames
    audio_data = b''.join(speech_buffer)
    audio_array = np.frombuffer(audio_data, dtype=np.int16)
    
    # Emit interim result while speaking
    if len(audio_array) > SAMPLE_RATE * 0.5:  # At least 0.5 seconds of speech
        text = transcribe_audio(audio_array)
        if text:
            result = {"type": "interim", "text": text}
            print(json.dumps(result), flush=True)
    
    speech_buffer = []

def finalize_transcription():
    """Finalize transcription after silence."""
    global speech_buffer, is_speaking
    
    if len(speech_buffer) == 0:
        return
    
    audio_data = b''.join(speech_buffer)
    audio_array = np.frombuffer(audio_data, dtype=np.int16)
    
    if len(audio_array) > SAMPLE_RATE * 0.5:
        text = transcribe_audio(audio_array)
        if text:
            result = {"type": "final", "text": text}
            print(json.dumps(result), flush=True)
    
    speech_buffer = []
    is_speaking = False

# Main recording loop
print("Starting audio recording...", file=sys.stderr)
stream = sd.InputStream(
    samplerate=SAMPLE_RATE,
    channels=CHANNELS,
    dtype='int16',
    blocksize=int(SAMPLE_RATE * 0.1)  # 100ms blocks
)

with stream:
    print("Recording started", file=sys.stderr)
    while True:
        audio_chunk, overflowed = stream.read(int(SAMPLE_RATE * 0.1))
        
        if overflowed:
            print("Buffer overflow", file=sys.stderr)
            continue
        
        # Convert to bytes for VAD
        audio_bytes = audio_chunk.tobytes()
        
        # Check for speech using VAD
        if vad_is_speech(audio_bytes, SAMPLE_RATE):
            if not is_speaking:
                is_speaking = True
                silence_start = None
            
            speech_buffer.append(audio_bytes)
            
            # Process speech buffer periodically
            if len(speech_buffer) % 10 == 0:  # Every ~1 second
                process_speech_buffer()
        else:
            if is_speaking:
                if silence_start is None:
                    silence_start = time.time()
                elif time.time() - silence_start > SILENCE_THRESHOLD:
                    # Silence detected, finalize transcription
                    finalize_transcription()
            else:
                # Keep small buffer for context
                if len(speech_buffer) > 10:
                    speech_buffer = speech_buffer[-10:]

`;
  }

  /**
   * Stop recording and cleanup resources
   */
  stopRecording() {
    try {
      if (!this.isRecording) {
        return;
      }

      logger.info('Stopping Whisper recording');

      // Kill Python process
      if (this.whisperProcess) {
        this.whisperProcess.kill('SIGTERM');
        this.whisperProcess = null;
      }

      this.isRecording = false;
      this.emit('recording-stopped');
      this.emit('status', 'Recording stopped');

      logger.info('Whisper recording stopped');

    } catch (error) {
      logger.error('Error stopping recording', { 
        error: error.message 
      });
      this.emit('error', `Stop recording error: ${error.message}`);
    }
  }

  /**
   * Get current recording status
   */
  getStatus() {
    return {
      isRecording: this.isRecording,
      service: 'whisper',
      model: this.config.model,
      language: this.config.language,
      device: this.config.device
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    logger.info('Whisper config updated', this.config);
  }
}

module.exports = new WhisperService();
