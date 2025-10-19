/**
 * WebSocket client for realtime interview communication.
 */

import { EventEmitter } from 'events';
import {
  ServerMessage,
  ClientMessage,
  TranscriptMessage,
  TTSChunkMessage,
  AnswerEndMessage,
  NoticeMessage,
  ErrorMessage,
  MetricsMessage,
  SessionReadyMessage,
} from '../types/interview';

export class WebSocketClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start at 1 second
  private isConnecting = false;
  private shouldReconnect = true;

  constructor(url: string) {
    super();
    this.url = url;
  }

  /**
   * Connect to WebSocket server.
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        reject(new Error('Connection already in progress'));
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.emit('error', error);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket closed:', event.code, event.reason);
          this.isConnecting = false;
          this.emit('disconnected');

          // Attempt reconnection if appropriate
          if (
            this.shouldReconnect &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.attemptReconnect();
          }
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect with exponential backoff.
   */
  private attemptReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`
    );

    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  /**
   * Handle incoming WebSocket message.
   */
  private handleMessage(data: string): void {
    try {
      const message: ServerMessage = JSON.parse(data);

      // Emit generic message event
      this.emit('message', message);

      // Emit specific event based on message type
      switch (message.event) {
        case 'session_ready':
          this.emit('session_ready', message as SessionReadyMessage);
          break;
        case 'transcript':
          this.emit('transcript', message as TranscriptMessage);
          break;
        case 'tts_chunk':
          this.emit('tts_chunk', message as TTSChunkMessage);
          break;
        case 'answer_end':
          this.emit('answer_end', message as AnswerEndMessage);
          break;
        case 'notice':
          this.emit('notice', message as NoticeMessage);
          break;
        case 'error':
          this.emit('error_message', message as ErrorMessage);
          break;
        case 'metrics':
          this.emit('metrics', message as MetricsMessage);
          break;
        default:
          console.warn('Unknown message type:', message);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  /**
   * Send message to server.
   */
  send(message: ClientMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Close WebSocket connection.
   */
  close(): void {
    this.shouldReconnect = false;

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if WebSocket is connected.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
