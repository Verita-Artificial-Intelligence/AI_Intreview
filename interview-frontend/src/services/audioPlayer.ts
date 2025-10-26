/**
 * Audio playback service using Web Audio API.
 * Receives MP3 chunks, decodes them, and plays with precise timing for lip sync.
 */

export class AudioPlayer {
  private audioContext: AudioContext | null = null
  private nextStartTime = 0
  private isPlaying = false
  private audioQueue: AudioBuffer[] = []
  private currentPlaybackTime = 0
  private startTimestamp = 0
  private contextCreatedAt = 0

  private onPlaybackStartCallback: (() => void) | null = null
  private onPlaybackEndCallback: (() => void) | null = null

  /**
   * Initialize audio context.
   */
  async initialize(): Promise<void> {
    this.audioContext = new AudioContext()
    this.contextCreatedAt = performance.now() / 1000

    // Resume context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }

    console.log('Audio player initialized:', {
      sampleRate: this.audioContext.sampleRate,
      state: this.audioContext.state,
    })
  }

  /**
   * Queue and play audio chunk.
   */
  async playChunk(
    audioB64: string,
    options?: {
      seq?: number
      onScheduled?: (info: {
        seq?: number
        startTime: number
        duration: number
      }) => void
    }
  ): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio player not initialized')
    }

    try {
      // Decode base64 to ArrayBuffer
      const audioData = this.base64ToArrayBuffer(audioB64)

      // Skip empty audio chunks (mock mode)
      if (audioData.byteLength === 0) {
        console.log('Skipping empty audio chunk (mock mode)')

        // Trigger playback callbacks even without audio
        if (!this.isPlaying) {
          this.isPlaying = true
          this.nextStartTime = this.audioContext.currentTime
          this.startTimestamp = this.nextStartTime
          this.currentPlaybackTime = 0

          if (this.onPlaybackStartCallback) {
            this.onPlaybackStartCallback()
          }
        }
        return
      }

      // Convert PCM16 audio data to AudioBuffer
      // OpenAI Realtime API sends raw PCM16 at 24kHz mono
      const audioBuffer = this.pcm16ToAudioBuffer(audioData, 24000, 1)

      // If not playing yet, start playback
      if (!this.isPlaying) {
        this.isPlaying = true
        this.nextStartTime = this.audioContext.currentTime + 0.1 // Small lookahead
        this.startTimestamp = this.nextStartTime
        this.currentPlaybackTime = 0

        if (this.onPlaybackStartCallback) {
          this.onPlaybackStartCallback()
        }
      }

      // Create source node
      const source = this.audioContext.createBufferSource()
      source.buffer = audioBuffer

      const scheduledStart = this.nextStartTime

      // Check AudioContext state
      if (this.audioContext.state === 'suspended') {
        console.warn('AudioContext suspended, resuming...')
        await this.audioContext.resume()
      }

      console.log('Playing AI audio chunk:', {
        duration: audioBuffer.duration,
        contextState: this.audioContext.state,
        nextStartTime: this.nextStartTime,
      })

      // Connect to speakers only (audio mixing now handled server-side)
      source.connect(this.audioContext.destination)

      // Schedule playback
      source.start(scheduledStart)

      if (options?.onScheduled) {
        options.onScheduled({
          seq: options.seq,
          startTime: scheduledStart,
          duration: audioBuffer.duration,
        })
      }

      // Update next start time
      this.nextStartTime += audioBuffer.duration

      // Handle source end
      source.onended = () => {
        // Check if this was the last chunk
        if (
          this.audioContext &&
          this.nextStartTime <= this.audioContext.currentTime + 0.1
        ) {
          this.handlePlaybackEnd()
        }
      }
    } catch (error) {
      console.error('Error playing audio chunk:', error)
      throw error
    }
  }

  /**
   * Handle playback end.
   */
  private handlePlaybackEnd(): void {
    this.isPlaying = false
    this.currentPlaybackTime = 0
    this.startTimestamp = 0

    if (this.onPlaybackEndCallback) {
      this.onPlaybackEndCallback()
    }
  }

  /**
   * Get current playback time relative to start of speech.
   * This is used for syncing visemes.
   */
  getCurrentPlaybackTime(): number {
    if (!this.audioContext || !this.isPlaying) {
      return 0
    }

    return this.audioContext.currentTime - this.startTimestamp
  }

  /**
   * Check if audio is currently playing.
   */
  isCurrentlyPlaying(): boolean {
    return this.isPlaying
  }

  /**
   * Stop all audio playback.
   */
  stop(): void {
    if (this.audioContext) {
      // We can't stop individual sources after they've started,
      // but we can disconnect and reset state
      this.isPlaying = false
      this.nextStartTime = 0
      this.currentPlaybackTime = 0
      this.startTimestamp = 0
      this.audioQueue = []
    }

    if (this.onPlaybackEndCallback) {
      this.onPlaybackEndCallback()
    }
  }

  /**
   * Set callback for when playback starts.
   */
  onPlaybackStart(callback: () => void): void {
    this.onPlaybackStartCallback = callback
  }

  /**
   * Set callback for when playback ends.
   */
  onPlaybackEnd(callback: () => void): void {
    this.onPlaybackEndCallback = callback
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.stop()

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close()
      this.audioContext = null
    }

    console.log('Audio player disposed')
  }

  /**
   * Convert base64 string to ArrayBuffer.
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return bytes.buffer
  }

  /**
   * Convert PCM16 raw audio data to AudioBuffer.
   * PCM16 is 16-bit signed integer little-endian audio.
   */
  private pcm16ToAudioBuffer(
    arrayBuffer: ArrayBuffer,
    sampleRate: number,
    channels: number
  ): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized')
    }

    // PCM16 is 16-bit (2 bytes per sample)
    const int16Array = new Int16Array(arrayBuffer)
    const numSamples = int16Array.length

    // Create AudioBuffer
    const audioBuffer = this.audioContext.createBuffer(
      channels,
      numSamples,
      sampleRate
    )

    // Convert Int16 samples to Float32 range [-1, 1]
    const channelData = audioBuffer.getChannelData(0)
    for (let i = 0; i < numSamples; i++) {
      channelData[i] = int16Array[i] / 32768.0 // Convert to float range
    }

    return audioBuffer
  }

  /**
   * Get audio context time (for external synchronization).
   */
  getAudioContextTime(): number {
    return this.audioContext?.currentTime || 0
  }

  /**
   * Convert AudioContext time to wall clock seconds.
   */
  getWallTimeForContextTime(contextTime: number): number {
    return this.contextCreatedAt + contextTime
  }
}
