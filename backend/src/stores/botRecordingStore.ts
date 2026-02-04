/**
 * In-memory store: botId → recordingId
 *
 * Populated when recording.done webhook arrives.
 * Read when frontend requests transcript for a bot.
 *
 * Note: This is in-memory for demo purposes. In production,
 * use Redis or a database for persistence across restarts.
 */
const store = new Map<string, string>();

export const botRecordingStore = {
  get(botId: string): string | undefined {
    return store.get(botId);
  },

  set(botId: string, recordingId: string): void {
    store.set(botId, recordingId);
  },

  has(botId: string): boolean {
    return store.has(botId);
  },
};
