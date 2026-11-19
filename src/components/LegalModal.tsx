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
      localStorage.removeItem('spotitube_liked_ids');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md">
      <div
        className="relative w-full max-w-3xl bg-[#110E0F] border border-white/14 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-[#F4F1F1]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] bg-[#0B0A0B]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EF2323]/15 text-[#FF443A] flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-white font-bold text-base sm:text-lg">Legal, Privacy &amp; Compliance</h2>
              <p className="text-xs text-[#A39E9F]">Kiddwave Platform Documentation</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-[#A39E9F] hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 pt-3 border-b border-white/[0.08] bg-[#0B0A0B]/60 overflow-x-auto scrollbar-none text-xs sm:text-sm font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'privacy'
                ? 'border-[#EF2323] text-[#FF443A]'
                : 'border-transparent text-[#A39E9F] hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Privacy Policy</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'terms'
                ? 'border-[#EF2323] text-[#FF443A]'
                : 'border-transparent text-[#A39E9F] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Terms of Service</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('dmca')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'dmca'
                ? 'border-[#EF2323] text-[#FF443A]'
                : 'border-transparent text-[#A39E9F] hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>Copyright &amp; DMCA</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cookies')}
            className={`flex items-center gap-2 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'cookies'
                ? 'border-[#EF2323] text-[#FF443A]'
                : 'border-transparent text-[#A39E9F] hover:text-white'
            }`}
          >
            <Cookie className="w-4 h-4" />
            <span>Storage</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs sm:text-sm text-[#D0CBCC] leading-relaxed">
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#EF2323]/10 border border-[#EF2323]/30 text-[#F4F1F1] text-xs">
                <strong>Privacy Commitment:</strong> Kiddwave does not collect, sell, or rent your personal data. No sign-up or credentials are required.
              </div>
              <h3 className="text-white font-bold text-base">1. Zero Personal Tracking</h3>
              <p>We do not embed advertising beacons, third-party profiling pixels, or behavioral analytics trackers.</p>
              <h3 className="text-white font-bold text-base">2. Local Device Storage</h3>
              <p>Your playlists, favorites, search history, and cached metadata are stored locally on your device via standard browser storage.</p>
              <h3 className="text-white font-bold text-base">3. Streaming Connections</h3>
              <p>Playback streams directly via official embedded APIs and verified audio streams subject to their terms.</p>
            </div>
          )}

          {activeTab === 'terms' && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-base">1. Personal Music Soundstage</h3>
              <p>Kiddwave is provided free of charge for personal music discovery and queue organization.</p>
              <h3 className="text-white font-bold text-base">2. Platform Terms Compliance</h3>
              <p>
                Streaming via embedded playback adheres to the{' '}
                <a
                  href="https://www.youtube.com/t/terms"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#FF443A] hover:underline inline-flex items-center gap-0.5"
                >
                  YouTube Terms of Service <ExternalLink className="w-3 h-3" />
                </a>.
              </p>
              <h3 className="text-white font-bold text-base">3. Intellectual Property</h3>
              <p>All tracks, titles, and cover artworks belong to their respective recording artists, labels, and copyright owners.</p>
            </div>
          )}

          {activeTab === 'dmca' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#070607]/85 border border-white/12 text-xs text-[#D0CBCC]">
                <strong>No Media Hosting:</strong> Kiddwave does not host or re-encode audio/video files on its servers.
              </div>
              <h3 className="text-white font-bold text-base">Copyright &amp; Takedowns (DMCA)</h3>
              <p>
                Removing or setting a video private immediately removes it from playback. For catalog exclusion requests, write to{' '}
                <span className="text-[#FF443A] font-mono">enneguazabdo259@gmail.com</span>.
              </p>
            </div>
          )}

          {activeTab === 'cookies' && (
            <div className="space-y-4">
              <h3 className="text-white font-bold text-base">Cookie-Free Local Storage</h3>
              <p>Only essential local preferences (favorites, custom playlists, recent searches, volume) are stored on your device.</p>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-white text-xs sm:text-sm">Clear Local Data</h4>
                  <p className="text-[11px] text-[#A39E9F]">Remove locally saved playlists, favorites, and search history.</p>
                </div>
                <button
                  type="button"
                  onClick={handleClearData}
                  className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-[#EF2323]/25 text-[#F4F1F1] hover:text-white border border-white/12 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  {dataCleared ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF443A]" />
                      <span className="text-[#FF443A]">Cleared</span>
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

        <div className="px-6 py-3.5 border-t border-white/[0.08] bg-[#0B0A0B] flex items-center justify-between text-xs text-[#A39E9F]">
          <span>Kiddwave Global Soundstage</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#EF2323] text-white font-bold hover:bg-[#FF3830] transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
