/**
 * Local LLM Agent Service
 * Works with LM Studio or other local LLM servers
 * Processes transcribed text and formats queries for the big browser-based LLM
 */

const { EventEmitter } = require('events');
const logger = require('../core/logger').createServiceLogger('LOCAL_LLM_AGENT');
const config = require('../core/config');

class LocalLLMAgentService extends EventEmitter {
  constructor() {
    super();
    this.apiEndpoint = config.get('localLLM.endpoint') || 'http://localhost:1234/v1';
    this.model = config.get('localLLM.model') || ''; // Auto-detect from LM Studio
    this.isConnected = false;
    this.isProcessing = false;
    
    // Prompt templates
    this.prompts = {
      transcriptionProcessor: `You are an intelligent transcription processor for a technical interview assistant.
Your job is to:
1. Understand the transcribed speech (which may contain errors, hesitations, or mixed Russian/English)
2. Extract the core question or intent
3. Reformulate it as a clear, well-structured question suitable for a large language model
4. Keep technical terms in English even if the rest is in Russian

Respond ONLY with the reformulated question, nothing else.

Examples:
Input: "ну типа как вот это... эм... работает асинхронность в питоне?"
Output: "How does asynchronous programming work in Python? Explain async/await, event loops, and common use cases."

Input: "расскажи про хеш таблицы и коллизии"
Output: "Explain hash tables and collision resolution strategies. Cover hashing functions, collision handling methods like chaining and open addressing, and time complexity."

Input: "what's the difference between list and tuple in python"
Output: "What are the key differences between lists and tuples in Python? Cover mutability, performance, use cases, and when to use each."

Transcription to process:`,

      responseFormatter: `You are a response formatter for interview assistance.
Format the following LLM response into a concise, easy-to-read format suitable for quick reading during an interview.

Rules:
1. Keep it comprehensive but scannable
2. Use bullet points and numbered lists
3. Highlight key concepts in **bold**
4. For code, provide minimal but complete examples
5. Structure: Key Points → Explanation → Example (if applicable)
6. Maximum 300 words unless complex technical detail is required

Format the response now:`
    };

    this.checkConnection();
  }

  /**
   * Check connection to local LLM server (LM Studio)
   */
  async checkConnection() {
    try {
      const response = await fetch(`${this.apiEndpoint}/models`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        this.isConnected = true;
        
        // Auto-detect model if not specified
        if (!this.model && data.data && data.data.length > 0) {
          this.model = data.data[0].id;
          logger.info('Auto-detected model', { model: this.model });
        }

        logger.info('Local LLM connected', { 
          endpoint: this.apiEndpoint,
          model: this.model || 'default'
        });
        this.emit('status', 'Local LLM agent ready');
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      this.isConnected = false;
      logger.warn('Local LLM not available', { 
        error: error.message,
        endpoint: this.apiEndpoint 
      });
      this.emit('status', 'Local LLM disconnected - ensure LM Studio is running');
    }
  }

  /**
   * Process transcribed text through local LLM
   * @param {string} transcription - Raw transcribed text
   * @returns {Promise<string>} - Processed question
   */
  async processTranscription(transcription) {
    if (!this.isConnected) {
      logger.warn('Local LLM not connected, using fallback processing');
      return this.fallbackProcessTranscription(transcription);
    }

    try {
      this.isProcessing = true;
      logger.debug('Processing transcription', { 
        length: transcription.length,
        text: transcription.substring(0, 100)
      });

      const prompt = `${this.prompts.transcriptionProcessor}\n\n"${transcription}"`;

      const response = await this.sendRequest(prompt);
      
      this.isProcessing = false;
      logger.debug('Transcription processed', { 
        originalLength: transcription.length,
        processedLength: response.length
      });

      return response.trim();

    } catch (error) {
      this.isProcessing = false;
      logger.error('Transcription processing failed', { error: error.message });
      
      // Fallback to simple processing
      return this.fallbackProcessTranscription(transcription);
    }
  }

  /**
   * Send request to local LLM
   */
  async sendRequest(prompt, options = {}) {
    const {
      temperature = 0.3,
      maxTokens = 500,
      topP = 0.9,
      stream = false
    } = options;

    const requestBody = {
      model: this.model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      stream
    };

    const response = await fetch(`${this.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`LLM request failed: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  /**
   * Fallback transcription processing when LLM is unavailable
   */
  fallbackProcessTranscription(transcription) {
    // Simple cleaning and normalization
    let processed = transcription
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/(эм|э|ммм|ну|типа|вот|как бы)/gi, '')
      .replace(/\?+/g, '?')
      .replace(/\.{2,}/g, '...')
      .trim();

    // Capitalize first letter
    if (processed.length > 0) {
      processed = processed.charAt(0).toUpperCase() + processed.slice(1);
    }

    // Ensure it ends with question mark if it's a question
    if (processed.match(/^(что|как|почему|зачем|когда|где|какой|сколько|объясни|расскажи|what|how|why|when|where|explain|tell me)/i) && 
        !processed.endsWith('?')) {
      processed += '?';
    }

    logger.debug('Fallback processing applied', { original: transcription, processed });
    return processed;
  }

  /**
   * Format LLM response for display
   * @param {string} response - Raw LLM response
   * @returns {Promise<string>} - Formatted response
   */
  async formatResponseForDisplay(response) {
    if (!this.isConnected) {
      return this.simpleFormatResponse(response);
    }

    try {
      const prompt = `${this.prompts.responseFormatter}\n\n${response}`;
      const formatted = await this.sendRequest(prompt, {
        temperature: 0.5,
        maxTokens: 800
      });

      return formatted.trim();
    } catch (error) {
      logger.warn('Response formatting failed', { error: error.message });
      return this.simpleFormatResponse(response);
    }
  }

  /**
   * Simple response formatting fallback
   */
  simpleFormatResponse(response) {
    // Basic formatting: ensure proper paragraph breaks
    return response
      .split(/\n{2,}/)
      .map(para => para.trim())
      .filter(para => para.length > 0)
      .join('\n\n');
  }

  /**
   * Create formatted query for big LLM
   * @param {string} originalTranscription - Original transcribed text
   * @param {string} processedQuestion - Question processed by local LLM
   * @returns {string} - Formatted query
   */
  createQueryForBigLLM(originalTranscription, processedQuestion) {
    const timestamp = new Date().toISOString();
    
    return `<format_for_big_llm>
<metadata>
  <timestamp>${timestamp}</timestamp>
  <source>voice_transcription</source>
  <context>technical_interview_backend_python_developer</context>
  <processing>local_llm_enhanced</processing>
</metadata>

<processed_question>
${processedQuestion}
</processed_question>

<original_transcription>
${originalTranscription}
</original_transcription>

<instructions>
Please provide a comprehensive, well-structured answer to the processed question above.
The original transcription is provided for additional context - it may contain speech artifacts or mixed Russian/English.
Focus on accuracy, clarity, and practical applicability for a backend Python developer interview.
If the question involves code, provide clear examples with explanations.
Structure your answer for quick reading: key points first, then details.
</instructions>
</format_for_big_llm>`;
  }

  /**
   * Get agent status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isProcessing: this.isProcessing,
      endpoint: this.apiEndpoint,
      model: this.model,
      hasPrompts: !!this.prompts.transcriptionProcessor
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig) {
    if (newConfig.endpoint) {
      this.apiEndpoint = newConfig.endpoint;
    }
    if (newConfig.model) {
      this.model = newConfig.model;
    }
    
    logger.info('Local LLM agent config updated', this.apiEndpoint, this.model);
    this.checkConnection();
  }
}

module.exports = new LocalLLMAgentService();
