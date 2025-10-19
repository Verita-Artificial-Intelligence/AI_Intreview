/**
 * Audio capture service for microphone input.
 * Captures audio at 48kHz, downsamples to 24kHz PCM16, and chunks into fixed-size frames.
 */

export class AudioCapture {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isCapturing = false;
  private seq = 0;

  private readonly TARGET_SAMPLE_RATE = 24000; // 24kHz for OpenAI Realtime
  private readonly CHUNK_DURATION_MS = 100; // 100ms chunks
  private readonly BUFFER_SIZE = 4096; // ScriptProcessorNode buffer size

  private onChunkCallback: ((seq: number, audioB64: string) => void) | null = null;

  /**
   * Request microphone permission and initialize audio context.
   */
  async initialize(stream: MediaStream): Promise<void> {
    try {
      this.mediaStream = stream;

      // Create audio context
      this.audioContext = new AudioContext({ sampleRate: 48000 });

      console.log('Audio capture initialized:', {
        sampleRate: this.audioContext.sampleRate,
        state: this.audioContext.state,
      });
    } catch (error) {
      console.error('Failed to initialize audio capture:', error);
      throw error;
    }
  }

  /**
   * Start capturing audio and emitting chunks.
   */
  start(onChunk: (seq: number, audioB64: string) => void): void {
    if (!this.audioContext || !this.mediaStream) {
      throw new Error('Audio capture not initialized');
    }

    if (this.isCapturing) {
      console.warn('Already capturing audio');
      return;
    }

    this.onChunkCallback = onChunk;
    this.isCapturing = true;
    this.seq = 0;

    // Create source from microphone
    this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create script processor for audio processing
    this.processorNode = this.audioContext.createScriptProcessor(
      this.BUFFER_SIZE,
      1, // mono input
      1  // mono output
    );

    let audioBuffer: Float32Array[] = [];
    const samplesPerChunk = (this.TARGET_SAMPLE_RATE * this.CHUNK_DURATION_MS) / 1000;

    this.processorNode.onaudioprocess = (event) => {
      if (!this.isCapturing) return;

      const inputData = event.inputBuffer.getChannelData(0);

      // Downsample from 48kHz to 24kHz (2:1 ratio)
      const downsampled = this.downsample(inputData, 48000, this.TARGET_SAMPLE_RATE);

      // Add to buffer
      audioBuffer.push(downsampled);

      // Calculate total samples in buffer
      const totalSamples = audioBuffer.reduce((sum, chunk) => sum + chunk.length, 0);

      // If we have enough samples for a chunk, send it
      if (totalSamples >= samplesPerChunk) {
        // Merge buffer
        const merged = this.mergeFloat32Arrays(audioBuffer);

        // Extract chunk
        const chunk = merged.slice(0, samplesPerChunk);

        // Keep remainder
        if (merged.length > samplesPerChunk) {
          audioBuffer = [merged.slice(samplesPerChunk)];
        } else {
          audioBuffer = [];
        }

        // Convert to PCM16 and base64
        const pcm16 = this.floatToPCM16(chunk);
        const base64 = this.arrayBufferToBase64(pcm16.buffer);

        // Emit chunk
        if (this.onChunkCallback) {
          this.onChunkCallback(this.seq++, base64);
        }
      }
    };

    // Connect nodes
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    console.log('Audio capture started');
  }

  /**
   * Stop capturing audio.
   */
  stop(): void {
    this.isCapturing = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    console.log('Audio capture stopped');
  }

  /**
   * Clean up resources.
   */
  dispose(): void {
    this.stop();

    // Do not stop the tracks of the stream, as it's shared
    this.mediaStream = null;

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    console.log('Audio capture disposed');
  }

  /**
   * Downsample audio from source sample rate to target sample rate.
   */
  private downsample(
    buffer: Float32Array,
    sourceSampleRate: number,
    targetSampleRate: number
  ): Float32Array {
    if (sourceSampleRate === targetSampleRate) {
      return buffer;
    }

    const ratio = sourceSampleRate / targetSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);

    for (let i = 0; i < newLength; i++) {
      const sourceIndex = i * ratio;
      const index = Math.floor(sourceIndex);
      const fraction = sourceIndex - index;

      // Linear interpolation
      if (index + 1 < buffer.length) {
        result[i] = buffer[index] * (1 - fraction) + buffer[index + 1] * fraction;
      } else {
        result[i] = buffer[index];
      }
    }

    return result;
  }

  /**
   * Convert Float32 audio to PCM16 (Int16).
   */
  private floatToPCM16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);

    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1]
      const clamped = Math.max(-1, Math.min(1, float32Array[i]));
      // Scale to 16-bit integer range
      int16Array[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    return int16Array;
  }

  /**
   * Merge multiple Float32Arrays into one.
   */
  private mergeFloat32Arrays(arrays: Float32Array[]): Float32Array {
    const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
    const result = new Float32Array(totalLength);

    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }

    return result;
  }

  /**
   * Convert ArrayBuffer to base64 string.
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Check if audio capture is currently active.
   */
  isActive(): boolean {
    return this.isCapturing;
  }
}
