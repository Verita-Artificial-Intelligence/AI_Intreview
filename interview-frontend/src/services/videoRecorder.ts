/**
 * Video recorder service for capturing and uploading interview recordings.
 */

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private sessionId: string | null = null;
  private interviewId: string | null = null;

  /**
   * Start recording video.
   */
  public async startRecording(
    stream: MediaStream,
    sessionId: string,
    interviewId?: string
  ): Promise<void> {
    this.sessionId = sessionId;
    this.interviewId = interviewId || null;
    this.recordedChunks = [];

    try {
      // Choose codec
      const options = { mimeType: 'video/webm;codecs=vp9' };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options.mimeType = 'video/webm';
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options.mimeType = 'video/webm;codecs=vp8';
        }
      }

      this.mediaRecorder = new MediaRecorder(stream, options);

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.uploadRecording();
      };

      // Capture data every second
      this.mediaRecorder.start(1000);

      console.log('Video recording started');
    } catch (error) {
      console.error('Error starting video recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording.
   */
  public stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
    }
  }

  /**
   * Upload recorded video to backend.
   */
  private async uploadRecording(): Promise<void> {
    if (this.recordedChunks.length === 0) {
      console.warn('No recorded data to upload');
      return;
    }

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    console.log('Recording complete:', blob.size, 'bytes');

    // Create FormData for upload
    const formData = new FormData();
    formData.append('video', blob, `interview-${this.sessionId}.webm`);
    formData.append('session_id', this.sessionId || '');
    if (this.interviewId) {
      formData.append('interview_id', this.interviewId);
    }

    try {
      const response = await fetch(`${BACKEND_URL}/api/interviews/upload-video`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Video uploaded successfully:', result);
    } catch (error) {
      console.error('Error uploading video:', error);
      // Save locally as fallback
      this.downloadLocally(blob);
    }
  }

  /**
   * Download recording locally as fallback.
   */
  private downloadLocally(blob: Blob): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `interview-${this.sessionId}-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
    console.log('Video saved locally');
  }

  /**
   * Get current recording state.
   */
  public isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}
