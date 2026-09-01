
class CastMember {
  final int id;
  final String name;
  final String character;
  final String? avatarUrl;

  CastMember({
    required this.id,
    required this.name,
    required this.character,
    this.avatarUrl,
  });

  factory CastMember.fromJson(Map<String, dynamic> json) {
    return CastMember(
      id: json['id'] ?? 0,
      name: json['name'] ?? 'Aktor',
      character: json['character'] ?? 'Pemeran',
      avatarUrl: json['profile_path'] != null 
          ? 'https://image.tmdb.org/t/p/w185${json['profile_path']}' 
          : null,
    );
  }
}

class SeasonItem {
  final int seasonNumber;
  final String name;
  final int episodeCount;
  final String? overview;
  final String? posterPath;

  SeasonItem({
    required this.seasonNumber,
    required this.name,
    required this.episodeCount,
    this.overview,
    this.posterPath,
  });

  factory SeasonItem.fromJson(Map<String, dynamic> json) {
    return SeasonItem(
      seasonNumber: json['season_number'] ?? json['seasonNumber'] ?? 1,
      name: json['name'] ?? 'Season ${json['season_number'] ?? 1}',
      episodeCount: json['episode_count'] ?? json['episodeCount'] ?? 10,
      overview: json['overview'],
      posterPath: json['poster_path'] ?? json['posterPath'],
    );
  }
}

class EpisodeItem {
  final int episodeNumber;
  final int seasonNumber;
  final String title;
  final String overview;
  final String? stillPath;
  final String duration;
  final String? releaseDate;
  final String? rating;

  EpisodeItem({
    required this.episodeNumber,
    required this.seasonNumber,
    required this.title,
    required this.overview,
    this.stillPath,
    required this.duration,
    this.releaseDate,
    this.rating,
  });

  factory EpisodeItem.fromJson(Map<String, dynamic> json, int seasonNum) {
    return EpisodeItem(
      episodeNumber: json['episode_number'] ?? json['episodeNumber'] ?? 1,
      seasonNumber: seasonNum,
      title: json['name'] ?? json['title'] ?? 'Episode ${json['episode_number'] ?? 1}',
      overview: json['overview'] ?? 'Sinopsis episode lengkap subtitle Indonesia.',
      stillPath: json['still_path'] != null ? 'https://image.tmdb.org/t/p/w500${json['still_path']}' : null,
      duration: json['runtime'] != null ? '${json['runtime']}m' : '24m',
      releaseDate: json['air_date'] ?? json['releaseDate'],
      rating: json['vote_average'] != null ? (json['vote_average'] as num).toStringAsFixed(1) : '8.0',
    );
  }
}

class StreamSource {
  final String provider;
  final String url;
  final List<String> resolutions;

  StreamSource({
    required this.provider,
    required this.url,
    this.resolutions = const ['1080p', '720p', '480p'],
  });
}

class Movie {
  final String id;
  final String title;
  final String type; // 'movie' | 'series'
  final String posterImg;
  final String backdropImg;
  final String rating;
  final String year;
  final String ageRating;
  final String duration;
  final String quality;
  final String qualityResolution;
  final List<String> genres;
  final String synopsis;
  final String? tagline;
  final String trailerUrl;
  final List<String> directors;
  final List<String> casts;
  final List<CastMember> castMembers;
  final List<SeasonItem>? seasons;
  final List<EpisodeItem>? episodes;
  final bool isComingSoon;
  final String? releaseStatus;

  Movie({
    required this.id,
    required this.title,
    required this.type,
    required this.posterImg,
    required this.backdropImg,
    required this.rating,
    required this.year,
    this.ageRating = '16+',
    required this.duration,
    this.quality = 'HD',
    this.qualityResolution = '4K ULTRA HD',
    required this.genres,
    required this.synopsis,
    this.tagline,
    this.trailerUrl = '',
    this.directors = const [],
    this.casts = const [],
    this.castMembers = const [],
    this.seasons,
    this.episodes,
    this.isComingSoon = false,
    this.releaseStatus = 'Released',
  });
}
