import axios, { AxiosInstance } from 'axios';
import type { TranscriptPart } from '../types';

// --- Response types ---

interface ListBotsResponse {
  bots: Array<{
    id: string;
    meeting_url?: string;
    meeting_metadata?: { title?: string };
    status_changes: Array<{ code: string; created_at: string }>;
  }>;
}

interface CreateBotResponse {
  botId: string;
}

interface GetBotResponse {
  botId: string;
  status: string;
}

interface CreateTranscriptResponse {
  transcriptId: string;
}

interface GetTranscriptResponse {
  transcript: TranscriptPart[] | null;
  videoUrl: string | null;
  status: string;
}

/**
 * API client for the backend.
 */
class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (import.meta.env.DEV) {
      this.client.interceptors.request.use(
        (config) => {
          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => Promise.reject(error)
      );
    }

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message;
        if (import.meta.env.DEV) {
          console.error('[API] Error:', message);
        }
        // Normalize error so UI gets a useful message
        return Promise.reject(new Error(message));
      }
    );
  }

  async getHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get('/api/health');
    return response.data;
  }

  async listBots(): Promise<ListBotsResponse> {
    const response = await this.client.get<ListBotsResponse>('/api/bot');
    return response.data;
  }

  async createBot(meetingUrl: string): Promise<CreateBotResponse> {
    const response = await this.client.post<CreateBotResponse>('/api/bot', { meetingUrl });
    return response.data;
  }

  async getBot(botId: string): Promise<GetBotResponse> {
    const response = await this.client.get<GetBotResponse>(`/api/bot/${botId}`);
    return response.data;
  }

  async createTranscript(botId: string): Promise<CreateTranscriptResponse> {
    const response = await this.client.post<CreateTranscriptResponse>(`/api/bot/${botId}/transcript`);
    return response.data;
  }

  async getTranscript(botId: string): Promise<GetTranscriptResponse> {
    const response = await this.client.get<GetTranscriptResponse>(`/api/bot/${botId}/transcript`);
    return response.data;
  }
}

export const apiService = new ApiService();
