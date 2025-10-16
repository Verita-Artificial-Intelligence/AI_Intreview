import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AudioInterviewPage from '@/pages/AudioInterviewPage';
import axios from 'axios';

jest.mock('axios');

const mockStream = {
  getTracks: () => [{ stop: jest.fn() }],
};

class MockMediaRecorder {
  constructor(stream) {
    this.stream = stream;
    this.ondataavailable = null;
    this.onstop = null;
  }

  start() {
    this.started = true;
  }

  stop() {
    if (this.ondataavailable) {
      this.ondataavailable({ data: new Blob(['data'], { type: 'audio/webm' }) });
    }
    if (this.onstop) {
      this.onstop();
    }
  }
}

beforeAll(() => {
  global.navigator.mediaDevices = {
    getUserMedia: jest.fn().mockResolvedValue(mockStream),
  };

  global.MediaRecorder = MockMediaRecorder;
  global.alert = jest.fn();
  Object.defineProperty(window, 'Audio', {
    writable: true,
    value: jest.fn(() => ({
      play: jest.fn().mockResolvedValue(),
      onended: null,
    })),
  });
});

beforeEach(() => {
  jest.clearAllMocks();
  process.env.REACT_APP_BACKEND_URL = 'http://localhost:8000';

  axios.get.mockResolvedValueOnce({
    data: {
      id: 'interview-1',
      candidate_name: 'Alex Test',
      position: 'Frontend Engineer',
      status: 'in_progress',
      timestamp: new Date().toISOString(),
    },
  });

  axios.get.mockResolvedValueOnce({
    data: [
      {
        id: 'msg-1',
        role: 'assistant',
        content: 'Welcome!',
        timestamp: new Date().toISOString(),
      },
    ],
  });

  axios.get.mockResolvedValueOnce({
    data: {
      name: 'Dr. Sarah Chen',
      title: 'Senior Technical Recruiter',
    },
  });

  axios.post.mockResolvedValue({ data: { audio_url: 'data:audio/mpeg;base64,ZmFrZQ==', message: 'Stub answer' } });
});

const renderComponent = () =>
  render(
    <MemoryRouter initialEntries={[`/audio-interview/interview-1`]}>
      <Routes>
        <Route path="/audio-interview/:interviewId" element={<AudioInterviewPage />} />
      </Routes>
    </MemoryRouter>
  );

test('renders interview details and persona', async () => {
  renderComponent();

  expect(await screen.findByText(/Voice Interview with Alex Test/i)).toBeInTheDocument();
  expect(screen.getByText('Welcome!')).toBeInTheDocument();
  expect(screen.getByText(/Dr. Sarah Chen/)).toBeInTheDocument();
});

test('allows user to start recording', async () => {
  renderComponent();

  const startButton = await screen.findByTestId('start-recording-button');
  fireEvent.click(startButton);

  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
  expect(await screen.findByTestId('stop-recording-button')).toBeInTheDocument();
});

test('processes audio response when recording stops', async () => {
  axios.post
    .mockResolvedValueOnce({ data: { transcribed_text: 'I am great' } })
    .mockResolvedValueOnce({ data: { message: 'Tell me about yourself' } })
    .mockResolvedValueOnce({ data: { audio_url: 'data:audio/mpeg;base64,ZmFrZQ==' } });

  renderComponent();

  const startButton = await screen.findByTestId('start-recording-button');
  fireEvent.click(startButton);

  const stopButton = await screen.findByTestId('stop-recording-button');
  fireEvent.click(stopButton);

  await waitFor(() => {
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/audio/stt'),
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } }),
    );
    expect(screen.getByText('I am great')).toBeInTheDocument();
    expect(screen.getByText('Tell me about yourself')).toBeInTheDocument();
  });
});

