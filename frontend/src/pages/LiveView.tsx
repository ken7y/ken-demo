import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';
import { useEventStream } from '../hooks/useEventStream';
import type { BotStatusCode } from '../types';

const SPEAKER_COLORS = [
  { bg: 'bg-blue-50', border: 'border-blue-200', label: 'text-blue-600' },
  { bg: 'bg-amber-50', border: 'border-amber-200', label: 'text-amber-600' },
];

const STATUS_CONFIG: Record<BotStatusCode, { dot: string; text: string; bg: string }> = {
  ready: { dot: 'bg-slate-400', text: 'Initializing...', bg: 'bg-slate-50' },
  joining_call: { dot: 'bg-amber-400 animate-pulse', text: 'Joining meeting...', bg: 'bg-amber-50' },
  in_waiting_room: { dot: 'bg-amber-400 animate-pulse', text: 'In waiting room', bg: 'bg-amber-50' },
  in_call_not_recording: { dot: 'bg-blue-400', text: 'Connected', bg: 'bg-blue-50' },
  recording_permission_allowed: { dot: 'bg-blue-400', text: 'Permission granted', bg: 'bg-blue-50' },
  recording_permission_denied: { dot: 'bg-red-400', text: 'Recording denied', bg: 'bg-red-50' },
  in_call_recording: { dot: 'bg-emerald-500 animate-pulse', text: 'Recording', bg: 'bg-emerald-50' },
  call_ended: { dot: 'bg-violet-400 animate-pulse', text: 'Finalizing...', bg: 'bg-violet-50' },
  done: { dot: 'bg-slate-400', text: 'Complete', bg: 'bg-slate-50' },
  fatal: { dot: 'bg-red-500', text: 'Error', bg: 'bg-red-50' },
};

// Type guard to validate status codes from the API
function isValidBotStatusCode(code: string): code is BotStatusCode {
  return Object.keys(STATUS_CONFIG).includes(code);
}

export function LiveView() {
  const { botId } = useParams<{ botId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<BotStatusCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!botId) return;
    let stopped = false;

    async function poll() {
      if (stopped) return;
      try {
        const { status: code } = await apiService.getBot(botId!);
        if (stopped) return;

        // Clear any previous error on successful poll
        setError(null);

        if (isValidBotStatusCode(code)) {
          setStatus(code);
        } else {
          // Unknown status code - log for debugging but keep polling
          console.warn('[LiveView] Unknown bot status code:', code);
          // Keep current status, don't update
        }

        if (code === 'done') {
          stopped = true;
          navigate(`/post-interview/${botId}`);
        }
      } catch (err) {
        if (stopped) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      }
    }

    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      stopped = true;
      clearInterval(interval);
    };
  }, [botId, navigate]);

  const { transcript, participants } = useEventStream(botId);
  const [intervieweeSpeakerId, setIntervieweeSpeakerId] = useState<number | null>(null);
  const speakerColorMap = useRef<Map<number | null, number>>(new Map());

  function getSpeakerColor(id: number | null) {
    if (!speakerColorMap.current.has(id)) {
      speakerColorMap.current.set(id, speakerColorMap.current.size % SPEAKER_COLORS.length);
    }
    return SPEAKER_COLORS[speakerColorMap.current.get(id)!];
  }

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  const config = status ? STATUS_CONFIG[status] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Live Interview</h2>
          <p className="text-sm text-slate-500 mt-1">Real-time transcription in progress</p>
        </div>
        <span className="text-xs text-slate-400 font-mono bg-slate-100 px-2 py-1 rounded">
          {botId?.slice(0, 8)}
        </span>
      </div>

      <div className={`p-4 rounded-xl border flex items-center gap-3 ${config?.bg || 'bg-slate-50'} border-slate-200`}>
        <div className="relative">
          <div className={`w-3 h-3 rounded-full ${config?.dot || 'bg-slate-300'}`}></div>
        </div>
        <span className={`text-sm font-medium ${status === 'fatal' ? 'text-red-700' : 'text-slate-700'}`}>
          {config?.text || 'Connecting...'}
        </span>
        {status === 'in_call_recording' && (
          <span className="ml-auto text-xs text-emerald-600 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
            Live
          </span>
        )}
        {error && <span className="text-sm text-red-500 ml-auto">{error}</span>}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-700">Transcript</h3>
          </div>
          <div className="p-5 flex-1 min-h-96 max-h-[500px] overflow-y-auto space-y-3">
            {transcript.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500">Waiting for speech...</p>
                  <p className="text-xs text-slate-400 mt-1">Transcript will appear here</p>
                </div>
              </div>
            ) : (
              transcript.map((entry) => {
                const color = getSpeakerColor(entry.speakerId);
                const isInterviewee = intervieweeSpeakerId !== null && entry.speakerId === intervieweeSpeakerId;
                return (
                  <div
                    key={entry.id}
                    className={`flex gap-3 p-3 rounded-lg transition-colors ${
                      isInterviewee ? 'bg-violet-50 border border-violet-200' : `${color.bg} border ${color.border}`
                    }`}
                  >
                    <span className="text-xs text-slate-400 shrink-0 pt-0.5 w-12 text-right font-mono">
                      {entry.timestamp.toFixed(1)}s
                    </span>
                    <div className="flex-1">
                      <span className={`text-xs font-semibold ${isInterviewee ? 'text-violet-600' : color.label}`}>
                        {entry.speaker}
                        {isInterviewee && <span className="ml-2 text-violet-400 font-normal">• Interviewee</span>}
                      </span>
                      <p className="text-sm text-slate-800 mt-0.5">{entry.text}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-semibold text-slate-700">Participants</h3>
          </div>
          <div className="p-5 flex-1 space-y-2">
            {participants.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-400">Waiting...</p>
                </div>
              </div>
            ) : (
              participants.map((p, idx) => (
                <div
                  key={p.id !== null ? `p-${p.id}` : `p-idx-${idx}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium text-slate-600">
                        {p.name.charAt(0).toUpperCase()}
                      </div>
                      {p.isSpeaking && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
                      )}
                    </div>
                    <span className="text-sm text-slate-800 font-medium">{p.name}</span>
                  </div>
                  <button
                    onClick={() => setIntervieweeSpeakerId(intervieweeSpeakerId === p.id ? null : p.id)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                      intervieweeSpeakerId === p.id
                        ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {intervieweeSpeakerId === p.id ? '✓ Interviewee' : 'Mark'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
