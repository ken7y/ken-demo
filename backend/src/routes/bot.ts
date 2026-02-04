import { Router, Request, Response } from 'express';
import { config } from '../config';
import { recallFetch, RecallApiError } from '../lib/recallClient';
import { logger } from '../lib/logger';
import { botRecordingStore } from '../stores/botRecordingStore';
import type { Bot, BotDetails, CreateBotRequest } from '../types';

const router: Router = Router();

/**
 * GET /api/bot
 * Lists recent bots from the Recall account
 * @see https://docs.recall.ai/reference/bot_list
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const response = await recallFetch('/bot/?limit=10');
    const data = (await response.json()) as { results: Bot[] };

    const completedBots = data.results.filter((bot) => {
      const currentStatus = bot.status_changes[bot.status_changes.length - 1]?.code;
      return currentStatus === 'done';
    });

    res.json({ bots: completedBots });
  } catch (err) {
    logger.error('Failed to list bots', { error: String(err) });
    if (err instanceof RecallApiError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to list bots' });
  }
});

/**
 * POST /api/bot
 * Creates a Recall bot that joins the given meeting and starts capturing.
 *
 * @see https://docs.recall.ai/reference/bot_create
 * @see https://docs.recall.ai/docs/real-time-transcription (transcript config)
 * @see https://docs.recall.ai/docs/real-time-webhook-endpoints (realtime_endpoints)
 */
router.post('/', async (req: Request<object, unknown, CreateBotRequest>, res: Response) => {
  const { meetingUrl, botConfig } = req.body;
  if (!meetingUrl) {
    res.status(400).json({ error: 'meetingUrl is required' });
    return;
  }

  const webhookUrl = `https://${config.ngrokDomain}/api/webhook/`;

  // Build Recall bot payload with optional config
  const botPayload: Record<string, unknown> = {
    meeting_url: meetingUrl,
    bot_name: botConfig?.botName || 'Interview Bot',
    recording_config: {
      transcript: {
        provider: {
          recallai_streaming: {
            mode: 'prioritize_low_latency',
            language_code: 'en',
          },
        },
      },
      realtime_endpoints: [
        {
          type: 'webhook',
          url: webhookUrl,
          events: [
            'transcript.data',
            'participant_events.join',
            'participant_events.leave',
            'participant_events.speech_on',
            'participant_events.speech_off',
          ],
        },
      ],
    },
  };



  try {
    const response = await recallFetch('/bot/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(botPayload),
    });

    const bot = (await response.json()) as Bot;
    logger.info('Bot created', { botId: bot.id });
    res.json({ botId: bot.id });
  } catch (err) {
    logger.error('Failed to create bot', { error: String(err) });
    if (err instanceof RecallApiError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create bot' });
  }
});

/**
 * GET /api/bot/:botId
 * Returns the current status of a bot.
 *
 * @see https://docs.recall.ai/reference/bot_retrieve
 * @see https://docs.recall.ai/docs/bot-status-change-events (status codes)
 */
router.get('/:botId', async (req: Request, res: Response) => {
  const { botId } = req.params;

  try {
    const response = await recallFetch(`/bot/${botId}/`);
    const bot = (await response.json()) as Bot;
    const currentStatus = bot.status_changes[bot.status_changes.length - 1]?.code ?? 'ready';
    res.json({ botId: bot.id, status: currentStatus });
  } catch (err) {
    logger.error('Failed to get bot status', { botId, error: String(err) });
    if (err instanceof RecallApiError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to get bot status' });
  }
});

/**
 * POST /api/bot/:botId/transcript
 * Triggers async transcript creation for the bot's recording.
 *
 * @see https://docs.recall.ai/reference/recording_create_transcript_create
 * @see https://docs.recall.ai/docs/async-transcription
 */
router.post('/:botId/transcript', async (req: Request, res: Response) => {
  const { botId } = req.params;
  const recordingId = botRecordingStore.get(botId);

  if (!recordingId) {
    logger.warn('No recording found for bot', { botId });
    res.status(404).json({ error: 'Recording not found for this bot' });
    return;
  }

  try {
    const response = await recallFetch(`/recording/${recordingId}/create_transcript/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: {
          recallai_async: { language_code: 'auto' },
        },
        diarization: {
          use_separate_streams_when_available: true,
        },
      }),
    });

    const transcript = (await response.json()) as { id: string };
    logger.info('Transcript created', { botId, transcriptId: transcript.id });
    res.json({ transcriptId: transcript.id });
  } catch (err) {
    logger.error('Failed to create transcript', { botId, error: String(err) });
    if (err instanceof RecallApiError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create transcript' });
  }
});

/**
 * GET /api/bot/:botId/transcript
 * Fetches the completed async transcript and video URL for the bot's recording.
 *
 * @see https://docs.recall.ai/reference/recording_retrieve
 * @see https://docs.recall.ai/docs/recordings-and-media (media_shortcuts)
 * @see https://docs.recall.ai/docs/video-playback
 */
router.get('/:botId/transcript', async (req: Request, res: Response) => {
  const { botId } = req.params;
  let recordingId: string | undefined = botRecordingStore.get(botId);

  if (!recordingId) {
    try {
      const botResponse = await recallFetch(`/bot/${botId}/`);
      const botData = (await botResponse.json()) as BotDetails;

      if (botData.recordings && botData.recordings.length > 0) {
        const extractedId = botData.recordings[0]?.id;
        if (extractedId) {
          recordingId = extractedId;
          botRecordingStore.set(botId, extractedId);
          logger.debug('Found recording ID from bot details', { botId, recordingId: extractedId });
        }
      }
    } catch (err) {
      logger.error('Failed to fetch bot details', { botId, error: String(err) });
    }
  }

  if (!recordingId) {
    res.status(404).json({ error: 'Recording not found. The meeting may not have completed yet.' });
    return;
  }

  try {
    const recordingResponse = await recallFetch(`/recording/${recordingId}/`);
    const recording = (await recordingResponse.json()) as {
      media_shortcuts?: {
        transcript?: {
          data?: { download_url?: string };
        };
        video_mixed?: {
          data?: { download_url?: string };
        };
      };
    };

    const transcriptUrl = recording.media_shortcuts?.transcript?.data?.download_url;
    const videoUrl = recording.media_shortcuts?.video_mixed?.data?.download_url;

    if (!transcriptUrl) {
      res.json({ transcript: null, videoUrl: null, status: 'processing' });
      return;
    }

    const transcriptResponse = await fetch(transcriptUrl);
    if (!transcriptResponse.ok) {
      res.status(transcriptResponse.status).json({ error: 'Failed to fetch transcript data' });
      return;
    }

    const transcript = await transcriptResponse.json();
    res.json({ transcript, videoUrl: videoUrl || null, status: 'done' });
  } catch (err) {
    logger.error('Failed to get transcript', { botId, error: String(err) });
    if (err instanceof RecallApiError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Failed to get transcript' });
  }
});

export { router as botRoutes };
