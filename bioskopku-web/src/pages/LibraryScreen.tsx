import React, { useState, useEffect } from 'react';
import { 
  Clock, Folder, Plus, ChevronRight, Bookmark, Trash2, 
  AlertTriangle, X, HardDrive 
} from 'lucide-react';
import type { SavedMovieItem, CustomPlaylist, Movie, MovieDetails } from '../types';
import { MovieCard } from '../components/MovieCard';
import { fetchLocalMovies, saveMovieToLocalDB, deleteMovieFromLocalDB } from '../services/localMovies';

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
  const [activeTab, setActiveTab] = useState<'all' | 'playlists' | 'local'>('all');
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Local PC Movies State
  const [localMovies, setLocalMovies] = useState<MovieDetails[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [showAddLocalModal, setShowAddLocalModal] = useState(false);
  const [localFormData, setLocalFormData] = useState({
    title: '',
    type: 'movie' as 'movie' | 'series',
    year: '2024',
    rating: '8.5',
    posterImg: '',
    videoUrl: '',
    localFilePath: '',
    genres: 'Action, Sci-Fi',
    synopsis: '',
  });

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

  const loadLocalMovies = async () => {
    setLoadingLocal(true);
    try {
      const data = await fetchLocalMovies();
      setLocalMovies(data);
    } catch (e) {}
    setLoadingLocal(false);
  };

  useEffect(() => {
    loadLocalMovies();
  }, []);

  const currentPlaylist = playlists.find(p => p.id === selectedPlaylistId);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName('');
      setShowCreateModal(false);
    }
  };

  const handleAddLocalMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localFormData.title.trim()) return;

    const newMovie: MovieDetails = {
      _id: `local-${Date.now()}`,
      title: localFormData.title.trim(),
      type: localFormData.type,
      year: localFormData.year || '2024',
      rating: localFormData.rating || '8.5',
      posterImg: localFormData.posterImg.trim() || 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
      backdropImg: localFormData.posterImg.trim() || '',
      genres: localFormData.genres.split(',').map(g => g.trim()).filter(Boolean),
      synopsis: localFormData.synopsis.trim() || 'Film tersimpan di database lokal laptop/PC.',
      videoUrl: localFormData.videoUrl.trim(),
      localFilePath: localFormData.localFilePath.trim(),
      duration: '2j 00m',
      quality: '1080p Full HD',
      qualityResolution: '1080p FULL HD',
      releaseDate: localFormData.year ? `${localFormData.year}-01-01` : '2024-01-01',
      trailerUrl: '',
      directors: ['Sutradara'],
      countries: ['Indonesia'],
      casts: ['Aktor'],
      streamSources: [
        {
          provider: 'Local Hard Drive / PC',
          url: localFormData.videoUrl.trim() || localFormData.localFilePath.trim() || '',
          quality: '1080p Offline'
        }
      ]
    };

    await saveMovieToLocalDB(newMovie);
    setShowAddLocalModal(false);
    setLocalFormData({
      title: '',
      type: 'movie',
      year: '2024',
      rating: '8.5',
      posterImg: '',
      videoUrl: '',
      localFilePath: '',
      genres: 'Action, Sci-Fi',
      synopsis: '',
    });
    await loadLocalMovies();
  };

  const confirmRemoveLocalMovie = (movie: MovieDetails) => {
    setDeleteConfirmation({
      isOpen: true,
      title: 'Hapus dari Database PC?',
      description: `Apakah Anda yakin ingin menghapus "${movie.title}" dari database lokal laptop Anda?`,
      onConfirm: async () => {
        await deleteMovieFromLocalDB(movie._id);
        await loadLocalMovies();
        setDeleteConfirmation(prev => ({ ...prev, isOpen: false }));
      }
    });
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
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Daftar Saya & Database Film</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Koleksi film tersimpan, playlist kustom, dan database film lokal di hard drive PC/Laptop Anda.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-[4px] bg-[#121318] border border-white/10 self-start">
          <button
            onClick={() => {
              setActiveTab('all');
              setSelectedPlaylistId(null);
            }}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-[#FF2E2E] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Tersimpan ({savedMovies.length})
          </button>

          <button
            onClick={() => {
              setActiveTab('local');
              setSelectedPlaylistId(null);
              loadLocalMovies();
            }}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'local'
                ? 'bg-[#FF2E2E] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>Database PC ({localMovies.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('playlists');
              setSelectedPlaylistId(null);
            }}
            className={`px-3 py-1.5 rounded-[3px] text-xs font-bold transition-all ${
              activeTab === 'playlists'
                ? 'bg-[#FF2E2E] text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Playlist ({playlists.length})
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: LOCAL PC MOVIES DATABASE
         ========================================================================= */}
      {activeTab === 'local' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[#121318] border border-white/10 rounded-[4px]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[3px] bg-[#FF2E2E]/15 border border-[#FF2E2E]/30 flex items-center justify-center text-[#FF2E2E]">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Penyimpanan Film di Hard Drive Laptop/PC</span>
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-[2px] font-bold">
                    MySQL & JSON Terhubung
                  </span>
                </h2>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  File tersimpan permanen di folder proyek server (`server/movies_local.json` & tabel MySQL `movies`).
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAddLocalModal(true)}
              className="px-4 py-2 rounded-[3px] bg-[#FF2E2E] hover:bg-[#E52525] text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-[#FF2E2E]/25 transition-all self-start sm:self-auto shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>+ Tambah Film ke Laptop</span>
            </button>
          </div>

          {loadingLocal ? (
            <div className="py-16 text-center text-xs font-mono text-zinc-400">
              Memuat data film dari database lokal PC...
            </div>
          ) : localMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {localMovies.map((movie) => (
                <div key={movie._id} className="relative group">
                  <MovieCard
                    movie={movie as unknown as Movie}
                    onClick={() => onSelectSavedMovie(movie as unknown as SavedMovieItem)}
                    layout="grid"
                    showRating={true}
                  />

                  {/* Local Storage Indicator Badge */}
                  <div className="absolute bottom-2 left-2 pointer-events-none z-10">
                    <span className="text-[9px] font-mono font-bold bg-black/85 border border-[#FF2E2E]/40 text-[#FF2E2E] px-1.5 py-0.5 rounded-[2px]">
                      💾 PC DB
                    </span>
                  </div>

                  {/* Delete Button on Hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmRemoveLocalMovie(movie);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-[3px] bg-black/80 hover:bg-[#FF2E2E] text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
                    title="Hapus dari Database PC"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-16 text-center space-y-3 bg-[#121318] rounded-[4px] border border-white/10 p-8 max-w-md mx-auto">
              <HardDrive className="w-10 h-10 text-[#FF2E2E] mx-auto opacity-80" />
              <h2 className="text-base font-bold text-white">Database Lokal Masih Kosong</h2>
              <p className="text-xs text-zinc-400">
                Anda bisa menyimpan film apa saja langsung dari halaman detail, atau menambahkan film koleksi pribadi Anda di PC.
              </p>
              <button
                onClick={() => setShowAddLocalModal(true)}
                className="px-5 py-2 rounded-[3px] bg-[#FF2E2E] text-white font-bold text-xs shadow-md"
              >
                + Tambah Film Sekarang
              </button>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: ALL SAVED MOVIES (REGULAR WATCHLIST)
         ========================================================================= */}
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
                    className="absolute top-2 right-2 p-1.5 rounded-[3px] bg-black/80 hover:bg-[#FF2E2E] text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
                    title="Hapus dari Daftar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  {movie.progressPercent > 0 && (
                    <div className="w-full bg-white/10 rounded-full h-1 mt-1">
                      <div
                        className="bg-[#FF2E2E] h-1 rounded-full"
                        style={{ width: `${movie.progressPercent}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-3 bg-[#121318] rounded-[4px] border border-white/10 p-8 max-w-md mx-auto">
              <Clock className="w-10 h-10 text-[#FF2E2E] mx-auto opacity-70" />
              <h2 className="text-base font-bold text-white">Belum Ada Judul Tersimpan</h2>
              <p className="text-xs text-zinc-400">
                Klik tombol "Daftar Saya" pada film atau series untuk menyimpannya di sini.
              </p>
              <button
                onClick={onExplore}
                className="px-5 py-2 rounded-[3px] bg-[#FF2E2E] text-white font-bold text-xs shadow-md"
              >
                Mulai Menonton
              </button>
            </div>
          )}
        </>
      )}

      {/* =========================================================================
          TAB 3: CUSTOM PLAYLISTS
         ========================================================================= */}
      {activeTab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-4 h-4 text-[#FF2E2E]" />
              <h2 className="text-sm font-bold text-white">
                {selectedPlaylistId && currentPlaylist ? `Playlist: ${currentPlaylist.name}` : 'Semua Playlist'}
              </h2>
            </div>

            {selectedPlaylistId ? (
              <button
                onClick={() => setSelectedPlaylistId(null)}
                className="text-xs font-bold text-[#FF2E2E] hover:underline"
              >
                ← Kembali ke Daftar Playlist
              </button>
            ) : (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-3.5 py-1.5 rounded-[3px] bg-[#FF2E2E] hover:bg-[#E52525] text-white text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
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
                        className="absolute top-2 right-2 p-1.5 rounded-[3px] bg-black/80 hover:bg-[#FF2E2E] text-white opacity-0 group-hover:opacity-100 transition-all shadow-lg z-20"
                        title="Hapus dari Playlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-xs text-zinc-400 bg-[#121318] rounded-[4px] p-6 border border-white/5">
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
                  className="group p-4 rounded-[4px] bg-[#121318] hover:bg-[#181920] border border-white/10 hover:border-[#FF2E2E] transition-all cursor-pointer space-y-2 shadow-md relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="w-9 h-9 rounded-[3px] bg-[#FF2E2E]/15 border border-[#FF2E2E]/40 flex items-center justify-center text-base">
                      <Bookmark className="w-4 h-4 text-[#FF2E2E]" />
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmDeletePlaylist(pl);
                      }}
                      className="p-1.5 rounded-[3px] hover:bg-[#FF2E2E]/20 text-zinc-400 hover:text-[#FF2E2E] transition-colors"
                      title="Hapus Playlist"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#FF2E2E] transition-colors truncate">
                      {pl.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400">{pl.items.length} Judul Film</p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-[#FF2E2E] font-bold">
                    <span>Buka Playlist</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: TAMBAH FILM BARU KE DATABASE PC
         ========================================================================= */}
      {showAddLocalModal && (
        <div 
          onClick={() => setShowAddLocalModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <form 
            onSubmit={handleAddLocalMovie} 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#121318] border border-white/15 rounded-[4px] p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#FF2E2E]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Simpan Film ke Database PC / Laptop
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddLocalModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 font-mono mb-1">Judul Film *</label>
                <input
                  type="text"
                  value={localFormData.title}
                  onChange={(e) => setLocalFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Interstellar, Fast X, Gundala..."
                  className="w-full bg-[#1A1B22] border border-white/10 focus:border-[#FF2E2E] text-white rounded-[3px] p-2.5 outline-none font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-mono mb-1">Tipe</label>
                  <select
                    value={localFormData.type}
                    onChange={(e) => setLocalFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="w-full bg-[#1A1B22] border border-white/10 focus:border-[#FF2E2E] text-white rounded-[3px] p-2.5 outline-none font-semibold"
                  >
                    <option value="movie">Film Bioskop (Movie)</option>
                    <option value="series">Serial TV / Series</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-mono mb-1">Tahun Rilis</label>
                  <input
                    type="text"
                    value={localFormData.year}
                    onChange={(e) => setLocalFormData(prev => ({ ...prev, year: e.target.value }))}
                    placeholder="2024"
                    className="w-full bg-[#1A1B22] border border-white/10 focus:border-[#FF2E2E] text-white rounded-[3px] p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">URL Poster Gambar</label>
                <input
                  type="url"
                  value={localFormData.posterImg}
                  onChange={(e) => setLocalFormData(prev => ({ ...prev, posterImg: e.target.value }))}
                  placeholder="https://image.tmdb.org/t/p/w500/... atau link poster"
                  className="w-full bg-[#1A1B22] border border-white/10 focus:border-[#FF2E2E] text-white rounded-[3px] p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">Path File Video di PC / Link Video</label>
                <input
                  type="text"
                  value={localFormData.videoUrl}
                  onChange={(e) => setLocalFormData(prev => ({ ...prev, videoUrl: e.target.value }))}
                  placeholder="C:\Users\loq\Videos\film.mp4 atau https://..."
                  className="w-full bg-[#1A1B22] border border-white/10 focus:border-[#FF2E2E] text-white rounded-[3px] p-2.5 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">Genre (pisahkan dengan koma)</label>
                <input
                  type="text"
                  value={localFormData.genres}
                  onChange={(e) => setLocalFormData(prev => ({ ...prev, genres: e.target.value }))}
                  placeholder="Action, Thriller, Sci-Fi"
                  className="w-full bg-[#1A1B22] border border-white/10 focus:border-[#FF2E2E] text-white rounded-[3px] p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-mono mb-1">Sinopsis Singkat</label>
                <textarea
                  value={localFormData.synopsis}
                  onChange={(e) => setLocalFormData(prev => ({ ...prev, synopsis: e.target.value }))}
                  placeholder="Deskripsi singkat mengenai jalan cerita film ini..."
                  rows={2}
                  className="w-full bg-[#1A1B22] border border-white/10 focus:border-[#FF2E2E] text-white rounded-[3px] p-2.5 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowAddLocalModal(false)}
                className="flex-1 py-2.5 rounded-[3px] bg-white/10 text-zinc-300 text-xs font-bold hover:bg-white/15"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-[3px] bg-[#FF2E2E] text-white font-bold text-xs shadow-md shadow-[#FF2E2E]/25 hover:bg-[#E52525]"
              >
                Simpan ke Database PC
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ⚠️ DELETE CONFIRMATION POP-UP MODAL */}
      {deleteConfirmation.isOpen && (
        <div 
          onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-[#121318] border border-white/15 rounded-[4px] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[3px] bg-[#FF2E2E]/20 border border-[#FF2E2E]/40 flex items-center justify-center text-[#FF2E2E] shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    {deleteConfirmation.title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                    {deleteConfirmation.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
                className="text-zinc-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setDeleteConfirmation(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 rounded-[3px] bg-white/10 hover:bg-white/15 text-zinc-300 hover:text-white text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={deleteConfirmation.onConfirm}
                className="px-4 py-2 rounded-[3px] bg-[#FF2E2E] hover:bg-[#E52525] text-white text-xs font-bold transition-all shadow-lg shadow-[#FF2E2E]/30"
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
            className="relative w-full max-w-sm bg-[#121318] border border-white/15 rounded-[4px] p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white">Buat Playlist Baru</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Contoh: Drakor Favorit, Weekend Marathon..."
              className="w-full bg-[#1A1B22] border border-white/10 focus:border-[#FF2E2E] text-xs text-white rounded-[3px] p-3 outline-none"
              autoFocus
              required
            />

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="flex-1 py-2.5 rounded-[3px] bg-white/10 text-zinc-300 text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-[3px] bg-[#FF2E2E] text-white font-bold text-xs shadow-md"
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
