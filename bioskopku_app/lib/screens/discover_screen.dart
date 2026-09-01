
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/movie.dart';
import '../services/api_service.dart';

class DiscoverScreen extends StatefulWidget {
  final Function(Movie) onSelectMovie;

  const DiscoverScreen({super.key, required this.onSelectMovie});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  final TextEditingController _searchCtrl = TextEditingController();
  List<Movie> _results = [];
  bool _loading = false;
  String _selectedGenre = 'Gender Bender';

  @override
  void initState() {
    super.initState();
    _loadCategory(_selectedGenre);
  }

  Future<void> _loadCategory(String genre) async {
    setState(() => _loading = true);
    List<Movie> data = [];
    if (genre == 'Gender Bender') {
      data = await ApiService.fetchGenderBender();
    } else if (genre == 'Body Swap') {
      data = await ApiService.fetchBodySwap();
    } else if (genre == 'Drakor') {
      data = await ApiService.fetchKdrama();
    } else if (genre == 'Dracin') {
      data = await ApiService.fetchDracin();
    } else if (genre == 'Anime') {
      data = await ApiService.fetchAnime();
    } else {
      data = await ApiService.fetchPopularMovies();
    }

    if (mounted) {
      setState(() {
        _results = data;
        _loading = false;
      });
    }
  }

  Future<void> _performSearch(String q) async {
    if (q.trim().isEmpty) {
      _loadCategory(_selectedGenre);
      return;
    }
    setState(() => _loading = true);
    final list = await ApiService.search(q.trim());
    if (mounted) {
      setState(() {
        _results = list;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final genres = ['Gender Bender', 'Body Swap', 'Drakor', 'Dracin', 'Anime', 'Action', 'Horror', 'Romance'];

    return Scaffold(
      backgroundColor: const Color(0xFF141414),
      appBar: AppBar(
        backgroundColor: const Color(0xFF141414),
        elevation: 0,
        title: const Text('Eksplorasi & Search', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Colors.white)),
      ),
      body: Column(
        children: [
          // Search Box
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: TextField(
              controller: _searchCtrl,
              onSubmitted: _performSearch,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Cari judul film, drakor, anime...',
                hintStyle: TextStyle(color: Colors.grey[500], fontSize: 13),
                prefixIcon: const Icon(Icons.search, color: Colors.grey),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, color: Colors.grey),
                        onPressed: () {
                          _searchCtrl.clear();
                          _loadCategory(_selectedGenre);
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFF242424),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),

          // Genre selector chips
          SizedBox(
            height: 38,
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: genres.length,
              separatorBuilder: (_, __) => const SizedBox(width: 6),
              itemBuilder: (context, idx) {
                final g = genres[idx];
                final isSel = _selectedGenre == g;
                return ChoiceChip(
                  label: Text(g, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: isSel ? Colors.white : Colors.grey[300])),
                  selected: isSel,
                  selectedColor: const Color(0xFFE50914),
                  backgroundColor: const Color(0xFF242424),
                  onSelected: (val) {
                    setState(() => _selectedGenre = g);
                    _searchCtrl.clear();
                    _loadCategory(g);
                  },
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          // Grid Results
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFE50914)))
                : _results.isEmpty
                    ? const Center(child: Text('Tidak ada judul yang cocok.', style: TextStyle(color: Colors.grey)))
                    : GridView.builder(
                        padding: const EdgeInsets.all(16),
                        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 3,
                          childAspectRatio: 0.58,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 12,
                        ),
                        itemCount: _results.length,
                        itemBuilder: (context, idx) {
                          final m = _results[idx];
                          return GestureDetector(
                            onTap: () => widget.onSelectMovie(m),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Expanded(
                                  child: ClipRRect(
                                    borderRadius: BorderRadius.circular(6),
                                    child: CachedNetworkImage(
                                      imageUrl: m.posterImg,
                                      fit: BoxFit.cover,
                                      width: double.infinity,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  m.title,
                                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                Text(
                                  '★ ${m.rating}',
                                  style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFF5C518)),
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
