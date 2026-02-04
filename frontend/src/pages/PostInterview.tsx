import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { apiService } from '../services/api';
import type { TranscriptPart } from '../types';

interface TranscriptParagraph {
  speaker: string | null;
  speakerId: number | null;
  text: string;
  startTime: number;
  endTime: number;
}

const PROMPTS = [
  {
    id: 'summarize',
    title: 'Interview Summary',
    description: 'Key insights and themes',
    icon: '📋',
    prompt: `Below is a transcript from a user interview. Each paragraph includes the speaker name and timestamp.

Analyze this transcript and provide:
1. A brief summary (2-3 sentences)
2. Key themes or pain points mentioned
3. Notable quotes that illustrate user needs

Transcript:
{TRANSCRIPT}

Format your response clearly with headers for each section.`,
  },
  {
    id: 'sales-analysis',
    title: 'Sales Call Analysis',
    description: 'Buying signals and objections',
    icon: '💼',
    prompt: `Below is a transcript from a sales call. Analyze the conversation for:

1. **Buying Signals**: What indicates the prospect is interested?
2. **Objections**: What concerns or hesitations did they raise?
3. **Next Steps**: What actions were committed to?
4. **Deal Risk**: On a scale of 1-10, how likely is this to close? Why?

Transcript:
{TRANSCRIPT}

Be specific. Quote the transcript where relevant.`,
  },
  {
    id: 'action-items',
    title: 'Action Items',
    description: 'Commitments and follow-ups',
    icon: '✅',
    prompt: `Review this meeting transcript and extract all action items.

For each action item, specify:
- Who is responsible
- What needs to be done
- Any mentioned deadline or timeframe

Transcript:
{TRANSCRIPT}

List action items in order of priority if possible.`,
  },
];

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function convertToStructured(parts: TranscriptPart[]): TranscriptParagraph[] {
  const grouped: TranscriptParagraph[] = [];

  for (const part of parts) {
    const speakerId = part.participant?.id ?? null;
    const speaker = part.participant?.name || 'Unknown';
    const words = part.words || [];

    if (words.length === 0) continue;

    const text = words.map((w) => w.text).join(' ').trim();
    const firstWord = words.find((w) => w.start_timestamp);
    const lastWord = [...words].reverse().find((w) => w.end_timestamp);

    const startTime = firstWord?.start_timestamp?.relative ?? 0;
    const endTime = lastWord?.end_timestamp?.relative ?? startTime;

    const lastPara = grouped[grouped.length - 1];
    if (lastPara && lastPara.speakerId === speakerId) {
      lastPara.text += ' ' + text;
      lastPara.endTime = endTime;
    } else {
      grouped.push({ speaker, speakerId, text, startTime, endTime });
    }
  }

  return grouped;
}

export function PostInterview() {
  const { botId } = useParams<{ botId: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptParagraph[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [intervieweeName, setIntervieweeName] = useState<string | null>(null);
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    if (!botId) return;

    let mounted = true;
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    let createdTranscript = false;

    async function poll() {
      if (!mounted) return;

      try {
        const result = await apiService.getTranscript(botId!);

        if (!mounted) return;

        if (result.status === 'done' && result.transcript) {
          if (pollInterval) clearInterval(pollInterval);
          setTranscript(convertToStructured(result.transcript));
          setVideoUrl(result.videoUrl);
          setLoading(false);
        } else if (result.status === 'processing') {
          // Keep polling
        } else if (!createdTranscript) {
          createdTranscript = true;
          try {
            await apiService.createTranscript(botId!);
          } catch {
            // Ignore - transcript may already exist
          }
        }
      } catch (err) {
        if (!mounted) return;
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status !== 404) {
          setError(err instanceof Error ? err.message : 'Failed to load transcript');
          setLoading(false);
          if (pollInterval) clearInterval(pollInterval);
        }
      }
    }

    poll();
    pollInterval = setInterval(poll, 3000);

    return () => {
      mounted = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [botId]);

  function generatePromptText(template: string): string {
    const transcriptText = transcript
      .map((p) => `[${formatTimestamp(p.startTime)}] ${p.speaker}: ${p.text}`)
      .join('\n\n');
    return template.replace('{TRANSCRIPT}', transcriptText);
  }

  async function copyPrompt(promptId: string) {
    const prompt = PROMPTS.find((p) => p.id === promptId);
    if (!prompt) return;

    try {
      const fullText = generatePromptText(prompt.prompt);
      await navigator.clipboard.writeText(fullText);
      setCopiedPromptId(promptId);
      setCopyError(null);
      setTimeout(() => setCopiedPromptId(null), 2000);
    } catch {
      setCopyError('Failed to copy to clipboard');
      setTimeout(() => setCopyError(null), 3000);
    }
  }

  const speakers = Array.from(new Set(transcript.map((p) => p.speaker)));
  const duration = transcript.length > 0 ? transcript[transcript.length - 1]?.endTime || 0 : 0;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/" className="text-sm text-slate-500 hover:text-violet-600 flex items-center gap-1 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Interview Summary</h2>
          <p className="text-sm text-slate-500 mt-1 font-mono">{botId?.slice(0, 8)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-16 text-center">
          <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-600 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium">Processing transcript...</p>
          <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
            Enhanced speaker attribution is being applied. This usually takes about a minute.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link to="/" className="text-sm text-slate-500 hover:text-violet-600 flex items-center gap-1 mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <h2 className="text-2xl font-bold text-slate-900">Interview Summary</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-red-800 font-medium">Error loading transcript</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <Link to="/" className="text-sm text-slate-500 hover:text-violet-600 flex items-center gap-1 mb-4 w-fit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Interview Summary</h2>
            <p className="text-sm text-slate-500 mt-1 font-mono">{botId?.slice(0, 8)}</p>
          </div>
          {transcript.length > 0 && (
            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">{formatTimestamp(duration)}</p>
              <p className="text-xs text-slate-400">{transcript.length} segments • {speakers.length} speakers</p>
            </div>
          )}
        </div>
      </div>

      {videoUrl && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-700">Recording</h3>
          </div>
          <div className="p-4 bg-black">
            <video
              controls
              className="w-full max-h-[400px] rounded-lg"
              src={videoUrl}
            >
              Your browser does not support video playback.
            </video>
          </div>
        </div>
      )}

      {transcript.length > 0 && speakers.length > 1 && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 rounded-xl p-4">
          <p className="text-sm text-violet-900 mb-3 font-medium">Mark the interviewee to highlight their responses:</p>
          <div className="flex flex-wrap gap-2">
            {speakers.map((speaker) => (
              <button
                key={speaker || 'unknown'}
                onClick={() => setIntervieweeName(intervieweeName === speaker ? null : speaker)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  intervieweeName === speaker
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-200'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                {speaker}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-700">Full Transcript</h3>
        </div>
        <div className="p-5 space-y-3 max-h-[500px] overflow-y-auto">
          {transcript.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No transcript data available</p>
          ) : (
            transcript.map((para, idx) => {
              const isInterviewee = intervieweeName && para.speaker === intervieweeName;
              return (
                <div
                  key={`para-${idx}`}
                  className={`p-4 rounded-xl transition-colors ${
                    isInterviewee
                      ? 'bg-violet-50 border border-violet-200'
                      : 'bg-slate-50 border border-slate-100'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-slate-400 font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                      {formatTimestamp(para.startTime)}
                    </span>
                    <span className={`text-sm font-semibold ${isInterviewee ? 'text-violet-700' : 'text-slate-700'}`}>
                      {para.speaker}
                    </span>
                    {isInterviewee && (
                      <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                        Interviewee
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 leading-relaxed">{para.text}</p>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-sm font-semibold text-slate-700">Extend with AI</h3>
          <p className="text-xs text-slate-500 mt-1">
            Copy a prompt with the transcript embedded, then paste into your favorite LLM.
          </p>
        </div>
        <div className="p-5 space-y-3">
          {copyError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {copyError}
            </div>
          )}
          {PROMPTS.map((prompt) => (
            <div
              key={prompt.id}
              className="border border-slate-200 rounded-xl p-4 hover:border-violet-300 hover:bg-violet-50/30 transition-all group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{prompt.icon}</span>
                  <div>
                    <h4 className="font-semibold text-slate-900">{prompt.title}</h4>
                    <p className="text-sm text-slate-500">{prompt.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => copyPrompt(prompt.id)}
                  disabled={transcript.length === 0}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    copiedPromptId === prompt.id
                      ? 'bg-emerald-500 text-white'
                      : transcript.length === 0
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-200'
                  }`}
                >
                  {copiedPromptId === prompt.id ? '✓ Copied' : 'Copy Prompt'}
                </button>
              </div>
              <details className="mt-3">
                <summary className="text-xs text-slate-500 cursor-pointer hover:text-violet-600 transition-colors">
                  Preview template
                </summary>
                <pre className="mt-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200 overflow-x-auto whitespace-pre-wrap text-slate-600">
                  {prompt.prompt}
                </pre>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
