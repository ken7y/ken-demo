/**
 * Shared types for the backend.
 */

// --- Recall API types ---
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

export interface Bot {
  id: string;
  meeting_url?: string;
  meeting_metadata?: {
    title?: string;
  };
  status_changes: {
    code: BotStatusCode;
    sub_code: string | null;
    created_at: string;
  }[];
}

// A single chunk of transcript from Recall (real-time or async)
export interface TranscriptPart {
  participant: {
    id: number | null;
    name: string | null;
    is_host: boolean | null;
  };
  words: {
    text: string;
    start_timestamp?: { relative: number; absolute?: string | null } | null;
    end_timestamp?: { relative: number; absolute?: string | null } | null;
  }[];
}

// Participant event payload (join, leave, speech_on, speech_off, etc.)
export interface ParticipantEvent {
  event: string;
  participant: {
    id: number | null;
    name: string | null;
  };
}

// Envelope for all incoming webhook events from Recall
export interface WebhookEvent {
  event: string;
  data: {
    recording?: { id: string };
    bot?: { id: string };
    data?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// Request body types
export interface CreateBotRequest {
  meetingUrl: string;

  /**
   * Optional bot configuration. Extend this to expose more Recall options.
   * @see https://docs.recall.ai/reference/bot_create
   */
  botConfig?: {
    /** Display name shown in meeting (default: "Interview Bot") */
    botName?: string;
  };
}

// Recall API response for bot details (partial, fields we use)
export interface BotDetails extends Bot {
  recordings?: Array<{ id: string }>;
}
