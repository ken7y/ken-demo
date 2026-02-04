# Interview Capture

A demo application built on the [Recall.ai](https://recall.ai) API. It joins meetings, transcribes them in real time, and produces structured prompts for AI-driven analysis of the conversation.

## Why this use case

Product managers running user interviews are one of the clearest entry points for meeting transcription. The workflow is repetitive, the notes are high-stakes, and the downstream analysis — theme extraction, issue categorization — maps directly onto what LLMs are good at. PM interviews are a natural starting point.

But the same capture-and-analyze pipeline applies anywhere a structured conversation needs to be recorded and turned into actionable output. The post-interview screen ships three prompt templates deliberately: **Interview Summary** for PMs extracting user themes, **Sales Call Analysis** for sales reps reviewing deal signals, and **Action Items** for any team that needs to track next steps. A Recall customer extending this would swap or add prompts for their domain — the underlying infrastructure stays the same.

## What it demonstrates

This is meant to be a reference implementation for Recall customers. The integration patterns it covers:

- **Bot lifecycle** — create a bot, poll its status through join → recording → done
- **Real-time transcription** — stream transcript chunks as they arrive via webhooks, bridge them to the browser over SSE
- **Participant events** — track joins, leaves, and active speakers in real time
- **Post-meeting transcripts** — trigger async transcription with speaker diarization, then fetch and render the result
- **Webhook handling** — receive Recall events, respond immediately, and route them without blocking

## How it works

1. **Start** — Enter a meeting URL. A Recall bot joins and begins recording.
2. **Live** — Transcript and speaker activity stream to the UI in real time.
3. **Post-interview** — Once the meeting ends, the full diarized transcript is available alongside prompt templates ready to drop into any LLM.

```
  Frontend            Backend            Recall.ai
     │                  │                   │
     │── POST /bot ───►│── create bot ───►│
     │                  │                   │
     │                  │◄── webhooks ─────│  transcript.data, participant_events
     │◄── SSE ──────────│                   │
     │                  │                   │
     │                  │◄── recording.done─│
     │── GET transcript─│                   │
```

Full walkthrough of the diagrams and data flow: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Getting started

**Prerequisites:** Node.js 18+, pnpm, [ngrok](https://ngrok.com/), a Recall.ai API key.

```bash
git clone <repo-url>
cd recall-interview
pnpm install

cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Edit `backend/.env` with your values:

| Variable | Description |
|---|---|
| `RECALL_API_KEY` | Your Recall.ai API key |
| `RECALL_REGION` | API region (e.g. `us-west-2`) |
| `NGROK_DOMAIN` | Your ngrok domain, without `https://` |
| `WEBHOOK_TOKEN` | Secret for webhook verification (optional in dev) |

**Set up webhooks in Recall:**

1. Start ngrok: `ngrok http 3001`
2. Go to [Recall Dashboard → Webhooks](https://us-west-2.recall.ai/dashboard/webhooks) (adjust URL for your region)
3. Click **Add Endpoint** and enter: `https://<your-ngrok-domain>/api/webhook`
4. Subscribe to events: `bot.status_change`, `transcript.data`, `recording.done`

Then start everything:

```bash
ngrok http 3001          # terminal 1 — paste the domain into NGROK_DOMAIN
pnpm dev                 # terminal 2 — starts backend and frontend together
```

Frontend runs at http://localhost:5173. Backend health check at http://localhost:3001/api/health.

## Project structure

```
recall-interview/
├── backend/src/
│   ├── index.ts            # Express entry point
│   ├── config/             # Environment config
│   ├── lib/                # Logger and Recall API client
│   ├── middleware/         # Webhook verification
│   ├── routes/
│   │   ├── bot.ts          # Bot CRUD and transcript endpoints
│   │   ├── webhook.ts      # Receives and routes Recall events
│   │   ├── events.ts       # SSE endpoint — bridges webhooks to frontend
│   │   └── health.ts       # Health check endpoint
│   ├── stores/             # In-memory bot → recording mapping
│   └── types/              # Shared TypeScript types
│
└── frontend/src/
    ├── main.tsx            # React entry point
    ├── App.tsx             # Router and layout
    ├── pages/
    │   ├── Home.tsx        # Start a capture, view past interviews
    │   ├── LiveView.tsx    # Real-time transcript and participants
    │   └── PostInterview.tsx # Full transcript and AI prompt templates
    ├── hooks/              # useEventStream — SSE client hook
    ├── services/           # API client
    ├── styles/             # Global styles and Tailwind
    └── types/              # TypeScript types
```
