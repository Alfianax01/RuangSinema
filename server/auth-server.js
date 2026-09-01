const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const PORT = 5001;
const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB max payload
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 15; // Max 15 auth attempts / min

// In-Memory Rate Limiter
const ipRequestHistory = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const history = ipRequestHistory.get(ip) || [];
  const validHistory = history.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
  
  if (validHistory.length >= MAX_REQUESTS_PER_WINDOW) {
    ipRequestHistory.set(ip, validHistory);
    return true;
  }

  validHistory.push(now);
  ipRequestHistory.set(ip, validHistory);
  return false;
}

// Clean up stale rate-limiting entries every 5 mins
setInterval(() => {
  const now = Date.now();
  for (const [ip, history] of ipRequestHistory.entries()) {
    const validHistory = history.filter(time => now - time < RATE_LIMIT_WINDOW_MS);
    if (validHistory.length === 0) {
      ipRequestHistory.delete(ip);
    } else {
      ipRequestHistory.set(ip, validHistory);
    }
  }
}, 5 * 60 * 1000);

// Cryptographic Password Hashing (PBKDF2 with SHA-512)
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  const calculatedHash = hashPassword(password, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (e) {
    return false;
  }
}

// Input Sanitization
function sanitizeString(str, maxLen = 50) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLen);
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim()) && email.length <= 100;
}

// Fallback Persistent JSON Store
const fallbackFile = path.join(__dirname, 'users_fallback.json');

function getFallbackUsers() {
  try {
    if (fs.existsSync(fallbackFile)) {
      const data = JSON.parse(fs.readFileSync(fallbackFile, 'utf8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {}
  return [];
}

function saveFallbackUsers(users) {
  try {
    fs.writeFileSync(fallbackFile, JSON.stringify(users, null, 2), 'utf8');
  } catch (e) {}
}

const server = http.createServer((req, res) => {
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Security Headers (OWASP Recommended)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (req.method === 'POST') {
    // Rate Limiting Check
    if (isRateLimited(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '60' });
      res.end(JSON.stringify({ status: 'error', message: 'Terlalu banyak permintaan. Silakan tunggu 1 menit.' }));
      return;
    }

    let body = '';
    let bodySize = 0;

    req.on('data', chunk => {
      bodySize += chunk.length;
      if (bodySize > MAX_PAYLOAD_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Payload terlalu besar (Max 1MB).' }));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Format data JSON tidak valid.' }));
        return;
      }

      // 1. REGISTER
      if (pathname === '/api/auth/register') {
        const rawName = data.name;
        const rawEmail = data.email;
        const rawPassword = data.password;

        if (!rawName || !rawEmail || !rawPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Nama, email, dan kata sandi wajib diisi.' }));
          return;
        }

        const name = sanitizeString(rawName, 50);
        const email = rawEmail.toLowerCase().trim();

        if (!isValidEmail(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Format alamat email tidak valid.' }));
          return;
        }

        if (typeof rawPassword !== 'string' || rawPassword.length < 4 || rawPassword.length > 100) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Kata sandi harus minimal 4 karakter dan maksimal 100 karakter.' }));
          return;
        }

        const users = getFallbackUsers();
        if (users.some(u => u.email === email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email sudah terdaftar. Silakan login.' }));
          return;
        }

        // Generate Salt and Hash Password securely
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(rawPassword, salt);

        const newUser = {
          id: Date.now(),
          name,
          email,
          salt,
          passwordHash,
          genres: [],
          role: 'VIP Member',
          created_at: new Date().toISOString()
        };

        users.push(newUser);
        saveFallbackUsers(users);

        const userSafe = {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          genres: newUser.genres,
          role: newUser.role,
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Registrasi berhasil!', user: userSafe }));
        return;
      }

      // 2. LOGIN
      if (pathname === '/api/auth/login') {
        const rawEmail = data.email;
        const rawPassword = data.password;

        if (!rawEmail || !rawPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email dan kata sandi wajib diisi.' }));
          return;
        }

        const email = rawEmail.toLowerCase().trim();
        const users = getFallbackUsers();
        const found = users.find(u => u.email === email);

        if (!found) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email atau kata sandi tidak cocok.' }));
          return;
        }

        // Verify Hash (Supports PBKDF2 hash & legacy transition)
        let isMatch = false;
        if (found.salt && found.passwordHash) {
          isMatch = verifyPassword(rawPassword, found.salt, found.passwordHash);
        } else if (found.password) {
          // Upgrade legacy user password to secure hash
          isMatch = (found.password === rawPassword);
          if (isMatch) {
            found.salt = crypto.randomBytes(16).toString('hex');
            found.passwordHash = hashPassword(rawPassword, found.salt);
            delete found.password;
            saveFallbackUsers(users);
          }
        }

        if (!isMatch) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email atau kata sandi tidak cocok.' }));
          return;
        }

        const userSafe = {
          id: found.id,
          name: found.name,
          email: found.email,
          genres: found.genres || [],
          role: found.role || 'VIP Member',
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Login berhasil!', user: userSafe }));
        return;
      }

      // 3. PREFERENCES
      if (pathname === '/api/auth/preferences') {
        const rawEmail = data.email;
        const genres = data.genres;

        if (!rawEmail || !isValidEmail(rawEmail)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email tidak valid.' }));
          return;
        }

        const email = rawEmail.toLowerCase().trim();
        const genresArray = Array.isArray(genres) ? genres.map(g => sanitizeString(String(g), 30)) : [];
        const users = getFallbackUsers();
        const idx = users.findIndex(u => u.email === email);

        if (idx !== -1) {
          users[idx].genres = genresArray;
          saveFallbackUsers(users);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Preferensi genre disimpan!', genres: genresArray }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Route tidak ditemukan.' }));
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', message: 'RuangSinema Secure Auth Server Active', version: '2.0.0' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('🛡️ RuangSinema Hardened Auth Server running on http://localhost:' + PORT);
});
