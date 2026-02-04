import { config } from '../config';

const RECALL_BASE = `https://${config.recallRegion}.recall.ai/api/v1`;

export class RecallApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = 'RecallApiError';
  }
}

/**
 * Fetch wrapper for Recall API calls.
 * Adds authorization header and handles error responses.
 */
export async function recallFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const res = await fetch(`${RECALL_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: config.recallApiKey,
      ...init.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new RecallApiError(res.status, text);
  }

  return res;
}
