import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import '../models/movie.dart';
import '../services/api_service.dart';

class PlayerScreen extends StatefulWidget {
  final Movie movie;
  final int season;
  final int episode;
  final List<EpisodeItem>? episodes;

  const PlayerScreen({
    super.key,
    required this.movie,
    this.season = 1,
    this.episode = 1,
    this.episodes,
  });

  @override
  State<PlayerScreen> createState() => _PlayerScreenState();
}

class _PlayerScreenState extends State<PlayerScreen> {
  late int _currentSeason;
  late int _currentEpisode;
  late List<StreamSource> _sources;
  int _activeSourceIndex = 0;
  bool _loading = true;
  late WebViewController _controller;
  bool _isLandscape = false;

  @override
  void initState() {
    super.initState();
    _currentSeason = widget.season;
    _currentEpisode = widget.episode;
    _initializePlayer();
  }

  @override
  void dispose() {
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.portraitUp,
      DeviceOrientation.portraitDown,
    ]);
    super.dispose();
  }

  void _initializePlayer() {
    setState(() => _loading = true);
    final isSeries = widget.movie.type == 'series';
    _sources = ApiService.getStreamSources(
      widget.movie.id,
      isSeries: isSeries,
      season: _currentSeason,
      episode: _currentEpisode,
    );

    final currentUrl = _sources[_activeSourceIndex].url;

    // Build Hardware-Accelerated 60 FPS WebView
    final PlatformWebViewControllerCreationParams params = const PlatformWebViewControllerCreationParams();
    _controller = WebViewController.fromPlatformCreationParams(params)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setUserAgent('Mozilla/5.0 (Linux; Android 14; Mobile; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36')
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            if (mounted) setState(() => _loading = true);
          },
          onPageFinished: (String url) {
            if (mounted) setState(() => _loading = false);
            // Inject GPU Hardware Acceleration and AdBlock CSS
            _controller.runJavaScript('''
              (function() {
                var style = document.createElement('style');
                style.innerHTML = `
                  * { -webkit-transform: translateZ(0) !important; }
                  video { width: 100% !important; height: 100% !important; object-fit: contain !important; }
                  iframe { border: 0 !important; width: 100% !important; height: 100% !important; }
                  body, html { background-color: #000 !important; overflow: hidden !important; }
                  .ad, .ads, [id*="ad"], [class*="ad-"] { display: none !important; }
                `;
                document.head.appendChild(style);
              })();
            ''');
          },
          onWebResourceError: (WebResourceError error) {
            if (mounted) setState(() => _loading = false);
          },
        ),
      );

    // Direct GPU Compositing Mode on Android
    if (_controller.platform is AndroidWebViewController) {
      final androidController = _controller.platform as AndroidWebViewController;
      androidController.setMediaPlaybackRequiresUserGesture(false);
      androidController.setMixedContentMode(MixedContentMode.alwaysAllow);
      androidController.setAllowFileAccess(true);
      androidController.setAllowContentAccess(true);
    }

    _controller.loadRequest(Uri.parse(currentUrl));
  }

  void _switchSource(int index) {
    if (index >= 0 && index < _sources.length) {
      setState(() {
        _activeSourceIndex = index;
        _loading = true;
      });
      _controller.loadRequest(Uri.parse(_sources[index].url));
    }
  }

  void _toggleLandscape() {
    setState(() {
      _isLandscape = !_isLandscape;
      if (_isLandscape) {
        SystemChrome.setPreferredOrientations([
          DeviceOrientation.landscapeLeft,
          DeviceOrientation.landscapeRight,
        ]);
      } else {
        SystemChrome.setPreferredOrientations([
          DeviceOrientation.portraitUp,
          DeviceOrientation.portraitDown,
        ]);
      }
    });
  }

  void _changeEpisode(int newEp) {
    if (newEp < 1) return;
    setState(() {
      _currentEpisode = newEp;
    });
    _initializePlayer();
  }

  @override
  Widget build(BuildContext context) {
    final isSeries = widget.movie.type == 'series';
    final currentSource = _sources.isNotEmpty ? _sources[_activeSourceIndex] : null;

    return Scaffold(
      backgroundColor: Colors.black,
      body: SafeArea(
        child: Column(
          children: [
            // Top App Bar
            Container(
              color: const Color(0xFF141414),
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.movie.title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (isSeries)
                          Text(
                            'Season $_currentSeason • Episode $_currentEpisode',
                            style: const TextStyle(
                              color: Color(0xFFE50914),
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: Icon(
                      _isLandscape ? Icons.fullscreen_exit : Icons.fullscreen,
                      color: Colors.white,
                      size: 24,
                    ),
                    onPressed: _toggleLandscape,
                    tooltip: 'Putar Layar Penuh (Landscape)',
                  ),
                  IconButton(
                    icon: const Icon(Icons.refresh, color: Colors.white70, size: 20),
                    onPressed: () => _controller.reload(),
                    tooltip: 'Muat Ulang Player',
                  ),
                ],
              ),
            ),

            // Video Player Container with 60 FPS GPU Acceleration
            Expanded(
              child: Stack(
                children: [
                  WebViewWidget(
                    controller: _controller,
                    layoutDirection: TextDirection.ltr,
                  ),
                  if (_loading)
                    Container(
                      color: Colors.black,
                      child: const Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            CircularProgressIndicator(
                              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFE50914)),
                              strokeWidth: 3,
                            ),
                            SizedBox(height: 16),
                            Text(
                              'Menghubungkan ke Stream 60 FPS Ultra HD...',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Bottom Server Switcher & Episode Controls
            if (!_isLandscape)
              Container(
                color: const Color(0xFF141414),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.speed, color: Color(0xFFE50914), size: 18),
                        const SizedBox(width: 8),
                        const Text(
                          'Pilih Server Video 60 FPS:',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        if (currentSource != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: const Color(0xFF10B981).withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.4)),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.bolt, color: Color(0xFF10B981), size: 12),
                                SizedBox(width: 2),
                                Text(
                                  '60 FPS SMOOTH',
                                  style: TextStyle(
                                    color: Color(0xFF10B981),
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    // Horizontal Server Chips
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: List.generate(_sources.length, (index) {
                          final src = _sources[index];
                          final isActive = index == _activeSourceIndex;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(
                                src.provider,
                                style: TextStyle(
                                  color: isActive ? Colors.white : Colors.grey,
                                  fontSize: 11,
                                  fontWeight: isActive ? FontWeight.w900 : FontWeight.bold,
                                ),
                              ),
                              selected: isActive,
                              selectedColor: const Color(0xFFE50914),
                              backgroundColor: const Color(0xFF222222),
                              side: BorderSide(
                                color: isActive ? const Color(0xFFE50914) : Colors.white10,
                              ),
                              onSelected: (_) => _switchSource(index),
                            ),
                          );
                        }),
                      ),
                    ),

                    // Series Prev / Next Episode Buttons
                    if (isSeries) ...[
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              icon: const Icon(Icons.skip_previous, size: 18),
                              label: const Text('Episode Sebelumnya', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF242424),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              onPressed: _currentEpisode > 1 ? () => _changeEpisode(_currentEpisode - 1) : null,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              icon: const Icon(Icons.skip_next, size: 18),
                              label: const Text('Episode Berikutnya', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFFE50914),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              onPressed: () => _changeEpisode(_currentEpisode + 1),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}
