import React, { useState } from 'react';
import { X, Plus, Music2, Sparkles } from 'lucide-react';
import { Playlist } from '../types/music';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreatePlaylist: (playlist: Playlist) => void;
}

export const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  isOpen,
  onClose,
  onCreatePlaylist
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(0);

  if (!isOpen) return null;

  const gradientOptions = [
    {
      url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=80',
      label: 'Festival Glow'
    },
    {
      url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&auto=format&fit=crop&q=80',
      label: 'DJ Beats'
    },
    {
      url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop&q=80',
      label: 'Vintage Mic'
    },
    {
      url: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?w=500&auto=format&fit=crop&q=80',
      label: 'Night Stage'
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPlaylist: Playlist = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Personal mix created on SpotiTube',
      coverImage: gradientOptions[selectedGradient].url,
      tracks: [],
      isCustom: true
    };

    onCreatePlaylist(newPlaylist);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-[#181818] border border-neutral-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-white">
        <button
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-9 h-9 rounded-full bg-[#1db954]/20 text-[#1db954] flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold">Create New Playlist</h2>
            <p className="text-xs text-neutral-400">Curate your favorite tracks and mix genres</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Playlist Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Moroccan Chaabi & Rai Night"
              className="w-full bg-[#121212] border border-neutral-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-[#1db954] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Give your playlist a vibe or notes..."
              className="w-full bg-[#121212] border border-neutral-700 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-[#1db954] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
              Choose Artwork Cover
            </label>
            <div className="grid grid-cols-4 gap-2">
              {gradientOptions.map((opt, idx) => (
                <button
                  type="button"
                  key={opt.label}
                  onClick={() => setSelectedGradient(idx)}
                  className={`relative rounded-lg overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                    selectedGradient === idx ? 'border-[#1db954] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={opt.url} alt={opt.label} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full font-semibold hover:bg-neutral-800 text-neutral-300 transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-full font-bold bg-[#1db954] hover:bg-[#1ed760] text-black transition-all hover:scale-105 active:scale-95 cursor-pointer text-xs"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
