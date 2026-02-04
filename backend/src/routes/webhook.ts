import { Router, Request, Response } from 'express';
import { verifyWebhook } from '../middleware/verify';
import { pushToClients } from './events';
import { logger } from '../lib/logger';
import { botRecordingStore } from '../stores/botRecordingStore';
import type { WebhookEvent } from '../types';

const router: Router = Router();

/**
 * POST /api/webhook
 * Receives real-time events from Recall via ngrok tunnel.
 *
 * Recall retries on non-2xx responses, so we respond 200 immediately and
 * forward events to connected SSE clients via pushToClients().
 *
 * Events:
 *   transcript.data        — streaming transcript chunk, pushed to frontend live
 *   participant_events.*   — join, leave, speech_on, speech_off
 *   recording.done         — meeting ended; we store the recordingId so the
 *                             post-interview page can fetch the full transcript
 *
 * @see https://docs.recall.ai/docs/real-time-webhook-endpoints
 * @see https://docs.recall.ai/docs/real-time-event-payloads
 */
router.post('/', verifyWebhook, (req: Request, res: Response) => {
  const body = req.body as WebhookEvent;
  const { event } = body;
  const botId = body.data?.bot?.id;

  logger.info('Webhook received', { event, botId });

  if (event === 'transcript.data') {
    pushToClients('transcript', { botId, data: body.data?.data });
  }

  if (event?.startsWith('participant_events.')) {
    pushToClients('participant', {
      botId,
      event,
      participant: (body.data?.data as Record<string, unknown>)?.participant,
    });
  }

  if (event === 'recording.done') {
    const recordingId = body.data?.recording?.id;
    if (recordingId && botId) {
      botRecordingStore.set(botId, recordingId);
      logger.info('Recording complete', { botId, recordingId });
    }
  }

  res.status(200).json({ success: true });
});

export { router as webhookRoutes };
