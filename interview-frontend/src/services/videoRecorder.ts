/**
 * Video recorder service for capturing and uploading interview recordings.
 * Captures user video + user audio + AI audio mixed together.
 */

import { getAuthToken } from '../utils/auth.js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private combinedStream: MediaStream | null = null;
  private uploadPromise: Promise<void> | null = null;

  async startRecording(
    userStream: MediaStream,
    sessionId: string,
    interviewId: string
  ): Promise<void> {
    console.log('=== Starting Video Recording (Video-Only) ===');

    // Get video from user camera
    const videoTracks = userStream.getVideoTracks();
    console.log('Video tracks:', videoTracks.length);

    // Create video-only stream (audio mixing handled server-side)
    this.combinedStream = new MediaStream(videoTracks);

    console.log('Video-only stream created:', {
      videoTracks: this.combinedStream.getVideoTracks().length,
      audioTracks: this.combinedStream.getAudioTracks().length,
      totalTracks: this.combinedStream.getTracks().length,
    });

    // Choose codec (video-only, no audio codec needed)
    let mimeType = 'video/webm; codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      console.log('Falling back to default webm');
    }

    this.mediaRecorder = new MediaRecorder(this.combinedStream, {
      mimeType,
      videoBitsPerSecond: 2500000,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        console.log(`Chunk received: ${event.data.size} bytes`);
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
    };

    this.mediaRecorder.onstart = () => {
      console.log('MediaRecorder started');
    };

    this.mediaRecorder.onstop = () => {
      console.log(`Recording stopped. Total chunks: ${this.recordedChunks.length}`);
      const totalSize = this.recordedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log(`Total size: ${totalSize} bytes`);

      // Start upload and store promise
      this.uploadPromise = this.uploadVideo(sessionId, interviewId)
        .then(() => {
          console.log('Upload completed, cleaning up');
          this.cleanup();
        })
        .catch((error) => {
          console.error('Upload failed:', error);
          this.cleanup();
        });
    };

    // Start recording with 1-second chunks
    this.mediaRecorder.start(1000);
    console.log('MediaRecorder started:', {
      state: this.mediaRecorder.state,
      mimeType,
    });
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      console.log('Video recording stopped');
    }
  }

  /**
   * Wait for any pending upload to complete.
   */
  async waitForUpload(): Promise<void> {
    if (this.uploadPromise) {
      console.log('Waiting for video upload to complete...');
      await this.uploadPromise;
      this.uploadPromise = null;
    }
  }

  private cleanup(): void {
    // Stop combined stream tracks
    if (this.combinedStream) {
      this.combinedStream.getTracks().forEach((track) => track.stop());
      this.combinedStream = null;
    }

    console.log('VideoRecorder cleaned up');
  }

  private async uploadVideo(sessionId: string, interviewId: string): Promise<void> {
    if (this.recordedChunks.length === 0) {
      console.warn('No video data to upload');
      return;
    }

    const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
    this.recordedChunks = [];

    const formData = new FormData();
    formData.append('video', blob, `interview_${interviewId}.webm`);
    formData.append('session_id', sessionId);
    formData.append('interview_id', interviewId);

    try {
        const token = getAuthToken();
        const response = await fetch(`${BACKEND_URL}/api/interviews/upload/video`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Video uploaded successfully:', result);
    } catch (error) {
      console.error('Error uploading video:', error);
    }
  }
}
