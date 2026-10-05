import React, { useState } from 'react';
import { Clock, Folder, Plus, ChevronRight, Bookmark, Trash2, AlertTriangle, X } from 'lucide-react';
import type { SavedMovieItem, CustomPlaylist, Movie } from '../types';
import { MovieCard } from '../components/MovieCard';

interface LibraryScreenProps {
  savedMovies: SavedMovieItem[];
  playlists: CustomPlaylist[];
  onSelectSavedMovie: (item: SavedMovieItem) => void;
  onRemoveSavedMovie: (id: string) => void;
  onExplore: () => void;
  onCreatePlaylist: (name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onRemoveFromPlaylist: (playlistId: string, movieId: string) => void;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  savedMovies,
  playlists = [],
  onSelectSavedMovie,
  onRemoveSavedMovie,
  onExplore,
  onCreatePlaylist,
  onDeletePlaylist,
  onRemoveFromPlaylist,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'playlists'>('all');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Delete Confirmation Modal State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {},
  });

  const currentPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const confirmRemoveSavedMovie = (movie: SavedMovieItem) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Hapus dari Daftar Tersimpan?',
      description: `Apakah Anda yakin ingin menghapus "${movie.title}" dari koleksi tersimpan Anda?`,
      onConfirm: () => {
        onRemoveSavedMovie(movie._id);
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const confirmDeletePlaylist = (pl: CustomPlaylist) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Hapus Playlist?',
      description: `Apakah Anda yakin ingin menghapus playlist "${pl.name}"? Seluruh daftar di dalamnya akan dihapus.`,
      onConfirm: () => {
        onDeletePlaylist(pl.id);
        if (selectedPlaylistId === pl.id) setSelectedPlaylistId(null);
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const confirmRemoveFromPlaylist = (playlistId: string, movie: SavedMovieItem) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Hapus Film dari Playlist?',
      description: `Apakah Anda yakin ingin menghapus "${movie.title}" dari playlist ini?`,
      onConfirm: () => {
        onRemoveFromPlaylist(playlistId, movie._id);
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-28 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Daftar Saya & Playlist
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Koleksi film tersimpan dan playlist kustom buatan Anda.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-[#1F1F1F] border border-white/10 self-start">
          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedPlaylistId(null);
            }}
            className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#E50914] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Semua Tersimpan ({savedMovies.length})
          </button>
          <button
            onClick={() => setActiveTab('playlists')}
            className={`px-3.5 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'playlists'
                ? 'bg-[#E50914] text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Playlist Saya ({playlists.length})
          </button>
        </div>
      </div>

      {/* ALL SAVED MOVIES */}
      {activeTab === 'all' && (
        <>
          {savedMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {savedMovies.map((movie) => (
                <div key={movie._id} className="relative group">
                  <MovieCard
                    movie={movie as unknown as Movie}
                    onClick={() => onSelectSavedMovie(movie)}
                    layout="grid"
                    showRating={true}
                  />

                  {/* Delete Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmRemoveSavedMovie(movie);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
                    title="Hapus dari Daftar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {movie.progressPercent > 0 && (
                    <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                      <div
                        className="bg-[#E50914] h-1 rounded-full"
                        style={{ width: `${movie.progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-3 bg-[#181818] rounded-xl border border-white/10 p-8 max-w-md mx-auto">
              <Clock className="w-10 h-10 text-[#E50914] mx-auto opacity-70" />
              <h2 className="text-base font-bold text-white">Belum Ada Judul Tersimpan</h2>
              <p className="text-xs text-gray-400">
                Klik tombol "Daftar Saya" pada film atau series untuk menyimpannya di sini.
              </p>
              <button
                onClick={onExplore}
                className="px-5 py-2 rounded bg-[#E50914] text-white font-bold text-xs shadow-md"
              >
                Mulai Menonton
              </button>
            </div>
          )}
        </>
      )}

      {/* CUSTOM PLAYLISTS */}
      {activeTab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#E50914]" />
              <h2 className="text-sm font-bold text-white">
                {selectedPlaylistId && currentPlaylist ? `Playlist: ${currentPlaylist.name}` : 'Semua Playlist'}
              </h2>
            </div>

            {selectedPlaylistId ? (
              <button
                onClick={() => setSelectedPlaylistId(null)}
                className="text-xs font-bold text-[#E50914] hover:underline"
              >
                ← Kembali ke Daftar Playlist
              </button>
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 rounded bg-[#E50914] hover:bg-[#F40612] text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>Buat Playlist</span>
              </button>
            )}
          </div>

          {selectedPlaylistId && currentPlaylist ? (
            <div className="space-y-3">
              {currentPlaylist.items.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
                  {currentPlaylist.items.map((movie) => (
                    <div key={movie._id} className="relative group">
                      <MovieCard
                        movie={movie as unknown as Movie}
                        onClick={() => onSelectSavedMovie(movie)}
                        layout="grid"
                        showRating={true}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmRemoveFromPlaylist(selectedPlaylistId, movie);
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-red-600 text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
                        title="Hapus dari Playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-gray-400 bg-[#181818] rounded-xl p-6 border border-white/5">
                  Playlist ini masih kosong. Buka halaman detail film/drakor dan klik <b>"+ Tambah ke Koleksi"</b>!
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  className="group p-4 rounded-xl bg-[#181818] hover:bg-[#222222] border border-white/10 hover:border-[#E50914] transition-all cursor-pointer space-y-2 shadow-md relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-base">
                      <Bookmark className="w-4 h-4 text-[#E50914]" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeletePlaylist(pl);
                      }}
                      className="p-1.5 rounded-md hover:bg-red-600/20 text-gray-400 hover:text-red-400 transition-colors"
                      title="Hapus Playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#E50914] transition-colors truncate">
                      {pl.name}
                    </h3>
                    <p className="text-[11px] text-gray-400">{pl.items.length} Judul Film</p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-[#E50914] font-bold">
                    <span>Buka Playlist</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ⚠️ DELETE CONFIRMATION POP-UP MODAL (Exact match to Screenshot 2 style) */}
      {deleteConfirmation.isOpen && (
        <div 
          onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#161616] border border-white/15 rounded-2xl p-6 shadow-2xl ring-1 ring-white/10 space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-600/40 flex items-center justify-center text-red-500 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white">
                    {deleteConfirmation.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    {deleteConfirmation.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteConfirmation.onConfirm}
                className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-red-700 text-white text-xs font-black transition-all shadow-lg shadow-[#E50914]/30"
              >
                Ya, Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <div 
          onClick={() => setShowCreateModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <form 
            onSubmit={handleCreate} 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm bg-[#161616] border border-white/15 rounded-2xl p-5 shadow-2xl ring-1 ring-white/10 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-black text-white">Buat Playlist Baru</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Contoh: Drakor Favorit, Weekend Marathon..."
              className="w-full bg-[#202020] border border-white/10 focus:border-[#E50914] text-xs text-white rounded-xl p-3 outline-none"
              autoFocus
              required
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 text-gray-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#E50914] text-white font-black text-xs shadow-md"
              >
                Simpan Playlist
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
