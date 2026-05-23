/**
 * Browser LLM Service - Web Automation for Large Language Models
 * Uses Puppeteer to interact with free online LLM interfaces (like HuggingFace, Perplexity, etc.)
 * Allows sending requests programmatically without API costs
 */

const puppeteer = require('puppeteer');
const { EventEmitter } = require('events');
const logger = require('../core/logger').createServiceLogger('BROWSER_LLM');
const config = require('../core/config');

class BrowserLLMService extends EventEmitter {
  constructor() {
    super();
    this.browser = null;
    this.page = null;
    this.isConnected = false;
    this.currentModel = config.get('browserLLM.model') || 'huggingface';
    this.requestQueue = [];
    this.isProcessing = false;
    
    // Supported models/platforms
    this.supportedPlatforms = {
      huggingface: {
        name: 'HuggingChat',
        url: 'https://huggingface.co/chat/',
        inputSelector: 'textarea[placeholder*="message"]',
        submitSelector: 'button[type="submit"]',
        responseSelector: '.result-streaming, .prose',
        readySelector: '.result-streaming:not(.streaming)',
        clearButtonSelector: 'button[aria-label*="clear" i], button[title*="clear" i]'
      },
      perplexity: {
        name: 'Perplexity AI',
        url: 'https://www.perplexity.ai/',
        inputSelector: 'textarea[placeholder*="ask"]',
        submitSelector: 'button[data-testid*="submit"]',
        responseSelector: '[data-testid*="response"]',
        readySelector: 'button[aria-label*="copy"]',
        clearButtonSelector: 'button[aria-label*="new" i]'
      },
      you: {
        name: 'You.com',
        url: 'https://you.com/',
        inputSelector: 'textarea[placeholder*="search"]',
        submitSelector: 'button[aria-label*="search" i]',
        responseSelector: '.searchResult, .answerBox',
        readySelector: '.citationBlock',
        clearButtonSelector: 'button[aria-label*="clear" i]'
      }
    };

    this.initializeBrowser();
  }

  /**
   * Initialize Puppeteer browser
   */
  async initializeBrowser() {
    try {
      logger.info('Initializing browser for LLM automation');
      
      const browserConfig = config.get('browserLLM') || {};
      
      this.browser = await puppeteer.launch({
        headless: browserConfig.headless !== false, // default to headless
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ],
        timeout: 60000
      });

      this.isConnected = true;
      this.emit('status', 'Browser LLM service ready');
      logger.info('Browser initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize browser', { 
        error: error.message, 
        stack: error.stack 
      });
      this.emit('error', `Browser initialization failed: ${error.message}`);
      this.isConnected = false;
    }
  }

  /**
   * Ensure page is loaded for current platform
   */
  async ensurePageLoaded() {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const platform = this.supportedPlatforms[this.currentModel];
    if (!platform) {
      throw new Error(`Unsupported platform: ${this.currentModel}`);
    }

    try {
      // Create new page if needed
      if (!this.page || this.page.isClosed()) {
        this.page = await this.browser.newPage();
        
        // Set viewport
        await this.page.setViewport({ width: 1920, height: 1080 });
        
        // Add stealth scripts to avoid detection
        await this.addStealthScripts();
      }

      // Navigate to platform if not already there
      const currentUrl = this.page.url();
      if (!currentUrl.includes(platform.url.split('/')[2])) {
        logger.info('Navigating to LLM platform', { platform: platform.name });
        this.emit('status', `Connecting to ${platform.name}...`);
        
        await this.page.goto(platform.url, {
          waitUntil: 'networkidle2',
          timeout: 60000
        });

        // Wait for page to be fully loaded
        await this.waitForPageReady(platform);
        logger.info('Platform page loaded', { platform: platform.name });
      }

    } catch (error) {
      logger.error('Failed to load page', { 
        error: error.message,
        platform: platform.name
      });
      throw error;
    }
  }

  /**
   * Add stealth scripts to avoid bot detection
   */
  async addStealthScripts() {
    await this.page.evaluateOnNewDocument(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false
      });

      // Override plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Override languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en']
      });

      // Remove automation flags
      delete navigator.__proto__.webdriver;
    });
  }

  /**
   * Wait for page to be ready for interaction
   */
  async waitForPageReady(platform) {
    try {
      // Wait for input field to be available
      await this.page.waitForSelector(platform.inputSelector, {
        timeout: 30000,
        visible: true
      });

      logger.debug('Page ready for interaction', { platform: platform.name });
    } catch (error) {
      logger.warn('Timeout waiting for page, proceeding anyway', { 
        error: error.message 
      });
    }
  }

  /**
   * Clear previous conversation
   */
  async clearConversation() {
    try {
      const platform = this.supportedPlatforms[this.currentModel];
      
      if (platform.clearButtonSelector) {
        try {
          const clearButton = await this.page.$(platform.clearButtonSelector);
          if (clearButton) {
            await clearButton.click();
            await this.page.waitForTimeout(1000);
            logger.debug('Conversation cleared');
          }
        } catch (error) {
          logger.debug('No clear button found or click failed', { 
            error: error.message 
          });
        }
      }
    } catch (error) {
      logger.warn('Failed to clear conversation', { error: error.message });
    }
  }

  /**
   * Send query to LLM and get response
   * @param {string} query - The formatted query to send
   * @returns {Promise<string>} - LLM response text
   */
  async sendQuery(query) {
    if (!this.isConnected || !this.browser) {
      throw new Error('Browser not connected');
    }

    const requestId = Date.now();
    logger.info('Sending query to browser LLM', { 
      requestId,
      queryLength: query.length,
      platform: this.currentModel
    });

    try {
      // Ensure page is loaded
      await this.ensurePageLoaded();
      
      const platform = this.supportedPlatforms[this.currentModel];

      // Clear previous conversation if configured
      if (config.get('browserLLM.autoClear')) {
        await this.clearConversation();
      }

      // Type the query
      logger.debug('Typing query...');
      const inputField = await this.page.$(platform.inputSelector);
      
      if (!inputField) {
        throw new Error('Input field not found');
      }

      // Click to focus
      await inputField.click();
      await this.page.waitForTimeout(500);

      // Clear any existing text
      await inputField.click({ clickCount: 3 });
      await this.page.keyboard.press('Backspace');
      await this.page.waitForTimeout(300);

      // Type the query slowly to avoid detection
      await this.typeText(inputField, query, 10 + Math.random() * 20);

      // Submit the query
      logger.debug('Submitting query...');
      const submitButton = await this.page.$(platform.submitSelector);
      
      if (submitButton) {
        await submitButton.click();
      } else {
        // Try Enter key as fallback
        await this.page.keyboard.press('Enter');
      }

      // Wait for response
      logger.debug('Waiting for response...');
      this.emit('status', 'Waiting for LLM response...');
      
      const response = await this.waitForResponse(platform);
      
      logger.info('Response received', { 
        requestId,
        responseLength: response.length 
      });

      return response;

    } catch (error) {
      logger.error('Query failed', { 
        requestId,
        error: error.message,
        stack: error.stack
      });
      this.emit('error', `Query failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Type text with human-like delay
   */
  async typeText(element, text, delayMs = 15) {
    await element.click();
    
    // Clear existing text
    await this.page.keyboard.down('Control');
    await this.page.keyboard.press('a');
    await this.page.keyboard.up('Control');
    await this.page.keyboard.press('Backspace');
    
    // Type character by character with variable delay
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.page.waitForTimeout(delayMs + Math.random() * 10);
    }
  }

  /**
   * Wait for LLM response to complete
   */
  async waitForResponse(platform) {
    const maxWaitTime = 120000; // 2 minutes max
    const startTime = Date.now();
    let lastResponse = '';
    let noChangeCount = 0;

    try {
      // Wait for response to start appearing
      await this.page.waitForSelector(platform.responseSelector, {
        timeout: 30000,
        visible: true
      });

      // Poll for complete response
      while (Date.now() - startTime < maxWaitTime) {
        try {
          const responseElements = await this.page.$$(platform.responseSelector);
          
          if (responseElements.length > 0) {
            // Get text from response
            const responseText = await this.page.evaluate((selector) => {
              const elements = document.querySelectorAll(selector);
              return Array.from(elements).map(el => el.textContent).join('\n');
            }, platform.responseSelector);

            if (responseText && responseText.length > lastResponse.length) {
              lastResponse = responseText;
              noChangeCount = 0;
              
              // Emit interim updates
              this.emit('interim-response', {
                text: responseText,
                isComplete: false
              });
            } else if (responseText === lastResponse) {
              noChangeCount++;
              
              // If no change for several iterations, consider it complete
              if (noChangeCount > 5) {
                logger.debug('Response appears complete');
                break;
              }
            }
          }
        } catch (pollError) {
          logger.debug('Polling error (non-fatal)', { error: pollError.message });
        }

        await this.page.waitForTimeout(1000);
      }

      if (!lastResponse) {
        throw new Error('No response received from LLM');
      }

      return lastResponse.trim();

    } catch (error) {
      logger.error('Response wait failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Format query for big LLM with context
   * @param {string} transcribedText - Original transcribed speech
   * @param {string} processedQuestion - Question processed by small local LLM
   * @returns {string} - Formatted query
   */
  formatQueryForBigLLM(transcribedText, processedQuestion) {
    const timestamp = new Date().toISOString();
    
    return `<format_for_big_llm>
<metadata>
  <timestamp>${timestamp}</timestamp>
  <source>voice_transcription</source>
  <context>technical_interview_assistant</context>
</metadata>

<processed_question>
${processedQuestion}
</processed_question>

<original_transcription>
${transcribedText}
</original_transcription>

<instructions>
Please provide a comprehensive, well-structured answer to the processed question above.
The original transcription is provided for additional context.
Focus on accuracy, clarity, and practical applicability.
If the question involves code, provide clear examples with explanations.
</instructions>
</format_for_big_llm>`;
  }

  /**
   * Switch to different LLM platform
   */
  switchPlatform(platformName) {
    if (!this.supportedPlatforms[platformName]) {
      throw new Error(`Unsupported platform: ${platformName}`);
    }
    
    this.currentModel = platformName;
    logger.info('Switched LLM platform', { platform: platformName });
    
    // Close current page to force reload on next request
    if (this.page && !this.page.isClosed()) {
      this.page.close();
      this.page = null;
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      currentPlatform: this.currentModel,
      browserOpen: !!this.browser,
      pageOpen: !!this.page && !this.page?.isClosed(),
      supportedPlatforms: Object.keys(this.supportedPlatforms)
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    try {
      if (this.page && !this.page.isClosed()) {
        await this.page.close();
      }
      
      if (this.browser) {
        await this.browser.close();
      }
      
      this.isConnected = false;
      logger.info('Browser LLM service cleaned up');
    } catch (error) {
      logger.error('Cleanup error', { error: error.message });
    }
  }
}

module.exports = new BrowserLLMService();
