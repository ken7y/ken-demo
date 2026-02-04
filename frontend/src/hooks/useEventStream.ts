import { useState, useEffect, useRef } from 'react';
import type { TranscriptEntry, Participant } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

/**
 * SSE hook — connects to GET /api/events and surfaces real-time transcript
 * and participant data as the interview progresses.
 *
 * Events are filtered by botId to prevent cross-session data leakage.
 */
export function useEventStream(botId: string | undefined) {
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const entryCounter = useRef(0);

  useEffect(() => {
    if (!botId) return;

    const source = new EventSource(`${API_BASE}/api/events`);

    source.addEventListener('transcript', (e) => {
      const msg = JSON.parse(e.data) as {
        botId?: string;
        data?: {
          words?: { text: string; start_timestamp?: { relative: number } | null }[];
          participant?: { id?: number; name?: string };
        };
      };

      // Filter events for this bot only
      if (msg.botId && msg.botId !== botId) return;

      const part = msg.data;
      if (!part) return;

      const words = part.words || [];
      const text = words.map((w) => w.text).join(' ');
      const timestamp = words[0]?.start_timestamp?.relative ?? 0;

      const entry: TranscriptEntry = {
        id: `entry-${++entryCounter.current}`,
        speakerId: part.participant?.id ?? null,
        speaker: part.participant?.name || 'Unknown',
        text,
        timestamp,
      };

      setTranscript((prev) => [...prev, entry]);
    });

    source.addEventListener('participant', (e) => {
      const msg = JSON.parse(e.data) as {
        botId?: string;
        event?: string;
        participant?: { id?: number; name?: string };
      };

      // Filter events for this bot only
      if (msg.botId && msg.botId !== botId) return;

      const eventType = msg.event;
      const id: number | null = msg.participant?.id ?? null;
      const name: string = msg.participant?.name || 'Unknown';

      setParticipants((prev) => {
        switch (eventType) {
          case 'participant_events.join':
            if (prev.some((p) => p.id === id)) return prev;
            return [...prev, { id, name, isSpeaking: false, isInterviewee: false }];
          case 'participant_events.leave':
            return prev.filter((p) => p.id !== id);
          case 'participant_events.speech_on': {
            if (!prev.some((p) => p.id === id)) {
              return [...prev, { id, name, isSpeaking: true, isInterviewee: false }];
            }
            return prev.map((p) => (p.id === id ? { ...p, isSpeaking: true } : p));
          }
          case 'participant_events.speech_off':
            return prev.map((p) => (p.id === id ? { ...p, isSpeaking: false } : p));
          default:
            return prev;
        }
      });
    });

    return () => source.close();
  }, [botId]);

  return { transcript, participants };
}
