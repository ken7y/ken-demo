/**
 * Shared types for the frontend.
 */

// --- Bot status ---
// @see https://docs.recall.ai/docs/bot-status-change-events
export type BotStatusCode =
  | 'ready'
  | 'joining_call'
  | 'in_waiting_room'
  | 'in_call_not_recording'
  | 'recording_permission_allowed'
  | 'recording_permission_denied'
  | 'in_call_recording'
  | 'call_ended'
  | 'done'
  | 'fatal';

// --- Transcript ---

export interface TranscriptEntry {
  id: string;
  speakerId: number | null;
  speaker: string;
  text: string;
  timestamp: number; // relative seconds from recording start
}

// --- Participants ---

export interface Participant {
  id: number | null;
  name: string;
  isSpeaking: boolean;
  isInterviewee: boolean;
}

// --- Raw transcript from Recall API ---

export interface TranscriptPart {
  participant: {
    id: number | null;
    name: string | null;
  };
  words: {
    text: string;
    start_timestamp?: { relative: number } | null;
    end_timestamp?: { relative: number } | null;
  }[];
}
