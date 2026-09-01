import 'player_screen.dart';

import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/movie.dart';
import '../services/api_service.dart';

class DetailScreen extends StatefulWidget {
  final Movie movie;
  final VoidCallback onBack;
  final Function(Movie) onSelectMovie;

  const DetailScreen({
    super.key,
    required this.movie,
    required this.onBack,
    required this.onSelectMovie,
  });

  @override
  State<DetailScreen> createState() => _DetailScreenState();
}

class _DetailScreenState extends State<DetailScreen> {
  late Movie _currentMovie;
  List<EpisodeItem> _episodes = [];
  int _selectedSeason = 1;
  bool _loadingEpisodes = false;

  @override
  void initState() {
    super.initState();
    _currentMovie = widget.movie;
    _loadFullDetails();
  }

  Future<void> _loadFullDetails() async {
    final full = await ApiService.fetchMovieDetails(widget.movie.id);
    if (full != null && mounted) {
      setState(() {
        _currentMovie = full;
        if (full.seasons != null && full.seasons!.isNotEmpty) {
          _selectedSeason = full.seasons!.first.seasonNumber;
        }
      });
      if (_currentMovie.type == 'series') {
        _loadEpisodes(_selectedSeason);
      }
    }
  }

  Future<void> _loadEpisodes(int season) async {
    setState(() => _loadingEpisodes = true);
    final eps = await ApiService.fetchSeasonEpisodes(_currentMovie.id, season);
    if (mounted) {
      setState(() {
        _episodes = eps;
        _loadingEpisodes = false;
      });
    }
  }

    void _openPlayer({int season = 1, int episode = 1}) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PlayerScreen(
          movie: _currentMovie,
          season: season,
          episode: episode,
          episodes: _episodes,
        ),
      ),
    );
  }

  Future<void> _openStream(String url) async {
    _openPlayer(season: _selectedSeason, episode: 1);
  }

  void _showDownloadModal() {
    final sources = ApiService.getStreamSources(_currentMovie.id, isSeries: _currentMovie.type == 'series', season: _selectedSeason);
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF181818),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: const Color(0xFFE50914), borderRadius: BorderRadius.circular(10)),
                    child: const Icon(Icons.download, color: Colors.white, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Download ${_currentMovie.title}', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white), maxLines: 1),
                        const Text('Pilih dari 6 server unduhan Sub Indo resmi', style: TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  )
                ],
              ),
              const SizedBox(height: 16),
              ...sources.map((src) => ListTile(
                contentPadding: EdgeInsets.zero,
                leading: const Icon(Icons.play_circle_fill, color: Color(0xFFE50914)),
                title: Text(src.provider, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
                subtitle: const Text('1080p Full HD • Subtitle Indonesia', style: TextStyle(fontSize: 10, color: Colors.grey)),
                trailing: const Icon(Icons.open_in_new, color: Colors.white54, size: 18),
                onTap: () {
                  Navigator.pop(context);
                  _openStream(src.url);
                },
              )),
            ],
          ),
        );
      },
    );
  }

  void _showActorModal(CastMember actor) async {
    final credits = await ApiService.fetchActorCredits(actor.id);
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF181818),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.6,
          maxChildSize: 0.9,
          minChildSize: 0.4,
          expand: false,
          builder: (_, controller) {
            return Padding(
              padding: const EdgeInsets.all(20),
              child: ListView(
                controller: controller,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 28,
                        backgroundColor: const Color(0xFF242424),
                        backgroundImage: actor.avatarUrl != null ? NetworkImage(actor.avatarUrl!) : null,
                        child: actor.avatarUrl == null ? Text(actor.name.isNotEmpty ? actor.name[0] : 'A') : null,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(actor.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white)),
                            Text('Peran: ${actor.character}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      )
                    ],
                  ),
                  const SizedBox(height: 20),
                  const Text('Daftar Film & Drama yang Dibintangi:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white)),
                  const SizedBox(height: 12),
                  credits.isEmpty 
                    ? const Padding(padding: EdgeInsets.all(20), child: Center(child: Text('Memuat filmografi...', style: TextStyle(color: Colors.grey))))
                    : GridView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          childAspectRatio: 0.65,
                          crossAxisSpacing: 8,
                          mainAxisSpacing: 8,
                        ),
                        itemCount: credits.length,
                        itemBuilder: (_, idx) {
                          final m = credits[idx];
                          return GestureDetector(
                            onTap: () {
                              Navigator.pop(context);
                              widget.onSelectMovie(m);
                            },
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: CachedNetworkImage(
                                imageUrl: m.posterImg,
                                fit: BoxFit.cover,
                              ),
                            ),
                          );
                        },
                      ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final movie = _currentMovie;
    final isSeries = movie.type == 'series';

    return Scaffold(
      backgroundColor: const Color(0xFF141414),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Top Backdrop Image
            Stack(
              children: [
                CachedNetworkImage(
                  imageUrl: movie.backdropImg,
                  height: 260,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
                Container(
                  height: 260,
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.4),
                        const Color(0xFF141414),
                      ],
                    ),
                  ),
                ),
                SafeArea(
                  child: IconButton(
                    icon: const Icon(Icons.arrow_back, color: Colors.white),
                    onPressed: widget.onBack,
                  ),
                ),
              ],
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE50914),
                      borderRadius: BorderRadius.circular(3),
                    ),
                    child: Text(isSeries ? 'SERIES' : 'MOVIE', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white)),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    movie.title,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.star, color: Color(0xFFF5C518), size: 14),
                      const SizedBox(width: 4),
                      Text(movie.rating, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white)),
                      const SizedBox(width: 8),
                      Flexible(
                        child: Text(
                          '·  ${movie.year}  ·  ${movie.duration}',
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () {
                            final sources = ApiService.getStreamSources(movie.id, isSeries: isSeries, season: _selectedSeason);
                            if (sources.isNotEmpty) _openStream(sources[0].url);
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFE50914),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          icon: const Icon(Icons.play_arrow),
                          label: Text(isSeries ? 'Putar Episode 1' : 'Putar Film', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                        ),
                      ),
                      const SizedBox(width: 8),
                      OutlinedButton.icon(
                        onPressed: _showDownloadModal,
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFF10B981),
                          side: const BorderSide(color: Color(0xFF10B981)),
                          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: const Icon(Icons.download, size: 18),
                        label: const Text('Download', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  Text(
                    movie.synopsis,
                    style: TextStyle(fontSize: 12, color: Colors.grey[300], height: 1.4),
                  ),

                  // Cast Section (Real Actor Face Headshots)
                  if (movie.castMembers.isNotEmpty) ...[
                    const SizedBox(height: 24),
                    const Text(
                      'Pemeran & Aktor Utama (Klik untuk Filmografi):',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Colors.white),
                    ),
                    const SizedBox(height: 10),
                    SizedBox(
                      height: 105,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: movie.castMembers.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 14),
                        itemBuilder: (context, idx) {
                          final actor = movie.castMembers[idx];
                          return GestureDetector(
                            onTap: () => _showActorModal(actor),
                            child: Column(
                              children: [
                                CircleAvatar(
                                  radius: 26,
                                  backgroundColor: const Color(0xFF242424),
                                  backgroundImage: actor.avatarUrl != null ? NetworkImage(actor.avatarUrl!) : null,
                                  child: actor.avatarUrl == null ? Text(actor.name.isNotEmpty ? actor.name[0] : 'A') : null,
                                ),
                                const SizedBox(height: 4),
                                SizedBox(
                                  width: 65,
                                  child: Text(
                                    actor.name,
                                    style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                                SizedBox(
                                  width: 65,
                                  child: Text(
                                    actor.character,
                                    style: const TextStyle(fontSize: 8, color: Colors.grey),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
                    ),
                  ],

                  // IDLIX Exact Episodes Section
                  if (isSeries) ...[
                    const SizedBox(height: 24),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Episodes', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white)),
                        if (movie.seasons != null && movie.seasons!.length > 1)
                          DropdownButton<int>(
                            value: _selectedSeason,
                            dropdownColor: const Color(0xFF1f1f1f),
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                            items: movie.seasons!.map((s) => DropdownMenuItem(value: s.seasonNumber, child: Text('Season ${s.seasonNumber}'))).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                setState(() => _selectedSeason = val);
                                _loadEpisodes(val);
                              }
                            },
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    _loadingEpisodes
                      ? const Center(child: CircularProgressIndicator(color: Color(0xFFE50914)))
                      : ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _episodes.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (context, idx) {
                            final ep = _episodes[idx];
                            return GestureDetector(
                              onTap: () {
                                final sources = ApiService.getStreamSources(movie.id, isSeries: true, season: ep.seasonNumber, episode: ep.episodeNumber);
                                if (sources.isNotEmpty) _openStream(sources[0].url);
                              },
                              child: Container(
                                decoration: BoxDecoration(
                                  color: const Color(0xFF1f1f1f),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                clipBehavior: Clip.antiAlias,
                                child: Row(
                                  children: [
                                    SizedBox(
                                      width: 110,
                                      height: 70,
                                      child: Stack(
                                        fit: StackFit.expand,
                                        children: [
                                          CachedNetworkImage(
                                            imageUrl: ep.stillPath ?? movie.backdropImg,
                                            fit: BoxFit.cover,
                                          ),
                                          const Center(child: Icon(Icons.play_circle_outline, color: Colors.white, size: 26)),
                                          Positioned(
                                            top: 4,
                                            left: 4,
                                            child: Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                              color: Colors.black87,
                                              child: Text('EP ${ep.episodeNumber}', style: const TextStyle(fontSize: 8, fontWeight: FontWeight.bold, color: Colors.white)),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    Expanded(
                                      child: Padding(
                                        padding: const EdgeInsets.all(8.0),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            Text(ep.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.white), maxLines: 1, overflow: TextOverflow.ellipsis),
                                            const SizedBox(height: 2),
                                            Text(ep.overview, style: const TextStyle(fontSize: 10, color: Colors.grey), maxLines: 2, overflow: TextOverflow.ellipsis),
                                          ],
                                        ),
                                      ),
                                    )
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                  ],

                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
