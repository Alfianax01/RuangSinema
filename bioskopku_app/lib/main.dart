
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'models/movie.dart';
import 'screens/home_screen.dart';
import 'screens/discover_screen.dart';
import 'screens/detail_screen.dart';
import 'screens/auth_screen.dart';
import 'screens/profile_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const RuangSinemaApp());
}

class RuangSinemaApp extends StatelessWidget {
  const RuangSinemaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'RuangSinema',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF141414),
        primaryColor: const Color(0xFFE50914),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(ThemeData.dark().textTheme),
      ),
      home: const MainNavigationScreen(),
    );
  }
}

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;
  Movie? _selectedMovie;
  String? _userEmail = 'vip@ruangsinema.com';
  String? _userName = 'Member VIP';

  void _onSelectMovie(Movie movie) {
    setState(() {
      _selectedMovie = movie;
    });
  }

  void _onBackFromDetail() {
    setState(() {
      _selectedMovie = null;
    });
  }

  void _onLoginSuccess(String email, String name) {
    setState(() {
      _userEmail = email;
      _userName = name;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Selamat datang kembali, $name!')),
    );
  }

  void _onLogout() {
    setState(() {
      _userEmail = null;
      _userName = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_selectedMovie != null) {
      return DetailScreen(
        movie: _selectedMovie!,
        onBack: _onBackFromDetail,
        onSelectMovie: _onSelectMovie,
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFF141414),
      appBar: AppBar(
        backgroundColor: const Color(0xFF141414),
        elevation: 0,
        title: Row(
          children: [
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: const Color(0xFFE50914),
                borderRadius: BorderRadius.circular(6),
              ),
              child: const Icon(Icons.movie, size: 18, color: Colors.white),
            ),
            const SizedBox(width: 8),
            RichText(
              text: const TextSpan(
                text: 'RUANG',
                style: TextStyle(color: Color(0xFFE50914), fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: -0.5),
                children: [
                  TextSpan(text: 'SINEMA', style: TextStyle(color: Colors.white)),
                ],
              ),
            ),
          ],
        ),
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [
          HomeScreen(onSelectMovie: _onSelectMovie),
          DiscoverScreen(onSelectMovie: _onSelectMovie),
          const Center(child: Text('Koleksi Film & Drama Tersimpan', style: TextStyle(color: Colors.white54))),
          _userEmail != null
            ? ProfileScreen(email: _userEmail!, name: _userName!, onLogout: _onLogout)
            : AuthScreen(onLoginSuccess: _onLoginSuccess),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFF141414),
        selectedItemColor: const Color(0xFFE50914),
        unselectedItemColor: Colors.white38,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home_filled), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Discover'),
          BottomNavigationBarItem(icon: Icon(Icons.bookmark_border), label: 'Koleksi'),
          BottomNavigationBarItem(icon: Icon(Icons.person_outline), label: 'Profil'),
        ],
      ),
    );
  }
}
