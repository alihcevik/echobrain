import { EventEmitter } from "eventemitter3";
import { GoogleGenAI, Modality } from '@google/genai';
import { base64ToArrayBuffer, arrayBufferToBase64 } from "@/util/converters";

// WARNING: In production, use ephemeral tokens instead of an API key, as using API keys is not safe.
// For more information, refer to https://ai.google.dev/docs
const API_KEY = process.env.GEMINI_API_KEY;


class GeminiLiveClient extends EventEmitter {
  static instance = null;

  constructor() {
    super();
    if (GeminiLiveClient.instance) {
      console.log("⚠️ Returning existing GeminiLiveClient instance");
      return GeminiLiveClient.instance;
    }
    console.log("🆕 Creating new GeminiLiveClient instance");
    GeminiLiveClient.instance = this;
    
    this.client = null;
    this.session = null;
    this.isStreaming = false;
    this.responseQueue = [];
    this.audioQueue = [];
    this.isSendingAudio = false;
    this.accumulatedBuffer = new Uint8Array(0);
    this.chunkSize = 4096;
    this._sessionReady = false;
    this.instanceId = Math.random().toString(36).substring(7);
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
    this.reconnectDelay = 1000; // Start with 1 second delay
    
  }

  get sessionReady() {
    return this._sessionReady;
  }

  set sessionReady(value) {
    console.log(`[${this.instanceId}] sessionReady changing from ${this._sessionReady} to ${value}`, new Error().stack);
    this._sessionReady = value;
  }

  async waitMessage() {
    let done = false;
    let message = undefined;
    while (!done) {
      message = this.responseQueue.shift();
      if (message) {
        console.debug('Received message:', message);
        done = true;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
    return message;
  }

  async handleTurn() {
    const turn = [];
    let done = false;
    while (!done) {
      const message = await this.waitMessage();
      turn.push(message);
      if (message.serverContent && message.serverContent.turnComplete) {
        done = true;
      }
    }
  }

  sendText(text) {
    if (!this.session || !this.sessionReady) {
      console.warn("⚠️ Session not ready, cannot send text.");
      return;
    }

    try {
      this.session.sendClientContent({
        turns: [{ role: "user", parts: [{ text }] }],
        turnComplete: true,
      });
      console.log("📨 Sent text message to Gemini:", text);
    } catch (error) {
      console.error("Error sending text:", error);
    }
  }

  async _processQueuedAudio() {

    if (!this.session || !this.sessionReady) {
      return;
    }

    while (this.audioQueue.length > 0) {
      const chunk = this.audioQueue.shift();
      await this.sendAudioChunk(chunk);
    }
  }

  async connect(config) {
    console.log(`[${this.instanceId}] connect called`);
    return new Promise(async (resolve, reject) => {
      if (this.isStreaming) {
        console.warn(`[${this.instanceId}] ⚠️ Already connected to Gemini.`);
        return resolve();
      }

      if (!API_KEY) {
        console.error(`[${this.instanceId}] Missing API key! Check .env file.`);
        return reject("Missing API key");
      }

      console.log(`[${this.instanceId}] connecting to Gemini`);

      try {
        this.client = new GoogleGenAI({
          apiKey: API_KEY,
        });

        console.log(`[${this.instanceId}] Creating session calling connect`);
        this.session = await this.client.live.connect({
          model: "gemini-2.0-flash-live-001",
          callbacks: {
            onopen: async () => {
              console.log(`[${this.instanceId}] onopen`);
              console.debug(`[${this.instanceId}] Opened`);
              this.isStreaming = true;
              this.sessionReady = true;
              this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
              console.log(`[${this.instanceId}] Session ready`);
              resolve();
            },
            onmessage: (message) => {
              console.debug(`[${this.instanceId}] Received message:`, message);
              console.log(`[${this.instanceId}] Session ready`, this.sessionReady);
              this.responseQueue.push(message);
              this._handleMessage(message);
            },
            onerror: (e) => {
              console.debug(`[${this.instanceId}] Error:`, e.message);
              this.sessionReady = false;
              this._handleConnectionError(e);
              reject(e);
            },
            onclose: (e) => {
              console.debug(`[${this.instanceId}] Close:`, e.reason);
              this.isStreaming = false;
              this.sessionReady = false;
              this._handleConnectionClose(e);
            },
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: config.systemInstruction,
            speechConfig: config.speechConfig,
            tools: config.tools,
          },
        });
      } catch (error) {
        console.error(`[${this.instanceId}] Error connecting to Gemini:`, error);
        this.sessionReady = false;
        this._handleConnectionError(error);
        reject(error);
      }
    });
  }

  disconnect() {
    console.log(`[${this.instanceId}] disconnect called`);
    if (this.session) {
      console.log(`[${this.instanceId}] 🔌 Closing Gemini session...`);
      this.sessionReady = false;
      this.session.close();
      this.isStreaming = false;

    }
  }

  _concatenateBuffers(buffer1, buffer2) {
    const view1 = new Uint8Array(buffer1);
    const view2 = new Uint8Array(buffer2);

    let newBuffer = new Uint8Array(view1.length + view2.length);
    newBuffer.set(view1, 0);
    newBuffer.set(view2, view1.length);
    
    return newBuffer;
  }

  async sendAudioChunk(pcmBuffer) {
    if (!this.session || !this.sessionReady) {
      console.warn(`[${this.instanceId}] ⚠️ Session not ready, queuing audio chunk...`);
      this.audioQueue.push(pcmBuffer);
      return;
    }

    try {
      const base64Output = arrayBufferToBase64(pcmBuffer);
      console.log(`[${this.instanceId}] sending audio chunk directly`);
      
      try {
        await this.session.sendRealtimeInput({               
          audio: {
            data: base64Output,
            mimeType: "audio/pcm;rate=16000"
          }
        });
      } catch (error) {
        console.error(`[${this.instanceId}] Error in sendClientContent:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`[${this.instanceId}] Error sending audio chunk:`, error);
      this.sessionReady = false;
      this._handleConnectionError(error);
    }
  }

  _handleMessage(message) {
    try {
      if (message.setupComplete) {
        this.emit("setupcomplete");
        console.log(`[${this.instanceId}] setupcomplete emitting`);
        return;
      }

      if (message.toolCall) {
        console.log(`[${this.instanceId}] server.toolCall`, message);
        this.emit("toolcall", message.toolCall);
        return;
      }
      
      if (message.serverContent) {
        const { serverContent } = message;

        if (serverContent.interrupted) {
          console.log(`[${this.instanceId}] ⚠️ Response interrupted.`);
          this.emit("interrupted");
          return;
        }

        if (serverContent.turnComplete) {
          console.log(`[${this.instanceId}] Turn complete.`);
          this.emit("turncomplete");
        }

        if (serverContent.modelTurn?.parts) {
          const audioParts = serverContent.modelTurn.parts.filter(
            (p) => p.inlineData && p.inlineData.mimeType.startsWith("audio/pcm")
          );
          
          audioParts.forEach((p) => {
            if (p.inlineData?.data) {
              const audioBuffer = base64ToArrayBuffer(p.inlineData.data);
              this.emit("audio", audioBuffer);
            }
          });
        }
      }
    } catch (err) {
      console.error(`[${this.instanceId}] Error handling message:`, err);
    }
  }

  async _handleConnectionError(error) {
    console.error(`[${this.instanceId}] Connection error:`, error);
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`[${this.instanceId}] Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect(this.lastConfig).catch(err => {
          console.error(`[${this.instanceId}] Reconnection failed:`, err);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error(`[${this.instanceId}] Max reconnection attempts reached`);
      this.emit('error', new Error('Max reconnection attempts reached'));
    }
  }

  _handleConnectionClose(event) {
    console.log(`[${this.instanceId}] Connection closed:`, event.reason);
    console.log(event);
    if (event.wasClean) {
      console.log(`[${this.instanceId}] Connection closed cleanly`);
    } else {
      console.error(`[${this.instanceId}] Connection died`);
      this._handleConnectionError(new Error('Connection died'));
    }
  }
}

export default GeminiLiveClient;