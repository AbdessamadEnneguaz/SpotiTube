import React, { useState } from 'react';
import { X, Shield, FileText, Scale, Cookie, CheckCircle2, Trash2, ExternalLink } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms' | 'dmca' | 'cookies';
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy'
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'dmca' | 'cookies'>(initialTab);
  const [dataCleared, setDataCleared] = useState(false);

  if (!isOpen) return null;

  const handleClearData = () => {
    try {
      localStorage.removeItem('spotitube_liked_tracks');
      localStorage.removeItem('spotitube_custom_playlists');
      localStorage.removeItem('spotitube_recent_searches_v2');
      localStorage.removeItem('spotitube_volume');
      setDataCleared(true);
      setTimeout(() => {
        setDataCleared(false);
      }, 3000);
    } catch (e) {
      console.warn('Could not clear local storage:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-3xl bg-[#181818] border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-[#121212]/90">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base sm:text-lg">Legal, Privacy & Compliance</h2>
              <p className="text-xs text-neutral-400">SpotiTube Official Launch & Rights Documentation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-neutral-800 bg-[#121212]/50 overflow-x-auto scrollbar-none text-xs sm:text-sm font-semibold">
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-[#1db954] text-[#1db954]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-[#1db954] text-[#1db954]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>

          <button
            onClick={() => setActiveTab('dmca')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dmca'
                ? 'border-[#1db954] text-[#1db954]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Copyright & DMCA</span>
          </button>

          <button
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'cookies'
                ? 'border-[#1db954] text-[#1db954]'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Cookie className="w-4 h-4" />
            <span>Cookies & Storage</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm text-neutral-300 leading-relaxed scrollbar-thin scrollbar-thumb-neutral-700">
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs">
                <strong>Privacy Commitment:</strong> SpotiTube does not collect, sell, or rent your personal data to third parties. We do not require registration, login credentials, or phone numbers.
              </div>

              <h3 className="text-white font-bold text-base">1. Information We Do NOT Collect</h3>
              <p>
                We do not track your IP address, name, physical location, or browsing habits across the web. There are no tracking pixels, profiling cookies, or analytics beacons embedded into the application.
              </p>

              <h3 className="text-white font-bold text-base">2. Local Browser Storage Only</h3>
              <p>
                All your playlists, favorite songs, search history, and volume settings are stored locally on your device via standard browser <code className="bg-black/60 px-1 py-0.5 rounded text-emerald-400">localStorage</code>. This data never leaves your computer and is never transmitted to any external marketing database.
              </p>

              <h3 className="text-white font-bold text-base">3. Embedded YouTube Playback</h3>
              <p>
                Audio playback is rendered using the official YouTube IFrame Embed Player API. When streaming, your browser establishes a secure direct connection with Google/YouTube CDN servers, governed by Google’s Privacy Policy.
              </p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-white font-bold text-base">1. Non-Commercial Media Discovery Platform</h3>
              <p>
                SpotiTube is an educational and personal music discovery player interface. It is provided free of charge for non-commercial media organization and listening purposes.
              </p>

              <h3 className="text-white font-bold text-base">2. YouTube Terms of Service Compliance</h3>
              <p>
                By using SpotiTube to stream audio content, users agree to be bound by the{' '}
                <a 
                  href="https://www.youtube.com/t/terms" 
                  target="_blank" 
                  rel="noreferrer" 
                  className="text-[#1db954] hover:underline inline-flex items-center gap-0.5"
                >
                  YouTube Terms of Service <ExternalLink className="w-3 h-3" />
                </a>.
              </p>

              <h3 className="text-white font-bold text-base">3. Intellectual Property</h3>
              <p>
                All music tracks, artwork, artist names, logos, and album covers displayed in the search engine or discovery view are the intellectual property of their respective recording artists, record labels, and copyright owners.
              </p>

              <h3 className="text-white font-bold text-base">4. Acceptable Use</h3>
              <p>
                Users agree not to attempt to rip, circumvent DRM, reverse-engineer, bulk scrape, or download unauthorized digital audio copies from the platform.
              </p>
            </div>
          )}

          {activeTab === 'dmca' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs text-neutral-300">
                <strong>No Media Files Stored:</strong> SpotiTube does not host, upload, or re-encode any media files. All streams are embedded via YouTube’s official public embed endpoints.
              </div>

              <h3 className="text-white font-bold text-base">Copyright & Takedown Notices (DMCA)</h3>
              <p>
                SpotiTube fully complies with the Digital Millennium Copyright Act (DMCA) and international intellectual property law. Because content is served directly from YouTube’s public catalogue, removing or making a video private on YouTube instantly removes it from SpotiTube worldwide.
              </p>

              <h3 className="text-white font-bold text-base">Content Inquiries</h3>
              <p>
                If you are a copyright owner or licensing representative and wish to request that specific metadata or YouTube video IDs be excluded from our local indexing, please contact the maintainer at{' '}
                <span className="text-[#1db954] font-mono">enneguazabdo259@gmail.com</span> with:
              </p>
              <ul className="list-disc list-inside space-y-1 text-neutral-400 pl-2">
                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                <li>The exact YouTube URL or track identifier.</li>
                <li>Your contact information and statement of authorization.</li>
              </ul>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-4 animate-fadeIn">
              <h3 className="text-white font-bold text-base">Cookie-Free Experience</h3>
              <p>
                SpotiTube does not set any advertising, tracking, or marketing cookies. You can browse, search, and play music without third-party tracking scripts recording your profile.
              </p>

              <h3 className="text-white font-bold text-base">Client-Side Functional Storage</h3>
              <p>The following local variables are retained in your browser strictly for playback functionality:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-xs">
                <div className="p-2.5 rounded bg-black/50 border border-neutral-800">
                  <span className="text-emerald-400 font-bold block">spotitube_liked_tracks</span>
                  <span className="text-neutral-400 text-[11px]">List of songs you added to Liked Tracks</span>
                </div>
                <div className="p-2.5 rounded bg-black/50 border border-neutral-800">
                  <span className="text-emerald-400 font-bold block">spotitube_custom_playlists</span>
                  <span className="text-neutral-400 text-[11px]">Playlists you created manually</span>
                </div>
                <div className="p-2.5 rounded bg-black/50 border border-neutral-800">
                  <span className="text-emerald-400 font-bold block">spotitube_recent_searches_v2</span>
                  <span className="text-neutral-400 text-[11px]">Recent search queries for quick re-trigger</span>
                </div>
                <div className="p-2.5 rounded bg-black/50 border border-neutral-800">
                  <span className="text-emerald-400 font-bold block">spotitube_volume</span>
                  <span className="text-neutral-400 text-[11px]">Your preferred audio volume level</span>
                </div>
              </div>

              {/* Reset Data Button */}
              <div className="pt-4 border-t border-neutral-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Clear Local Data</h4>
                  <p className="text-[11px] text-neutral-400">Remove all locally saved playlists, likes, and search history from this browser.</p>
                </div>
                <button
                  onClick={handleClearData}
                  className="px-3.5 py-1.5 rounded-full bg-neutral-800 hover:bg-red-900/40 text-neutral-300 hover:text-red-300 border border-neutral-700 hover:border-red-700/60 transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {dataCleared ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Data Cleared!</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear Data</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-800 bg-[#121212] flex items-center justify-between text-xs text-neutral-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1db954]" />
            <span>SpotiTube Media Platform • Verified Production Build</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-white text-black font-bold hover:bg-neutral-200 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
