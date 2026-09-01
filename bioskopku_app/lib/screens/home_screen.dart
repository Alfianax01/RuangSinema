
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/movie.dart';
import '../services/api_service.dart';

class HomeScreen extends StatefulWidget {
  final Function(Movie) onSelectMovie;

  const HomeScreen({super.key, required this.onSelectMovie});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _selectedHub = 'all';
  String _trendingFilter = 'all';
  int _heroIndex = 0;
  Timer? _heroTimer;
  bool _loading = true;

  List<Movie> _popularMovies = [];
  List<Movie> _seriesMovies = [];
  List<Movie> _kdrama = [];
  List<Movie> _dracin = [];
  List<Movie> _jdrama = [];
  List<Movie> _anime = [];
  final List<Movie> _indonesianMovies = [];
  List<Movie> _bodySwap = [];
  List<Movie> _genderBender = [];

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _heroTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      ApiService.fetchPopularMovies(),
      ApiService.fetchPopularSeries(),
      ApiService.fetchKdrama(),
      ApiService.fetchDracin(),
      ApiService.fetchJdrama(),
      ApiService.fetchAnime(),
      ApiService.fetchBodySwap(),
      ApiService.fetchGenderBender(),
    ]);

    if (mounted) {
      setState(() {
        _popularMovies = results[0];
        _seriesMovies = results[1];
        _kdrama = results[2];
        _dracin = results[3];
        _jdrama = results[4];
        _anime = results[5];
        _bodySwap = results[6];
        _genderBender = results[7];
        _loading = false;
      });

      // Start auto-cycling hero banner
      _heroTimer = Timer.periodic(const Duration(seconds: 5), (_) {
        if (mounted && _popularMovies.isNotEmpty) {
          setState(() {
            _heroIndex = (_heroIndex + 1) % (_popularMovies.length.clamp(1, 5));
          });
        }
      });
    }
  }

  List<Movie> get _filteredTrending {
    if (_trendingFilter == 'movies') return _popularMovies;
    if (_trendingFilter == 'tv') return _seriesMovies;
    return [..._popularMovies.take(5), ..._seriesMovies.take(5)]..shuffle();
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFE50914)));
    }

    final hubs = [
      {'id': 'all', 'label': '🏠 Home'},
      {'id': 'movies', 'label': '🎬 Movies'},
      {'id': 'series', 'label': '📺 TV Series'},
      {'id': 'kdrama', 'label': '🇰🇷 Drakor'},
      {'id': 'dracin', 'label': '🇨🇳 Dracin'},
      {'id': 'anime', 'label': '🎌 Anime'},
      {'id': 'jdrama', 'label': '🇯🇵 Dorama'},
      {'id': 'gender_bender', 'label': '🎭 Gender Bender'},
      {'id': 'body_swap', 'label': '🔁 Body Swap'},
    ];

    return SingleChildScrollView(
      padding: const EdgeInsets.only(bottom: 90),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // IDLIX Pill Navbar
          SizedBox(
            height: 44,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              scrollDirection: Axis.horizontal,
              itemCount: hubs.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, idx) {
                final hub = hubs[idx];
                final isSelected = _selectedHub == hub['id'];
                return InkWell(
                  onTap: () => setState(() => _selectedHub = hub['id']!),
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFFE50914) : const Color(0xFF222222),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: isSelected ? const Color(0xFFE50914) : Colors.white.withOpacity(0.1),
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      hub['label']!,
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.w900 : FontWeight.bold,
                        color: isSelected ? Colors.white : Colors.grey[300],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          // IDLIX Billboard Hero Slider
          if (_selectedHub == 'all' && _popularMovies.isNotEmpty)
            _buildIdlixHeroBanner(_popularMovies[_heroIndex.clamp(0, _popularMovies.length - 1)]),

          // IDLIX Trending Now with Quick Pill Switcher
          if (_selectedHub == 'all') ...[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              child: Wrap(
                alignment: WrapAlignment.spaceBetween,
                crossAxisAlignment: WrapCrossAlignment.center,
                spacing: 8,
                runSpacing: 8,
                children: [
                  const Text(
                    'Trending Now',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white),
                  ),
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF222222),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1)),
                    ),
                    padding: const EdgeInsets.all(2),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        _buildTrendingPill('All', 'all'),
                        _buildTrendingPill('Movies', 'movies'),
                        _buildTrendingPill('TV Series', 'tv'),
                      ],
                    ),
                  )
                ],
              ),
            ),
            _buildHorizontalCards(_filteredTrending),

            _buildRow('Drama Korea (K-Drama) Terpopuler', _kdrama),
            _buildRow('Drama China (Dracin) Terpopuler', _dracin),
            _buildRow('Anime Series Sub Indo', _anime),
            _buildRow('Dorama Jepang & Live Action', _jdrama),
            _buildRow('Koleksi Gender Bender', _genderBender),
            _buildRow('Koleksi Body Swap', _bodySwap),
          ] else if (_selectedHub == 'movies') ...[
            _buildRow('Semua Film Bioskop Populer', _popularMovies),
          ] else if (_selectedHub == 'series') ...[
            _buildRow('Serial TV Unggulan', _seriesMovies),
          ] else if (_selectedHub == 'kdrama') ...[
            _buildRow('Drama Korea Terpopuler', _kdrama),
          ] else if (_selectedHub == 'dracin') ...[
            _buildRow('Drama China (Dracin)', _dracin),
          ] else if (_selectedHub == 'anime') ...[
            _buildRow('Anime Subtitle Indonesia', _anime),
          ] else if (_selectedHub == 'jdrama') ...[
            _buildRow('Dorama Jepang', _jdrama),
          ] else if (_selectedHub == 'gender_bender') ...[
            _buildRow('Koleksi Gender Bender', _genderBender),
          ] else if (_selectedHub == 'body_swap') ...[
            _buildRow('Koleksi Body Swap', _bodySwap),
          ],
        ],
      ),
    );
  }

  Widget _buildTrendingPill(String label, String value) {
    final isSel = _trendingFilter == value;
    return InkWell(
      onTap: () => setState(() => _trendingFilter = value),
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
        decoration: BoxDecoration(
          color: isSel ? const Color(0xFFE50914) : Colors.transparent,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 10,
            fontWeight: FontWeight.w900,
            color: isSel ? Colors.white : Colors.grey[400],
          ),
        ),
      ),
    );
  }

  Widget _buildIdlixHeroBanner(Movie movie) {
    return GestureDetector(
      onTap: () => widget.onSelectMovie(movie),
      child: Container(
        height: 380,
        margin: const EdgeInsets.only(bottom: 12),
        child: Stack(
          children: [
            Positioned.fill(
              child: CachedNetworkImage(
                imageUrl: movie.backdropImg,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(color: const Color(0xFF1f1f1f)),
              ),
            ),
            Positioned.fill(
              child: Container(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.black.withOpacity(0.3),
                      const Color(0xFF141414).withOpacity(0.6),
                      const Color(0xFF141414),
                    ],
                  ),
                ),
              ),
            ),
            Positioned(
              bottom: 16,
              left: 16,
              right: 16,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE50914),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      movie.type == 'series' ? 'SERIES' : 'MOVIE',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 0.5),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    movie.title,
                    style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white, height: 1.1),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, color: Color(0xFFF5C518), size: 14),
                      const SizedBox(width: 4),
                      Text(movie.rating, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white)),
                      const SizedBox(width: 6),
                      Text('·  ${movie.year}  ·  ${movie.duration}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: () => widget.onSelectMovie(movie),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFE50914),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 11),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      elevation: 8,
                    ),
                    icon: const Icon(Icons.play_arrow, size: 20),
                    label: const Text('Watch Now', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                  ),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildRow(String title, List<Movie> movies) {
    if (movies.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 10),
          child: Text(
            title,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Colors.white),
          ),
        ),
        _buildHorizontalCards(movies),
      ],
    );
  }

  Widget _buildHorizontalCards(List<Movie> movies) {
    return SizedBox(
      height: 220,
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: movies.length,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (context, idx) {
          final movie = movies[idx];
          return GestureDetector(
            onTap: () => widget.onSelectMovie(movie),
            child: Container(
              width: 130,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                color: const Color(0xFF1f1f1f),
              ),
              clipBehavior: Clip.antiAlias,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Stack(
                      fit: StackFit.expand,
                      children: [
                        CachedNetworkImage(
                          imageUrl: movie.posterImg,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(color: const Color(0xFF222222)),
                        ),
                        Positioned(
                          top: 6,
                          left: 6,
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.black.withOpacity(0.8),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              children: [
                                const Icon(Icons.star, color: Color(0xFFF5C518), size: 10),
                                const SizedBox(width: 2),
                                Text(movie.rating, style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: Colors.white)),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          movie.title,
                          style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.white),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          movie.year,
                          style: const TextStyle(fontSize: 9, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
