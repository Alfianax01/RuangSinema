import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/movie.dart';

class ApiService {
  static Future<List<Map<String, dynamic>>> fetchEpisodes(String tvId, int seasonNumber, {double baseRating = 8.6}) async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/tv/$tvId/season/$seasonNumber?api_key=$tmdbApiKey')).timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final list = (data['episodes'] as List?) ?? [];
        final total = list.length;
        return list.map((e) {
          final epNum = e['episode_number'] ?? 1;
          double vote = (e['vote_average'] as num?)?.toDouble() ?? 0.0;
          if (vote <= 0) {
            double variance = epNum == total ? 0.6 : ((epNum % 3) - 1) * 0.15;
            vote = (baseRating + variance).clamp(7.8, 9.9);
          }
          return {
            'episode_number': epNum,
            'name': e['name'] ?? 'Episode $epNum',
            'overview': e['overview'] ?? '',
            'still_path': e['still_path'] != null ? '$tmdbImgW500${e['still_path']}' : null,
            'rating': vote.toStringAsFixed(1),
          };
        }).toList();
      }
    } catch (_) {}
    return [];
  }

  // 4. 📺 TV-API.COM (https://tv-api.com/api)
  static const String tvApiBaseUrl = 'https://tv-api.com';

  static Future<List<Movie>> fetchFromTvApi(String endpoint) async {
    try {
      final res = await http.get(Uri.parse('$tvApiBaseUrl/en/API/$endpoint/k_demo')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final data = json.decode(res.body);
        final list = (data['items'] ?? data['results'] ?? []) as List;
        return list.map((item) => mapItem(item, isTv: endpoint.contains('TV'))).toList();
      }
    } catch (_) {}
    return [];
  }

  static const String tmdbApiKey = '4e44d9029b1270a757cddc766a1bcb63';
  static const String tmdbBaseUrl = 'https://api.themoviedb.org/3';
  static const String tmdbImgW500 = 'https://image.tmdb.org/t/p/w500';
  static const String tmdbImgW1280 = 'https://image.tmdb.org/t/p/w1280';

  static const List<String> nsfwBlacklist = [
    'overflow', 'kaifuku', 'redo of healer', 'yosuga no sora', 'boku no pico', 'ishuzoku',
    'kiss x sis', 'highschool dxd', 'shinmai maou', 'valkyrie drive', 'seikon no qwaser',
    'peter grill', 'shoujo ramune', 'euphoria', 'bible black', 'night shift nurses',
    'mankitsu happening', 'otome dori', 'resort boin', 'inyouchuu', 'rance', 'kuroinu',
    'drop out', 'futanari', 'netorare', 'ntr', 'ero', 'erotic', 'hentai', 'ecchi',
    'uncensored', 'adult', 'r18', '18+', 'sensual', 'lust', 'nudity', 'nsfw'
  ];

  static bool isSafe(Map<String, dynamic> item) {
    if (item['adult'] == true) return false;
    final text = ('${item['title'] ?? ''} ${item['name'] ?? ''} ${item['overview'] ?? ''}').toLowerCase();
    for (final bad in nsfwBlacklist) {
      if (text.contains(bad)) return false;
    }
    return true;
  }

  static Movie mapItem(Map<String, dynamic> item, {bool isTv = false}) {
    final title = item['title'] ?? item['name'] ?? 'Movie';
    final poster = item['poster_path'] != null 
        ? '$tmdbImgW500${item['poster_path']}' 
        : 'https://placehold.co/500x750/181818/E50914?text=${Uri.encodeComponent(title)}';
    final backdrop = item['backdrop_path'] != null
        ? '$tmdbImgW1280${item['backdrop_path']}'
        : poster;
    final date = item['release_date'] ?? item['first_air_date'] ?? '2024';
    final year = date.toString().split('-').first;
    final rating = (item['vote_average'] as num?)?.toStringAsFixed(1) ?? '8.2';
    final isSeries = isTv || item['media_type'] == 'tv' || item['first_air_date'] != null;

    List<String> castNames = [];
    List<CastMember> members = [];
    if (item['credits'] != null && item['credits']['cast'] is List) {
      final list = item['credits']['cast'] as List;
      castNames = list.take(12).map((c) => c['name'].toString()).toList();
      members = list.take(12).map((c) => CastMember.fromJson(c)).toList();
    }

    List<SeasonItem> seasons = [];
    if (item['seasons'] is List) {
      seasons = (item['seasons'] as List)
          .where((s) => (s['season_number'] ?? 0) > 0)
          .map((s) => SeasonItem.fromJson(s))
          .toList();
    }

    return Movie(
      id: isSeries ? 'tv-${item['id']}' : 'movie-${item['id']}',
      title: title,
      type: isSeries ? 'series' : 'movie',
      posterImg: poster,
      backdropImg: backdrop,
      rating: rating,
      year: year,
      duration: isSeries ? '${seasons.isNotEmpty ? seasons.length : 1} Season' : '2h 15m',
      genres: ['Action', 'Drama', 'Adventure'],
      synopsis: item['overview'] ?? 'Sinopsis lengkap dengan subtitle Indonesia.',
      tagline: item['tagline'],
      casts: castNames,
      castMembers: members,
      seasons: seasons.isNotEmpty ? seasons : null,
      isComingSoon: (int.tryParse(year) ?? 2024) > 2024,
    );
  }

  // 1. POPULAR MOVIES & SERIES
  static Future<List<Movie>> fetchPopularMovies() async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/movie/popular?api_key=$tmdbApiKey&page=1&include_adult=false')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return (d['results'] as List).where((i) => isSafe(i)).map((i) => mapItem(i, isTv: false)).toList();
      }
    } catch (_) {}
    return [];
  }

  static Future<List<Movie>> fetchPopularSeries() async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/tv/popular?api_key=$tmdbApiKey&page=1&include_adult=false')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return (d['results'] as List).where((i) => isSafe(i)).map((i) => mapItem(i, isTv: true)).toList();
      }
    } catch (_) {}
    return [];
  }

  // 2. K-DRAMA
    static Future<List<Movie>> fetchKdrama() async {
    try {
      final pBona = http.get(Uri.parse('$tmdbBaseUrl/tv/294095?api_key=$tmdbApiKey&append_to_response=credits'));
      final p1 = http.get(Uri.parse('$tmdbBaseUrl/discover/tv?api_key=$tmdbApiKey&with_original_language=ko&with_genres=18|10759|10765|9648&without_genres=10764,10767,10763&sort_by=popularity.desc&page=1&include_adult=false'));
      final p2 = http.get(Uri.parse('$tmdbBaseUrl/search/tv?api_key=$tmdbApiKey&query=A+Bona+Fide+Killer'));

      final responses = await Future.wait([pBona, p1, p2]);
      final List rawList = [];
      if (responses[0].statusCode == 200) {
        rawList.add(json.decode(responses[0].body));
      }
      for (int i = 1; i < responses.length; i++) {
        if (responses[i].statusCode == 200) {
          final data = json.decode(responses[i].body);
          if (data['results'] is List) rawList.addAll(data['results']);
        }
      }

      final seen = <int>{};
      final List<Movie> list = [];
      for (final item in rawList) {
        final id = item['id'];
        if (id is int && !seen.contains(id) && isSafe(item) && item['poster_path'] != null) {
          seen.add(id);
          list.add(mapItem(item, isTv: true));
        }
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  // 3. DRACIN (DRAMA CHINA)
  static Future<List<Movie>> fetchDracin() async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/discover/tv?api_key=$tmdbApiKey&with_original_language=zh&with_type=4&without_genres=16,10764,10767,10763&sort_by=popularity.desc&page=1&include_adult=false')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return (d['results'] as List).where((i) => isSafe(i)).map((i) => mapItem(i, isTv: true)).toList();
      }
    } catch (_) {}
    return [];
  }

  // 4. DORAMA JEPANG
  static Future<List<Movie>> fetchJdrama() async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/discover/tv?api_key=$tmdbApiKey&with_original_language=ja&with_type=4&without_genres=16,10764,10767,10763&sort_by=popularity.desc&page=1&include_adult=false')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return (d['results'] as List).where((i) => isSafe(i)).map((i) => mapItem(i, isTv: true)).toList();
      }
    } catch (_) {}
    return [];
  }

  // 5. ANIME
  static Future<List<Movie>> fetchAnime() async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/discover/tv?api_key=$tmdbApiKey&with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=1&include_adult=false')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return (d['results'] as List).where((i) => isSafe(i)).map((i) => mapItem(i, isTv: true)).toList();
      }
    } catch (_) {}
    return [];
  }

  // 6. BODY SWAP & GENDER BENDER
  static Future<List<Movie>> fetchBodySwap() async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/search/multi?api_key=$tmdbApiKey&query=Your+Name&include_adult=false')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return (d['results'] as List).where((i) => isSafe(i)).map((i) => mapItem(i, isTv: i['media_type'] == 'tv')).toList();
      }
    } catch (_) {}
    return [];
  }

  static Future<List<Movie>> fetchGenderBender() async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/search/multi?api_key=$tmdbApiKey&query=Coffee+Prince&include_adult=false')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return (d['results'] as List).where((i) => isSafe(i)).map((i) => mapItem(i, isTv: i['media_type'] == 'tv')).toList();
      }
    } catch (_) {}
    return [];
  }

  // 7. FULL MOVIE DETAILS WITH CAST & SEASONS
  static Future<Movie?> fetchMovieDetails(String rawId) async {
    try {
      final isTv = rawId.startsWith('tv-') || rawId.contains('tv');
      final clean = rawId.replaceAll(RegExp(r'^tv-|^movie-'), '');
      final path = isTv ? 'tv' : 'movie';
      final res = await http.get(Uri.parse('$tmdbBaseUrl/$path/$clean?api_key=$tmdbApiKey&append_to_response=credits,videos,similar')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return mapItem(d, isTv: isTv);
      }
    } catch (_) {}
    return null;
  }

  // 8. SEASON EPISODES
  static Future<List<EpisodeItem>> fetchSeasonEpisodes(String rawId, int seasonNum) async {
    try {
      final clean = rawId.replaceAll(RegExp(r'^tv-|^movie-'), '');
      final res = await http.get(Uri.parse('$tmdbBaseUrl/tv/$clean/season/$seasonNum?api_key=$tmdbApiKey')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        if (d['episodes'] is List) {
          return (d['episodes'] as List).map((e) => EpisodeItem.fromJson(e, seasonNum)).toList();
        }
      }
    } catch (_) {}
    return [];
  }

  // 9. ACTOR FILMOGRAPHY
  static Future<List<Movie>> fetchActorCredits(int personId) async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/person/$personId/combined_credits?api_key=$tmdbApiKey')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        if (d['cast'] is List) {
          return (d['cast'] as List)
              .where((c) => isSafe(c) && (c['poster_path'] != null || c['backdrop_path'] != null))
              .take(20)
              .map((c) => mapItem(c, isTv: c['media_type'] == 'tv'))
              .toList();
        }
      }
    } catch (_) {}
    return [];
  }

  // 10. 6 STREAM & DOWNLOAD SOURCES
    static List<StreamSource> getStreamSources(String id, {bool isSeries = false, int season = 1, int episode = 1}) {
    final cleanId = id.replaceAll(RegExp(r'[^0-9]'), '');
    final epString = isSeries ? 's${season}e$episode' : '';

    return [
      StreamSource(
        provider: '⚡ Server 1 VIP (MultiEmbed Sub Indo 60FPS)',
        url: isSeries
          ? 'https://multiembed.mov/directstream.php?video_id=$cleanId&tmdb=1&s=$season&e=$episode'
          : 'https://multiembed.mov/directstream.php?video_id=$cleanId&tmdb=1',
      ),
      StreamSource(
        provider: '🚀 Server 2 (VidLink Ultra Fast)',
        url: isSeries
          ? 'https://vidlink.pro/tv/$cleanId/$season/$episode?autoplay=false'
          : 'https://vidlink.pro/movie/$cleanId?autoplay=false',
      ),
      StreamSource(
        provider: '🔥 Server 3 (Vidsrc Pro HD)',
        url: isSeries
          ? 'https://vidsrc.vip/embed/tv/$cleanId/$season/$episode'
          : 'https://vidsrc.vip/embed/movie/$cleanId',
      ),
      StreamSource(
        provider: '💎 Server 4 (Moviee 1080p)',
        url: isSeries
          ? 'https://moviee.tv/embed/tv/$cleanId/$season/$episode'
          : 'https://moviee.tv/embed/movie/$cleanId',
      ),
      StreamSource(
        provider: '🎬 Server 5 (SmashyStream)',
        url: isSeries
          ? 'https://player.smashy.stream/tv/$cleanId?s=$season&e=$episode'
          : 'https://player.smashy.stream/movie/$cleanId',
      ),
      StreamSource(
        provider: '🌐 Server 6 (EmbedSu)',
        url: isSeries
          ? 'https://embed.su/embed/tv/$cleanId/$season/$episode'
          : 'https://embed.su/embed/movie/$cleanId',
      ),
    ];
  }

  static Future<List<Movie>> search(String query) async {
    try {
      final res = await http.get(Uri.parse('$tmdbBaseUrl/search/multi?api_key=$tmdbApiKey&query=${Uri.encodeComponent(query)}&include_adult=false')).timeout(const Duration(seconds: 8));
      if (res.statusCode == 200) {
        final d = json.decode(res.body);
        return (d['results'] as List)
            .where((i) => isSafe(i) && (i['poster_path'] != null || i['backdrop_path'] != null))
            .map((i) => mapItem(i, isTv: i['media_type'] == 'tv'))
            .toList();
      }
    } catch (_) {}
    return [];
  }
}
