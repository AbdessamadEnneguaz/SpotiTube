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
      description: description.trim() || 'Personal global mix on SpotiTube',
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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#1B1815] border border-[#EAE0D0]/12 w-full max-w-md rounded-2xl p-6 shadow-2xl relative text-[#F5F0E8]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-[#9E9384] hover:text-[#F5F0E8] p-1.5 rounded-lg hover:bg-[#EAE0D0]/[0.06] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-[#D8C3A5]/15 text-[#DFCCB0] flex items-center justify-center">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-[#F5F0E8]">Create New Playlist</h2>
            <p className="text-xs text-[#9E9384]">Mix songs from any country and genre</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#C8BEB0] mb-1.5">
              Playlist Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tokyo, Lagos & London Late Night"
              className="w-full bg-[#12100E] border border-[#EAE0D0]/15 rounded-xl px-3.5 py-2.5 text-sm text-[#F5F0E8] placeholder:text-[#8F8476] focus:outline-none focus:border-[#D8C3A5] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#C8BEB0] mb-1.5">
              Description (Optional)
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add notes about this collection..."
              className="w-full bg-[#12100E] border border-[#EAE0D0]/15 rounded-xl px-3.5 py-2 text-xs text-[#F5F0E8] placeholder:text-[#8F8476] focus:outline-none focus:border-[#D8C3A5] transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#C8BEB0] mb-2">
              Choose Cover Artwork
            </label>
            <div className="grid grid-cols-4 gap-2.5">
              {STUDIO_PLAYLIST_COVERS.map((opt, idx) => (
                <button
                  type="button"
                  key={opt.label}
                  onClick={() => setSelectedCover(idx)}
                  className={`relative rounded-xl overflow-hidden aspect-square border-2 transition-all cursor-pointer ${
                    selectedCover === idx ? 'border-[#D8C3A5] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
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
              className="px-4 py-2 rounded-xl font-semibold hover:bg-[#EAE0D0]/[0.06] text-[#C8BEB0] transition-colors cursor-pointer text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl font-bold bg-[#D8C3A5] hover:bg-[#E4D3BA] text-[#12100E] transition-colors cursor-pointer text-xs"
            >
              Create Playlist
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
