import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api';

interface PastBot {
  id: string;
  meeting_url?: string;
  meeting_metadata?: { title?: string };
  status_changes: Array<{ code: string; created_at: string }>;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}


export function Home() {
  const [meetingUrl, setMeetingUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastBots, setPastBots] = useState<PastBot[]>([]);
  const [loadingPast, setLoadingPast] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadPastInterviews() {
      try {
        const { bots } = await apiService.listBots();
        setPastBots(bots);
      } catch (err) {
        console.error('Failed to load past interviews:', err);
      } finally {
        setLoadingPast(false);
      }
    }
    loadPastInterviews();
  }, []);

  const handleStart = async () => {
    if (!meetingUrl.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { botId } = await apiService.createBot(meetingUrl.trim());
      navigate(`/live/${botId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start capture');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pt-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-3 py-1 rounded-full text-sm font-medium mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
          </span>
          Recall.ai Demo
        </div>
        <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">
          Capture Every Interview
        </h2>
        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          Paste your meeting link. Stay present in the conversation — we'll handle the transcription.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
        <label htmlFor="meeting-url" className="block text-sm font-medium text-slate-700 mb-2">
          Meeting URL
        </label>
        <div className="flex gap-3">
          <input
            id="meeting-url"
            type="text"
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleStart()}
            placeholder="https://meet.google.com/abc-defg-hij"
            className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-slate-900 bg-slate-50 placeholder:text-slate-400"
          />
          <button
            onClick={handleStart}
            disabled={loading || !meetingUrl.trim()}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-300 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-200 hover:shadow-violet-300 disabled:shadow-none"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Starting...
              </span>
            ) : (
              'Start Capture'
            )}
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-base font-semibold text-slate-900">Past Interviews</h3>
          <p className="text-sm text-slate-500">View completed interview transcripts</p>
        </div>
        <div className="divide-y divide-slate-100">
          {loadingPast ? (
            <div className="p-10 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-slate-200 border-t-violet-600 rounded-full mx-auto mb-3"></div>
              <p className="text-sm text-slate-500">Loading interviews...</p>
            </div>
          ) : pastBots.length === 0 ? (
            <div className="p-10 text-center">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-sm text-slate-600 font-medium">No interviews yet</p>
              <p className="text-xs text-slate-400 mt-1">Start your first capture above</p>
            </div>
          ) : (
            pastBots.slice(0, 5).map((bot) => {
              const completedAt = bot.status_changes.find((s) => s.code === 'done')?.created_at || bot.status_changes[0]?.created_at;
              
              return (
                <button
                  key={bot.id}
                  onClick={() => navigate(`/post-interview/${bot.id}`)}
                  className="w-full p-4 hover:bg-slate-50 transition-colors text-left flex items-center gap-4 group"
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-slate-100 text-slate-600">
                    📹
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {bot.meeting_metadata?.title || 'Interview'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400">
                        {completedAt && formatDate(completedAt)}
                      </span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-400 font-mono">
                        {bot.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-slate-300 group-hover:text-violet-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })
          )}
        </div>
        {pastBots.length > 5 && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/50 text-center">
            <p className="text-xs text-slate-500">
              Showing 5 most recent • {pastBots.length} total
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
