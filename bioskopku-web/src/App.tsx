
import { useState, useEffect } from 'react';
import type { Movie, MovieDetails, SavedMovieItem, TabType, EpisodeItem, User, CustomPlaylist } from './types';
import { 
  fetchPopularMovies, 
  fetchPopularSeries,
  fetchKdramaSeries,
  fetchDracinSeries,
  fetchJdramaSeries,
  fetchAnimeSeries,
  fetchNewReleases, 
  fetchTopRated,
  fetchIndonesianMovies, 
  fetchMovieDetails,
  fetchMoviesByGenre
} from './services/api';
import { getActiveUser, removeActiveUser } from './services/auth';

import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { GenrePreferenceModal } from './components/GenrePreferenceModal';
import { AddToPlaylistModal } from './components/AddToPlaylistModal';
import { SecurityDashboardModal } from './components/SecurityDashboardModal';

import { AuthScreen } from './pages/AuthScreen';
import { HomeScreen } from './pages/HomeScreen';
import { DetailScreen } from './pages/DetailScreen';
import { DiscoverScreen } from './pages/DiscoverScreen';
import { LibraryScreen } from './pages/LibraryScreen';
import { ProfileScreen } from './pages/ProfileScreen';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => getActiveUser());
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [activeCategory, setActiveCategory] = useState<string>('home');
  const [selectedMovie, setSelectedMovie] = useState<MovieDetails | null>(null);
  const [searchQueryForDiscover, setSearchQueryForDiscover] = useState<string>('');
  const [selectedGenreForDiscover, setSelectedGenreForDiscover] = useState<string | undefined>();

  const [featuredMovies, setFeaturedMovies] = useState<MovieDetails[]>([]);
  const [trendingMovies, setTrendingMovies] = useState<(Movie | MovieDetails)[]>([]);
  const [newReleases, setNewReleases] = useState<(Movie | MovieDetails)[]>([]);
  const [seriesMovies, setSeriesMovies] = useState<(Movie | MovieDetails)[]>([]);
  const [kdramaMovies, setKdramaMovies] = useState<(Movie | MovieDetails)[]>([]);
  const [dracinMovies, setDracinMovies] = useState<(Movie | MovieDetails)[]>([]);
  const [jdramaMovies, setJdramaMovies] = useState<(Movie | MovieDetails)[]>([]);
  const [animeMovies, setAnimeMovies] = useState<(Movie | MovieDetails)[]>([]);
  const [topRated, setTopRated] = useState<(Movie | MovieDetails)[]>([]);
  const [indonesianMovies, setIndonesianMovies] = useState<(Movie | MovieDetails)[]>([]);

  // Saved Movies Store
  const [savedMovies, setSavedMovies] = useState<SavedMovieItem[]>(() => {
    const cached = localStorage.getItem('bioskopku_saved');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return [];
  });

  // Custom User Playlists Store
  const [playlists, setPlaylists] = useState<CustomPlaylist[]>(() => {
    const cached = localStorage.getItem('bioskopku_playlists');
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return [
      {
        id: 'pl-drakor-fav',
        name: 'Drakor Favorit',
        description: 'Koleksi drama Korea wajib tonton',
        createdAt: Date.now() - 3600000 * 24,
        movieCount: 0,
        items: []
      },
      {
        id: 'pl-dracin-marathon',
        name: 'Dracin Romantis',
        description: 'Drama China romantis dan wuxia',
        createdAt: Date.now() - 3600000 * 12,
        movieCount: 0,
        items: []
      }
    ];
  });

  const [playlistModalMovie, setPlaylistModalMovie] = useState<MovieDetails | null>(null);

  const [videoModal, setVideoModal] = useState<{
    isOpen: boolean;
    movie: MovieDetails | null;
    mode: 'trailer' | 'stream';
    season: number;
    episode: number;
    episodeItem?: EpisodeItem | null;
  }>({
    isOpen: false,
    movie: null,
    mode: 'stream',
    season: 1,
    episode: 1,
    episodeItem: null,
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    localStorage.setItem('bioskopku_saved', JSON.stringify(savedMovies));
  }, [savedMovies]);

  useEffect(() => {
    localStorage.setItem('bioskopku_playlists', JSON.stringify(playlists));
  }, [playlists]);

  // Load catalog on mount and apply genre preferences if available
  useEffect(() => {
    const userPref = currentUser?.genres && currentUser.genres.length > 0 ? currentUser.genres[0] : null;

    if (userPref) {
      fetchMoviesByGenre(userPref).then((movies) => {
        if (movies.length > 0) {
          setFeaturedMovies(movies.slice(0, 5) as MovieDetails[]);
          setTrendingMovies(movies);
        }
      });
    } else {
      fetchPopularMovies().then((movies) => {
        if (movies.length > 0) {
          setFeaturedMovies(movies.slice(0, 5) as MovieDetails[]);
          setTrendingMovies(movies);
        }
      });
    }

    fetchKdramaSeries().then((kdrama) => {
      if (kdrama.length > 0) setKdramaMovies(kdrama);
    });

    fetchDracinSeries().then((dracin) => {
      if (dracin.length > 0) setDracinMovies(dracin);
    });

    fetchJdramaSeries().then((jdrama) => {
      if (jdrama.length > 0) setJdramaMovies(jdrama);
    });

    fetchPopularSeries().then((series) => {
      if (series.length > 0) setSeriesMovies(series);
    });

    fetchAnimeSeries().then((anime) => {
      if (anime.length > 0) setAnimeMovies(anime);
    });

    fetchNewReleases().then((releases) => {
      if (releases.length > 0) setNewReleases(releases);
    });

    fetchTopRated().then((top) => {
      if (top.length > 0) setTopRated(top);
    });

    fetchIndonesianMovies().then((indo) => {
      if (indo.length > 0) setIndonesianMovies(indo);
    });
  }, [currentUser]);

  // Back button popstate listener
  useEffect(() => {
    const handlePopState = () => {
      if (videoModal.isOpen) {
        setVideoModal(prev => ({ ...prev, isOpen: false }));
      } else if (selectedMovie) {
        setSelectedMovie(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [videoModal.isOpen, selectedMovie]);

  // ONLY SHOW GENRE PREFERENCES WHEN REGISTERING A BRAND NEW ACCOUNT
  const handleAuthSuccess = (user: User, isNewUser: boolean) => {
    setCurrentUser(user);
    if (isNewUser) {
      setShowGenreModal(true);
    } else {
      setShowGenreModal(false);
      showToast(`Selamat datang kembali, ${user.name}!`);
    }
  };

  const handleGenreSelectionCompleted = (selectedGenres: string[]) => {
    if (currentUser) {
      const updated = { ...currentUser, genres: selectedGenres };
      setCurrentUser(updated);
    }
    setShowGenreModal(false);
    showToast('Preferensi genre disimpan! Beranda disesuaikan.');
  };

  const handleLogout = () => {
    removeActiveUser();
    setCurrentUser(null);
    setShowGenreModal(false);
    showToast('Berhasil logout.');
  };

  // Custom Playlist Management
  const handleCreatePlaylist = (name: string, initialMovie?: MovieDetails) => {
    const initialItems: SavedMovieItem[] = initialMovie ? [{
      _id: initialMovie._id,
      title: initialMovie.title,
      type: initialMovie.type,
      posterImg: initialMovie.posterImg,
      duration: initialMovie.duration || '2h',
      progressPercent: 0,
      completed: false,
      savedAt: Date.now(),
      genres: initialMovie.genres,
    }] : [];

    const newPl: CustomPlaylist = {
      id: 'pl-' + Date.now(),
      name: name,
      createdAt: Date.now(),
      movieCount: initialItems.length,
      items: initialItems,
    };

    setPlaylists(prev => [newPl, ...prev]);
    showToast(`Playlist "${name}" berhasil dibuat!`);
  };

  const handleAddToPlaylist = (playlistId: string, movie: MovieDetails) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        if (pl.items.some(m => m._id === movie._id)) return pl;
        const newItem: SavedMovieItem = {
          _id: movie._id,
          title: movie.title,
          type: movie.type,
          posterImg: movie.posterImg,
          duration: movie.duration || '2h',
          progressPercent: 0,
          completed: false,
          savedAt: Date.now(),
          genres: movie.genres,
        };
        return {
          ...pl,
          movieCount: pl.items.length + 1,
          items: [newItem, ...pl.items]
        };
      }
      return pl;
    }));
    showToast(`Ditambahkan ke playlist!`);
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    showToast('Playlist dihapus.');
  };

  const handleRemoveFromPlaylist = (playlistId: string, movieId: string) => {
    setPlaylists(prev => prev.map(pl => {
      if (pl.id === playlistId) {
        const filtered = pl.items.filter(m => m._id !== movieId);
        return {
          ...pl,
          movieCount: filtered.length,
          items: filtered
        };
      }
      return pl;
    }));
    showToast('Judul dihapus dari playlist.');
  };

  const handleSelectMovie = async (movie: Movie | MovieDetails) => {
    window.history.pushState({ view: 'detail', id: movie._id }, '', '#' + movie._id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const fullDetail = await fetchMovieDetails(movie._id);
    setSelectedMovie(fullDetail || (movie as MovieDetails));
  };

  const handleBack = () => {
    setSelectedMovie(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleWatchTrailer = (movie: MovieDetails) => {
    setVideoModal({
      isOpen: true,
      movie,
      mode: 'trailer',
      season: 1,
      episode: 1,
      episodeItem: null,
    });
  };

  const handleWatchNow = (movie: MovieDetails, season = 1, episode = 1, epItem?: EpisodeItem) => {
    setSavedMovies((prev) => {
      const exists = prev.find((m) => m._id === movie._id);
      if (exists) {
        return prev.map((m) =>
          m._id === movie._id ? { 
            ...m, 
            lastWatchedAt: Date.now(),
            currentSeason: season,
            currentEpisode: episode
          } : m
        );
      }
      const newItem: SavedMovieItem = {
        _id: movie._id,
        title: movie.title,
        type: movie.type,
        posterImg: movie.posterImg,
        backdropImg: movie.backdropImg,
        duration: movie.duration || '2h 15m',
        progressPercent: 20,
        completed: false,
        savedAt: Date.now(),
        lastWatchedAt: Date.now(),
        rating: movie.rating,
        genres: movie.genres,
        synopsis: movie.synopsis,
        currentSeason: season,
        currentEpisode: episode,
      };
      return [newItem, ...prev];
    });

    setVideoModal({
      isOpen: true,
      movie,
      mode: 'stream',
      season: season,
      episode: episode,
      episodeItem: epItem || null,
    });
  };

  const handleToggleSave = (movie: MovieDetails) => {
    setSavedMovies((prev) => {
      const exists = prev.some((m) => m._id === movie._id);
      if (exists) {
        showToast(`${movie.title} dihapus dari daftar tersimpan`);
        return prev.filter((m) => m._id !== movie._id);
      } else {
        showToast(`${movie.title} disimpan ke Library!`);
        const newItem: SavedMovieItem = {
          _id: movie._id,
          title: movie.title,
          type: movie.type,
          posterImg: movie.posterImg,
          backdropImg: movie.backdropImg,
          duration: movie.duration || '2h 15m',
          progressPercent: 10,
          completed: false,
          savedAt: Date.now(),
          rating: movie.rating,
          genres: movie.genres,
          synopsis: movie.synopsis,
        };
        return [newItem, ...prev];
      }
    });
  };

  const handleRemoveSavedMovie = (id: string) => {
    setSavedMovies((prev) => prev.filter((m) => m._id !== id));
    showToast('Judul dihapus dari daftar');
  };

  const handleSelectSavedMovie = async (item: SavedMovieItem) => {
    const fullDetail = await fetchMovieDetails(item._id);
    if (fullDetail) {
      setSelectedMovie(fullDetail);
    }
  };

  const handleSearchFromNavbar = (query: string) => {
    setSelectedMovie(null);
    setSearchQueryForDiscover(query);
    setActiveTab('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateDiscover = (genre?: string) => {
    setSelectedGenreForDiscover(genre || 'K-Drama');
    setSearchQueryForDiscover('');
    setSelectedMovie(null);
    setActiveTab('search');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If user is not logged in, show AuthScreen
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0D12] text-white flex flex-col justify-between selection:bg-[#F5B301] selection:text-black">
      <div className="w-full min-h-screen flex flex-col bg-[#0B0D12] relative">
        
        <Navbar 
          activeTab={activeTab}
          selectedCategory={activeCategory}
          onChangeTab={(tab) => {
            setSelectedMovie(null);
            setActiveTab(tab);
            if (tab === 'home') setActiveCategory('home');
            else if (tab === 'library') setActiveCategory('library');
            else if (tab === 'search') setActiveCategory('genres');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSelectCategory={(cat) => {
            setSelectedMovie(null);
            setActiveCategory(cat);
            if (cat === 'home') {
              setActiveTab('home');
            } else if (cat === 'library') {
              setActiveTab('library');
            } else {
              setActiveTab('search');
              setSelectedGenreForDiscover(cat === 'genres' ? '' : cat);
              setSearchQueryForDiscover('');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onSearchQuery={handleSearchFromNavbar}
          savedCount={savedMovies.length}
          user={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 w-full">
          {selectedMovie ? (
            <DetailScreen
              movie={selectedMovie}
              isSaved={savedMovies.some((m) => m._id === selectedMovie._id)}
              relatedMovies={kdramaMovies.length > 0 ? kdramaMovies : trendingMovies}
              onBack={handleBack}
              onToggleSave={handleToggleSave}
              onWatchNow={handleWatchNow}
              onWatchTrailer={handleWatchTrailer}
              onSelectMovie={handleSelectMovie}
              onOpenAddToPlaylist={(m) => setPlaylistModalMovie(m)}
            />
          ) : activeTab === 'home' ? (
            <HomeScreen
              featuredMovies={featuredMovies}
              trendingMovies={trendingMovies}
              kdramaMovies={kdramaMovies}
              dracinMovies={dracinMovies}
              jdramaMovies={jdramaMovies}
              seriesMovies={seriesMovies}
              animeMovies={animeMovies}
              newReleases={newReleases}
              topRated={topRated}
            indonesianMovies={indonesianMovies}
              onSelectMovie={handleSelectMovie}
              onWatchTrailer={handleWatchTrailer}
              onToggleSave={handleToggleSave}
              onNavigateDiscover={handleNavigateDiscover}
            />
          ) : activeTab === 'search' ? (
            <DiscoverScreen
              initialQuery={searchQueryForDiscover}
              initialGenre={selectedGenreForDiscover}
              defaultPopular={kdramaMovies.length > 0 ? kdramaMovies : trendingMovies}
              onSelectMovie={handleSelectMovie}
            />
          ) : activeTab === 'library' ? (
            <LibraryScreen
              savedMovies={savedMovies}
              playlists={playlists}
              onSelectSavedMovie={handleSelectSavedMovie}
              onRemoveSavedMovie={handleRemoveSavedMovie}
              onExplore={() => setActiveTab('search')}
              onCreatePlaylist={handleCreatePlaylist}
              onDeletePlaylist={handleDeletePlaylist}
              onRemoveFromPlaylist={handleRemoveFromPlaylist}
            />
          ) : (
            <ProfileScreen 
              user={currentUser}
              onOpenGenrePreferences={() => setShowGenreModal(true)}
              onOpenSecurityDashboard={() => setShowSecurityDashboard(true)}
              onLogout={handleLogout}
            />
          )}
        </main>

        <footer className="w-full border-t border-white/10 bg-[#141414] py-10 px-4 sm:px-6 lg:px-8 mt-12 mb-16 md:mb-0 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base">Ruang<span className="text-[#E50914]">Sinema</span></span>
              <span>— Portal Drakor, Dracin, Dorama Jepang, Anime & Film Subtitle Indonesia</span>
            </div>
            <p>© 2026 RuangSinema. Seluruh Hak Cipta Dilindungi.</p>
          </div>
        </footer>

        <div className="md:hidden">
          <BottomNav
            activeTab={activeTab}
            onChangeTab={(tab) => {
              setSelectedMovie(null);
              setActiveTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            savedCount={savedMovies.length}
          />
        </div>

        <VideoPlayerModal
          movie={videoModal.movie}
          mode={videoModal.mode}
          isOpen={videoModal.isOpen}
          initialSeason={videoModal.season}
          initialEpisode={videoModal.episode}
          episodeItem={videoModal.episodeItem}
          onClose={() => setVideoModal({ 
            isOpen: false, 
            movie: null, 
            mode: 'stream',
            season: 1,
            episode: 1,
            episodeItem: null
          })}
        />

        <AddToPlaylistModal
          isOpen={Boolean(playlistModalMovie)}
          movie={playlistModalMovie}
          playlists={playlists}
          onClose={() => setPlaylistModalMovie(null)}
          onAddToPlaylist={handleAddToPlaylist}
          onCreatePlaylist={handleCreatePlaylist}
        />

        <GenrePreferenceModal
          isOpen={showGenreModal}
          user={currentUser}
          onCompleted={handleGenreSelectionCompleted}
        />

        <SecurityDashboardModal
          isOpen={showSecurityDashboard}
          onClose={() => setShowSecurityDashboard(false)}
        />

        {toastMessage && (
          <div className="fixed bottom-20 md:bottom-8 right-1/2 translate-x-1/2 md:right-8 md:translate-x-0 z-50 px-5 py-3 rounded-2xl bg-[#E50914] text-white font-extrabold text-xs shadow-2xl shadow-[#E50914]/40 animate-in fade-in slide-in-from-bottom-3 duration-200">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
