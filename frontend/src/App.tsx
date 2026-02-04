import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Home } from './pages/Home';
import { LiveView } from './pages/LiveView';
import { PostInterview } from './pages/PostInterview';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <Link to="/" className="flex items-center space-x-3 w-fit group">
              <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-200 group-hover:shadow-violet-300 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-slate-900">Interview Capture</h1>
                <p className="text-xs text-slate-500">Powered by Recall.ai</p>
              </div>
            </Link>
          </div>
        </header>

        <main className="max-w-6xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/live/:botId" element={<LiveView />} />
            <Route path="/post-interview/:botId" element={<PostInterview />} />
          </Routes>
        </main>

        <footer className="border-t border-slate-200 bg-white/50 mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
            Demo application built with the Recall.ai API
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;
