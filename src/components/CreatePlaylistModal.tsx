import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { Playlist } from '../types/music';
import { STUDIO_PLAYLIST_COVERS } from '../data/curatedTracks';

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
  const [selectedCover, setSelectedCover] = useState(0);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newPlaylist: Playlist = {
      id: `custom_${Date.now()}`,
      name: name.trim(),
      description: description.trim() || 'Personal global mix on Kiddwave',
      coverImage: STUDIO_PLAYLIST_COVERS[selectedCover]?.url || STUDIO_PLAYLIST_COVERS[0].url,
      tracks: [],
      isCustom: true
    };

    onCreatePlaylist(newPlaylist);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#110E0F] border border-white/14 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-[#F4F1F1]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-[#A39E9F] hover:text-white p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#EF2323]/15 text-[#FF443A] flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-white">Create New Playlist</h2>
            <p className="text-xs text-[#A39E9F]">Mix songs from any country and genre</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#D0CBCC] mb-1.5">
              Playlist Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tokyo, Lagos & London Late Night"
              className="w-full bg-[#070607] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-[#6F6A6B] focus:outline-none focus:border-[#EF2323] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D0CBCC] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this collection..."
              className="w-full bg-[#070607] border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-[#6F6A6B] focus:outline-none focus:border-[#EF2323] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#D0CBCC] mb-2">
              Choose Cover Artwork
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {STUDIO_PLAYLIST_COVERS.map((opt, idx) => (
                <button
                  type="button"
                  key={opt.label}
                  onClick={() => setSelectedCover(idx)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                    selectedCover === idx ? 'border-[#EF2323] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
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
              className="px-4 py-2 rounded-xl font-semibold hover:bg-white/[0.06] text-[#D0CBCC] transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold bg-[#EF2323] hover:bg-[#FF3830] text-white transition-colors cursor-pointer text-xs shadow-[0_4px_14px_rgba(239,35,35,0.3)]"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
