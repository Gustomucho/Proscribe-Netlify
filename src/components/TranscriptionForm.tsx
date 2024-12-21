import { useState, useRef } from 'react';
import type { FormEvent } from 'react';

const API_BASE_URL = import.meta.env.PROD 
  ? 'https://your-heroku-app.herokuapp.com/api'
  : 'http://localhost:8000/api';

interface TranscriptionResponse {
  transcription: {
    id: string;
    duration: number;
  };
  price?: number;
  error?: string;
}

export default function TranscriptionForm() {
  const [currentTranscriptionId, setCurrentTranscriptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showDownloadButtons, setShowDownloadButtons] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);

  const showStatusMessage = (message: string, type: 'success' | 'error') => {
    setStatus({ message, type });
  };

  const handleFileUpload = async (e: FormEvent) => {
    e.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    
    if (!file) {
      showStatusMessage('Please select an audio file', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('audio_file', file);
    formData.append('email', 'temp@temp.com');

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/transcriptions/`, {
        method: 'POST',
        body: formData,
      });

      const data: TranscriptionResponse = await response.json();
      
      if (response.ok) {
        setCurrentTranscriptionId(data.transcription.id);
        const duration = Math.round(data.transcription.duration * 10) / 10;
        const price = data.price ? `\nEstimated Price: $${data.price}` : '';
        showStatusMessage(`Audio Duration: ${duration} minutes${price}`, 'success');
        setShowEmailForm(true);
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showStatusMessage('Error uploading file. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const email = emailInputRef.current?.value;
    
    if (!email) {
      showStatusMessage('Please enter your email address', 'error');
      return;
    }

    try {
      setLoading(true);
      // First update the email
      const updateEmailResponse = await fetch(
        `${API_BASE_URL}/transcriptions/${currentTranscriptionId}/update_email/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      if (!updateEmailResponse.ok) {
        throw new Error('Failed to update email');
      }

      // Then start transcription
      const response = await fetch(
        `${API_BASE_URL}/transcriptions/${currentTranscriptionId}/start_transcription/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to start transcription');
      }

      showStatusMessage('Transcription started! You will receive an email when it\'s ready.', 'success');
      startPollingTranscriptionStatus();
    } catch (error) {
      showStatusMessage(`Error starting transcription: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const startPollingTranscriptionStatus = () => {
    showStatusMessage('Processing your audio file...', 'success');
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `${API_BASE_URL}/transcriptions/${currentTranscriptionId}/`
        );
        const data = await response.json();

        if (data.status === 'completed') {
          clearInterval(pollInterval);
          showStatusMessage('Transcription completed! Check your email for the results.', 'success');
          setShowDownloadButtons(true);
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          showStatusMessage('Transcription failed. Please try again.', 'error');
        } else if (data.status === 'processing') {
          showStatusMessage('Processing your audio file... This may take a few minutes.', 'success');
        }
      } catch (error) {
        clearInterval(pollInterval);
        showStatusMessage('Error checking transcription status', 'error');
      }
    }, 5000);
  };

  return (
    <div>
      <form onSubmit={handleFileUpload} className="mb-6">
        <div className="mb-4">
          <label htmlFor="audio-file" className="block font-medium mb-2">
            Audio File (MP3, WAV, M4A, FLAC):
          </label>
          <input
            type="file"
            id="audio-file"
            ref={fileInputRef}
            accept=".mp3,.wav,.m4a,.flac"
            required
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 disabled:bg-gray-400"
        >
          Get Quote
        </button>
      </form>

      {loading && <div className="loading">Processing</div>}

      {status && (
        <div className={`p-4 rounded mb-4 ${
          status.type === 'success' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        }`}>
          {status.message}
        </div>
      )}

      {showEmailForm && (
        <form onSubmit={handleEmailSubmit} className="mt-6 p-4 border rounded">
          <div className="mb-4">
            <label htmlFor="email" className="block font-medium mb-2">
              Email Address:
            </label>
            <input
              type="email"
              id="email"
              ref={emailInputRef}
              required
              className="w-full p-2 border rounded"
            />
            <p className="text-sm text-gray-600 mt-1">
              We'll send your transcription to this email address when it's ready.
            </p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 disabled:bg-gray-400"
          >
            Start Transcription
          </button>
        </form>
      )}

      {showDownloadButtons && currentTranscriptionId && (
        <div className="mt-6 space-x-4">
          <a
            href={`${API_BASE_URL}/transcriptions/${currentTranscriptionId}/download_txt/`}
            className="inline-block bg-success text-white px-4 py-2 rounded hover:bg-success/90"
          >
            Download TXT
          </a>
          <a
            href={`${API_BASE_URL}/transcriptions/${currentTranscriptionId}/download_srt/`}
            className="inline-block bg-success text-white px-4 py-2 rounded hover:bg-success/90"
          >
            Download SRT
          </a>
        </div>
      )}
    </div>
  );
} 