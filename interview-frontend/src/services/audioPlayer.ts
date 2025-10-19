/**
 * Audio playback service using Web Audio API.
 * Receives MP3 chunks, decodes them, and plays with precise timing for lip sync.
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private isPlaying = false;
  private audioQueue: AudioBuffer[] = [];
  private currentPlaybackTime = 0;
  private startTimestamp = 0;

  private onPlaybackStartCallback: (() => void) | null = null;
  private onPlaybackEndCallback: (() => void) | null = null;

  /**
   * Initialize audio context.
   */
  async initialize(): Promise<void> {
    this.audioContext = new AudioContext();

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    console.log('Audio player initialized:', {
      sampleRate: this.audioContext.sampleRate,
      state: this.audioContext.state,
    });
  }

  /**
   * Queue and play audio chunk.
   */
  async playChunk(audioB64: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio player not initialized');
    }

    try {
      // Decode base64 to ArrayBuffer
      const audioData = this.base64ToArrayBuffer(audioB64);

      // Decode audio data (MP3)
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);

      // If not playing yet, start playback
      if (!this.isPlaying) {
        this.isPlaying = true;
        this.nextStartTime = this.audioContext.currentTime + 0.1; // Small lookahead
        this.startTimestamp = this.nextStartTime;
        this.currentPlaybackTime = 0;

        if (this.onPlaybackStartCallback) {
          this.onPlaybackStartCallback();
        }
      }

      // Create source node
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);

      // Schedule playback
      source.start(this.nextStartTime);

      // Update next start time
      this.nextStartTime += audioBuffer.duration;

      // Handle source end
      source.onended = () => {
        // Check if this was the last chunk
        if (this.audioContext && this.nextStartTime <= this.audioContext.currentTime + 0.1) {
          this.handlePlaybackEnd();
        }
      };
    } catch (error) {
      console.error('Error playing audio chunk:', error);
      throw error;
    }
  }

  /**
   * Handle playback end.
   */
  private handlePlaybackEnd(): void {
    this.isPlaying = false;
    this.currentPlaybackTime = 0;
    this.startTimestamp = 0;

    if (this.onPlaybackEndCallback) {
      this.onPlaybackEndCallback();
    }
  }

  /**
   * Get current playback time relative to start of speech.
   * This is used for syncing visemes.
   */
  getCurrentPlaybackTime(): number {
    if (!this.audioContext || !this.isPlaying) {
      return 0;
    }

    return this.audioContext.currentTime - this.startTimestamp;
  }

  /**
   * Check if audio is currently playing.
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Stop all audio playback.
   */
  stop(): void {
    if (this.audioContext) {
      // We can't stop individual sources after they've started,
      // but we can disconnect and reset state
      this.isPlaying = false;
      this.nextStartTime = 0;
      this.currentPlaybackTime = 0;
      this.startTimestamp = 0;
      this.audioQueue = [];
    }

    if (this.onPlaybackEndCallback) {
      this.onPlaybackEndCallback();
    }
  }

  /**
   * Set callback for when playback starts.
   */
  onPlaybackStart(callback: () => void): void {
    this.onPlaybackStartCallback = callback;
  }

  /**
   * Set callback for when playback ends.
   */
  onPlaybackEnd(callback: () => void): void {
    this.onPlaybackEndCallback = callback;
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.stop();

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('Audio player disposed');
  }

  /**
   * Convert base64 string to ArrayBuffer.
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
  }

  /**
   * Get audio context time (for external synchronization).
   */
  getAudioContextTime(): number {
    return this.audioContext?.currentTime || 0;
  }
}
