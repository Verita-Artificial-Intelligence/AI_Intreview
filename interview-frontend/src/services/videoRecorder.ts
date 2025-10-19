/**
 * Video recorder service for capturing and uploading interview recordings.
 */

import { getAuthToken } from '../utils/auth.js';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8000';

export class VideoRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  async startRecording(
    stream: MediaStream,
    sessionId: string,
    interviewId: string
  ): Promise<void> {
    this.stream = stream;
    
    // Filter for video tracks only for recording
    const videoStream = new MediaStream(stream.getVideoTracks());

    this.mediaRecorder = new MediaRecorder(videoStream, {
      mimeType: 'video/webm; codecs=vp9',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.onstop = () => {
      this.uploadVideo(sessionId, interviewId);
    };

    this.mediaRecorder.start();
    console.log('Video recording started');
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.stop();
      console.log('Video recording stopped');
    }
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
