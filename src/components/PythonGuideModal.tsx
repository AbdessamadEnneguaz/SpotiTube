import React, { useState } from 'react';
import { X, Terminal, Copy, Check, FileCode, PlayCircle, BookOpen, Sparkles } from 'lucide-react';

interface PythonGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PythonGuideModal: React.FC<PythonGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'instructions' | 'backend' | 'frontend_html'>('instructions');
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const codeBackend = `from flask import Flask, jsonify, request, render_template
import yt_dlp

app = Flask(__name__, static_folder="static", template_folder="static")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q')
    if not query:
        return jsonify([])

    ydl_opts = {
        'extract_flat': 'in_playlist',
        'skip_download': True,
        'quiet': True,
        'no_warnings': True
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Search for 12 videos (Metadata only - zero audio downloading)
            info = ydl.extract_info(f"ytsearch12:{query}", download=False)
            results = []
            
            entries = info.get('entries', []) if info else []
            for entry in entries:
                if not entry:
                    continue
                video_id = entry.get('id') or entry.get('url')
                title = entry.get('title') or 'Unknown Title'
                channel = entry.get('uploader') or entry.get('channel') or 'YouTube Track'
                
                results.append({
                    "id": video_id,
                    "title": title,
                    "channel": channel,
                    "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
                })

            print(f"--> [DEBUG] Found {len(results)} tracks for query: '{query}'")
            return jsonify(results)
    except Exception as e:
        print("--> [ERROR] Search Error:", e)
        return jsonify([])

if __name__ == '__main__':
    print("SpotiTube running with keyless yt-dlp search on http://127.0.0.1:5000")
    app.run(debug=True, port=5000)
`;

  const codeInstructions = `# ========================================================
# SpotiTube Local Setup (Zero API Key Needed!)
# ========================================================

# Step 1: Clone or navigate to your local folder
mkdir spotitube-local && cd spotitube-local

# Step 2: Create a Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows use: venv\\Scripts\\activate

# Step 3: Install required Python dependencies (Flask + yt-dlp)
pip install flask yt-dlp

# Step 4: No API key needed!
# The app searches video metadata directly via yt-dlp with extract_flat.
# Playback is handled 100% compliantly via the official YouTube IFrame API.

# Step 5: Start the local server
python app.py

# Step 6: Open your browser
# Visit http://127.0.0.1:5000
`;

  const codeFrontendHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SpotiTube - Spotify Web Clone (Zero API Key)</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div class="app-layout">
    <!-- Sidebar -->
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-icon">▶</span>
        <h2>SpotiTube</h2>
      </div>
      <nav class="nav-links">
        <button class="nav-item active" id="nav-home">Home</button>
        <button class="nav-item" id="nav-search">Search</button>
      </nav>
      <div class="playlists-box">
        <h3>Categories</h3>
        <button class="category-btn" data-genre="chaabi">Moroccan Chaabi</button>
        <button class="category-btn" data-genre="rai">Rai Classics</button>
        <button class="category-btn" data-genre="rap">Maghreb Rap</button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <header class="topbar">
        <input type="text" id="search-input" placeholder="Search artists, tracks, Chaabi, Rai..." />
        <button id="search-btn">Search</button>
      </header>

      <section class="tracks-section">
        <h2 id="section-title">Featured Tracks</h2>
        <div id="tracks-list" class="tracks-list"></div>
      </section>
    </main>

    <!-- Official YouTube IFrame Player -->
    <div id="yt-player-container">
      <div id="youtube-player"></div>
    </div>

    <!-- Bottom Player Control Bar -->
    <footer class="player-bar">
      <div class="player-left">
        <img id="current-thumb" src="" alt="" />
        <div>
          <div id="current-title" class="track-title">No track selected</div>
          <div id="current-artist" class="track-artist">-</div>
        </div>
      </div>

      <div class="player-center">
        <div class="controls">
          <button id="btn-prev">⏮</button>
          <button id="btn-play" class="btn-play-pause">▶</button>
          <button id="btn-next">⏭</button>
        </div>
        <div class="seekbar-row">
          <span id="time-current">0:00</span>
          <input type="range" id="seekbar" min="0" max="100" value="0" />
          <span id="time-total">0:00</span>
        </div>
      </div>

      <div class="player-right">
        <span>🔊</span>
        <input type="range" id="vol-slider" min="0" max="100" value="80" />
      </div>
    </footer>
  </div>

  <!-- YouTube IFrame API Script -->
  <script src="https://www.youtube.com/iframe_api"></script>
  <script src="/app.js"></script>
</body>
</html>
`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-[#1B1815] border border-[#EAE0D0]/12 w-full max-w-4xl h-[85vh] rounded-2xl flex flex-col shadow-2xl relative text-[#F5F0E8] overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-[#EAE0D0]/[0.08] flex items-center justify-between bg-[#161310]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D8C3A5]/15 text-[#DFCCB0] flex items-center justify-center font-mono font-bold">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-base font-bold">Local Python &amp; Vanilla Stack Deliverables</h2>
                <span className="text-[10px] bg-[#D8C3A5] text-[#12100E] font-bold px-1.5 py-0.5 rounded uppercase">
                  Zero API Key
                </span>
              </div>
              <p className="text-xs text-[#9E9384]">Powered by <code className="text-[#DFCCB0]">app.py</code> with <code className="text-[#DFCCB0]">yt-dlp</code> search extraction</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close guide"
            className="text-[#9E9384] hover:text-[#F5F0E8] p-1.5 rounded-lg hover:bg-[#24201B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#EAE0D0]/[0.08] bg-[#161310]/80 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('instructions')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'instructions' ? 'bg-[#D8C3A5] text-[#12100E] font-bold' : 'text-[#C8BEB0] hover:bg-[#24201B]'
            }`}
          >
            Terminal Quickstart
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('backend')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'backend' ? 'bg-[#D8C3A5] text-[#12100E] font-bold' : 'text-[#C8BEB0] hover:bg-[#24201B]'
            }`}
          >
            Python Backend (app.py)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('frontend_html')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              activeTab === 'frontend_html' ? 'bg-[#D8C3A5] text-[#12100E] font-bold' : 'text-[#C8BEB0] hover:bg-[#24201B]'
            }`}
          >
            Vanilla HTML (index.html)
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#12100E] font-mono text-xs relative">
          <button
            type="button"
            onClick={() => {
              const text =
                activeTab === 'instructions'
                  ? codeInstructions
                  : activeTab === 'backend'
                  ? codeBackend
                  : codeFrontendHtml;
              copyToClipboard(text, activeTab);
            }}
            className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#24201B] hover:bg-[#2F2A24] text-[#F5F0E8] border border-[#EAE0D0]/12 transition-all cursor-pointer shadow-lg z-10"
          >
            {copied === activeTab ? (
              <>
                <Check className="w-3.5 h-3.5 text-[#DFCCB0]" />
                <span className="text-[#DFCCB0] font-sans text-xs">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#9E9384]" />
                <span className="font-sans text-xs">Copy Code</span>
              </>
            )}
          </button>

          <pre className="text-[#C8BEB0] leading-relaxed overflow-x-auto whitespace-pre">
            {activeTab === 'instructions' && codeInstructions}
            {activeTab === 'backend' && codeBackend}
            {activeTab === 'frontend_html' && codeFrontendHtml}
          </pre>
        </div>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-[#EAE0D0]/[0.08] bg-[#161310] flex items-center justify-between text-xs text-[#9E9384]">
          <span>Compliant metadata search via yt-dlp &amp; official YouTube IFrame API playback.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#D8C3A5] text-[#12100E] font-bold hover:bg-[#E4D3BA] transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
