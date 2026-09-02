
import React, { useState } from 'react';
import { X, FolderPlus, Check, Bookmark } from 'lucide-react';
import type { MovieDetails, CustomPlaylist } from '../types';

interface AddToPlaylistModalProps {
  isOpen: boolean;
  movie: MovieDetails | null;
  playlists: CustomPlaylist[];
  onClose: () => void;
  onAddToPlaylist: (playlistId: string, movie: MovieDetails) => void;
  onCreatePlaylist: (name: string, movie?: MovieDetails) => void;
}

export const AddToPlaylistModal: React.FC<AddToPlaylistModalProps> = ({
  isOpen,
  movie,
  playlists,
  onClose,
  onAddToPlaylist,
  onCreatePlaylist,
}) => {
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateInput, setShowCreateInput] = useState(false);

  if (!isOpen || !movie) return null;

  const handleCreateAndAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim(), movie);
      setNewPlaylistName('');
      setShowCreateInput(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#181818] border border-white/10 rounded-xl p-6 shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#E50914]" />
            <h2 className="text-sm font-bold text-white">
              Tambah ke Playlist Saya
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded bg-[#242424] border border-white/5">
          <img
            src={movie.posterImg}
            alt={movie.title}
            className="w-10 aspect-[2/3] object-cover rounded"
          />
          <div className="overflow-hidden">
            <h3 className="text-xs font-bold text-white truncate">{movie.title}</h3>
            <p className="text-[10px] text-gray-400">{movie.year}</p>
          </div>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {playlists.map((pl) => {
            const isAlreadyAdded = pl.items.some(m => m._id === movie._id);
            return (
              <div
                key={pl.id}
                onClick={() => {
                  if (!isAlreadyAdded) {
                    onAddToPlaylist(pl.id, movie);
                    onClose();
                  }
                }}
                className={`p-3 rounded border transition-all flex items-center justify-between cursor-pointer ${
                  isAlreadyAdded 
                    ? 'bg-[#E50914]/20 border-[#E50914] text-[#E50914]' 
                    : 'bg-[#222222] hover:bg-[#2e2e2e] border-white/5 text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span>📁</span>
                  <div>
                    <h4 className="text-xs font-bold">{pl.name}</h4>
                    <span className="text-[10px] text-gray-400">{pl.items.length} judul</span>
                  </div>
                </div>

                {isAlreadyAdded ? (
                  <span className="text-xs font-bold flex items-center gap-1 text-[#E50914]">
                    <Check className="w-3.5 h-3.5" /> Ada
                  </span>
                ) : (
                  <span className="text-xs font-bold text-gray-400 hover:text-white">
                    + Tambah
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {showCreateInput ? (
          <form onSubmit={handleCreateAndAdd} className="space-y-2 pt-2 border-t border-white/10">
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Nama playlist baru..."
              className="w-full bg-[#242424] border border-white/10 text-xs text-white rounded p-2 outline-none"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="flex-1 py-1.5 rounded bg-[#E50914] text-white font-bold text-xs"
              >
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setShowCreateInput(false)}
                className="px-3 py-1.5 rounded bg-white/10 text-gray-300 text-xs"
              >
                Batal
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateInput(true)}
            className="w-full py-2.5 rounded bg-white/5 hover:bg-white/10 text-xs font-bold text-[#E50914] flex items-center justify-center gap-1.5 transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            <span>+ Buat Playlist Baru</span>
          </button>
        )}
      </div>
    </div>
  );
};
