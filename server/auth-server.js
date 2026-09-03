const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 5001;
const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB max payload
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;
const PBKDF2_ITERATIONS = 210000;
const LEGACY_PBKDF2_ITERATIONS = 10000;
const MAX_PBKDF2_ITERATIONS = 600000;
const ALLOWED_ORIGINS = (process.env.AUTH_ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

// MySQL Database Configuration (phpMyAdmin / Laragon / XAMPP / Remote Cloud MySQL)
const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bioskopku_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

let dbPool = null;
let isDbConnected = false;

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

// Initialize MySQL Database & Users Table automatically for phpMyAdmin
async function initDatabase() {
  try {
    // 1. Connect to MySQL server
    const rootConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.end();

    // 2. Connect pool to bioskopku_db
    dbPool = mysql.createPool(DB_CONFIG);

    // 3. Create users table for phpMyAdmin (with legacy-table upgrade)
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`salt\` VARCHAR(64) NULL,
        \`iterations\` INT NOT NULL DEFAULT 10000,
        \`genres\` TEXT NULL,
        \`role\` VARCHAR(50) DEFAULT 'VIP Member',
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    try {
      await dbPool.query('ALTER TABLE `users` ADD COLUMN `iterations` INT NOT NULL DEFAULT 10000');
    } catch (e) {
      // Column already exists
    }

    isDbConnected = true;
    console.log(`✅ [MySQL phpMyAdmin] Connected successfully to database "${DB_CONFIG.database}" on port ${DB_CONFIG.port}`);

    // 4. Sync existing fallback users into MySQL if empty
    const [rows] = await dbPool.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      const fallbackList = getFallbackUsers();
      for (const u of fallbackList) {
        await dbPool.query(
          'INSERT IGNORE INTO users (name, email, password, salt, iterations, genres, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [u.name, u.email, u.passwordHash || u.password, u.salt || '', u.iterations || 10000, JSON.stringify(u.genres || []), u.role || 'VIP Member']
        );
      }
      console.log(`🔄 [MySQL phpMyAdmin] Initialized ${fallbackList.length} seed users into MySQL database.`);
    }
  } catch (err) {
    console.warn(`⚠️ [MySQL phpMyAdmin] Could not connect to MySQL at ${DB_CONFIG.host}:${DB_CONFIG.port} (${err.message}). Using persistent JSON fallback store.`);
    isDbConnected = false;
  }
}

initDatabase();

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

// Password Hashing (PBKDF2 with SHA-512)
function hashPassword(password, salt, iterations = PBKDF2_ITERATIONS) {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
}

function verifyPassword(password, salt, storedHash, iterations = LEGACY_PBKDF2_ITERATIONS) {
  if (!salt || !storedHash) {
    return false;
  }
  const calculatedHash = hashPassword(password, salt, iterations);
  try {
    return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (e) {
    return false;
  }
}

function sanitizeString(str, maxLen = 50) {
  if (typeof str !== 'string') return '';
  return str.replace(/<[^>]*>?/gm, '').trim().substring(0, maxLen);
}

function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= 10
    && /[A-Za-z]/.test(password)
    && /[0-9]/.test(password);
}

function isLoopback(ip) {
  const clean = String(ip).split(',')[0].trim().replace(/^::ffff:/, '');
  return clean === '127.0.0.1' || clean === '::1';
}

function isTrustedAdmin(req) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (configuredKey) {
    const provided = req.headers['x-admin-key'];
    if (typeof provided === 'string'
      && provided.length === configuredKey.length
      && crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configuredKey))) {
      return true;
    }
    return false;
  }
  return isLoopback(req.socket.remoteAddress);
}

function normalizeIterations(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return LEGACY_PBKDF2_ITERATIONS;
  return Math.min(Math.max(parsed, LEGACY_PBKDF2_ITERATIONS), MAX_PBKDF2_ITERATIONS);
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(email.trim()) && email.length <= 100;
}

const server = http.createServer(async (req, res) => {
  const clientIp = req.socket.remoteAddress || '127.0.0.1';

  // Security & CORS Headers
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (req.method === 'POST') {
    if (isRateLimited(clientIp)) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
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

    req.on('end', async () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Format data JSON tidak valid.' }));
        return;
      }

      // 1. REGISTER (Save to MySQL phpMyAdmin + Fallback)
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

        if (!isStrongPassword(rawPassword)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Kata sandi minimal 10 karakter dan harus memuat huruf serta angka.' }));
          return;
        }

        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(rawPassword, salt);
        let insertedId = Date.now();

        // Check & Insert into MySQL
        if (isDbConnected && dbPool) {
          try {
            const [existing] = await dbPool.query('SELECT id FROM users WHERE email = ?', [email]);
            if (existing.length > 0) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', message: 'Email sudah terdaftar. Silakan login.' }));
              return;
            }

            const [result] = await dbPool.query(
              'INSERT INTO users (name, email, password, salt, iterations, genres, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [name, email, passwordHash, salt, PBKDF2_ITERATIONS, JSON.stringify([]), 'VIP Member']
            );
            insertedId = result.insertId;
            console.log(`✨ [MySQL phpMyAdmin] Inserted new user #${insertedId} (${email}) into table 'users'`);
          } catch (dbErr) {
            console.error('MySQL insert error:', dbErr.message);
          }
        }

        // Also save to Fallback JSON
        const fallbackUsers = getFallbackUsers();
        if (!fallbackUsers.some(u => u.email === email)) {
          fallbackUsers.push({
            id: insertedId,
            name,
            email,
            salt,
            passwordHash,
            iterations: PBKDF2_ITERATIONS,
            genres: [],
            role: 'VIP Member',
            created_at: new Date().toISOString()
          });
          saveFallbackUsers(fallbackUsers);
        }

        const userSafe = {
          id: insertedId,
          name,
          email,
          genres: [],
          role: 'VIP Member',
        };

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          message: 'Registrasi VIP berhasil!',
          user: userSafe,
        }));
        return;
      }

      // 2. LOGIN (Query from MySQL phpMyAdmin or Fallback)
      if (pathname === '/api/auth/login') {
        const rawEmail = data.email;
        const rawPassword = data.password;

        if (!rawEmail || !rawPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email dan kata sandi wajib diisi.' }));
          return;
        }

        const email = rawEmail.toLowerCase().trim();
        let userRecord = null;

        // Try querying MySQL
        if (isDbConnected && dbPool) {
          try {
            const [rows] = await dbPool.query('SELECT * FROM users WHERE email = ?', [email]);
            if (rows.length > 0) {
              userRecord = rows[0];
            }
          } catch (dbErr) {}
        }

        // Fallback to JSON store if not in MySQL
        if (!userRecord) {
          const fallbackUsers = getFallbackUsers();
          const found = fallbackUsers.find(u => u.email === email);
          if (found) {
            userRecord = {
              id: found.id,
              name: found.name,
              email: found.email,
              password: found.passwordHash || found.password,
              salt: found.salt,
              iterations: normalizeIterations(found.iterations),
              genres: JSON.stringify(found.genres || []),
              role: found.role || 'VIP Member'
            };
          }
        }

        if (!userRecord) {
          hashPassword(rawPassword, 'ruangsinema-dummy-salt', 10000);
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email atau kata sandi salah.' }));
          return;
        }

        const isValid = verifyPassword(rawPassword, userRecord.salt, userRecord.password, userRecord.iterations);
        if (!isValid) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email atau kata sandi salah.' }));
          return;
        }

        let parsedGenres = [];
        try {
          parsedGenres = typeof userRecord.genres === 'string' ? JSON.parse(userRecord.genres) : (userRecord.genres || []);
        } catch (e) {}

        const userSafe = {
          id: userRecord.id,
          name: userRecord.name,
          email: userRecord.email,
          genres: parsedGenres,
          role: userRecord.role || 'VIP Member',
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          message: 'Login berhasil! Selamat datang kembali.',
          user: userSafe,
        }));
        return;
      }

            // 4. RESET PASSWORD (Update MySQL phpMyAdmin & Fallback)
      if (pathname === '/api/auth/reset-password') {
        const rawEmail = data.email;
        const newPassword = data.newPassword;

        if (!rawEmail || !newPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email dan kata sandi baru wajib diisi.' }));
          return;
        }

        if (!isStrongPassword(newPassword)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Kata sandi minimal 10 karakter dan harus memuat huruf serta angka.' }));
          return;
        }

        const email = rawEmail.toLowerCase().trim();
        const salt = crypto.randomBytes(16).toString('hex');
        const passwordHash = hashPassword(newPassword, salt);
        let updated = false;

        // Update MySQL Database Table
        if (isDbConnected && dbPool) {
          try {
            const [result] = await dbPool.query(
              'UPDATE users SET password = ?, salt = ?, iterations = ? WHERE email = ?',
              [passwordHash, salt, PBKDF2_ITERATIONS, email]
            );
            if (result.affectedRows > 0) {
              updated = true;
              console.log(`🔑 [MySQL phpMyAdmin] Reset password for user (${email})`);
            }
          } catch (dbErr) {}
        }

        // Update Fallback JSON
        const fallbackUsers = getFallbackUsers();
        const found = fallbackUsers.find(u => u.email === email);
        if (found) {
          found.salt = salt;
          found.passwordHash = passwordHash;
          found.iterations = PBKDF2_ITERATIONS;
          saveFallbackUsers(fallbackUsers);
          updated = true;
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.'
        }));
        return;
      }

            // 5. SYNC FROM VERCEL / CLIENT TO MYSQL PHPMYADMIN
      if (pathname === '/api/auth/sync') {
        if (!isTrustedAdmin(req)) {
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Akses ditolak.' }));
          return;
        }

        const incomingUsers = Array.isArray(data.users) ? data.users : (data.user ? [data.user] : (data.email ? [data] : []));
        let syncedCount = 0;

        for (const u of incomingUsers) {
          const cleanEmail = (u.email || '').toLowerCase().trim();
          if (!cleanEmail) continue;

          // Only pre-hashed credentials are accepted; never invent or accept a plaintext password here.
          if (!u.salt || !u.passwordHash) continue;

          const name = u.name || 'VIP Member';
          const salt = u.salt;
          const passwordHash = u.passwordHash;
          const iterations = normalizeIterations(u.iterations);
          const genres = JSON.stringify(u.genres || []);
          const role = u.role || 'VIP Member';

          if (isDbConnected && dbPool) {
            try {
              await dbPool.query(
                `INSERT INTO users (name, email, password, salt, iterations, genres, role) 
                 VALUES (?, ?, ?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE
                   name = VALUES(name),
                   password = VALUES(password),
                   salt = VALUES(salt),
                   iterations = VALUES(iterations),
                   genres = VALUES(genres),
                   role = VALUES(role)`,
                [name, cleanEmail, passwordHash, salt, iterations, genres, role]
              );
              syncedCount++;
              console.log(`🔄 [MySQL phpMyAdmin] Synced user (${cleanEmail}) into table 'users'`);
            } catch (dbErr) {
              console.error('Sync MySQL Error:', dbErr.message);
            }
          }

          // Also sync fallback JSON
          const fallbackUsers = getFallbackUsers();
          const existing = fallbackUsers.find(x => x.email === cleanEmail);
          if (existing) {
            existing.genres = u.genres || existing.genres;
            existing.salt = salt;
            existing.passwordHash = passwordHash;
            existing.iterations = iterations;
          } else {
            fallbackUsers.push({
              id: u.id || Date.now(),
              name,
              email: cleanEmail,
              salt,
              passwordHash,
              iterations,
              genres: u.genres || [],
              role,
              created_at: new Date().toISOString()
            });
          }
          saveFallbackUsers(fallbackUsers);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          message: `Berhasil mensinkronkan ${syncedCount} akun ke MySQL phpMyAdmin!`,
          syncedCount
        }));
        return;
      }

      // 3. UPDATE PREFERENCES
      if (pathname === '/api/auth/preferences') {
        const { email, genres } = data;
        const cleanEmail = (email || '').toLowerCase().trim();

        if (cleanEmail && Array.isArray(genres)) {
          if (isDbConnected && dbPool) {
            try {
              await dbPool.query('UPDATE users SET genres = ? WHERE email = ?', [JSON.stringify(genres), cleanEmail]);
              console.log(`🎨 [MySQL phpMyAdmin] Updated genre preferences for user (${cleanEmail})`);
            } catch (e) {}
          }

          const fallbackUsers = getFallbackUsers();
          const u = fallbackUsers.find(x => x.email === cleanEmail);
          if (u) {
            u.genres = genres;
            saveFallbackUsers(fallbackUsers);
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Preferensi berhasil disimpan.' }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Endpoint tidak ditemukan.' }));
    });
    return;
  }

    // GET /api/auth/users
  if (pathname === '/api/auth/users') {
    if (!isTrustedAdmin(req)) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Akses ditolak.' }));
      return;
    }

    if (isDbConnected && dbPool) {
      try {
        const [rows] = await dbPool.query('SELECT id, name, email, genres, role, created_at FROM users ORDER BY id DESC');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', users: rows }));
        return;
      } catch (e) {}
    }

    const fallbackUsers = getFallbackUsers().map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      genres: u.genres,
      role: u.role,
      created_at: u.created_at
    }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', users: fallbackUsers }));
    return;
  }

  // GET /api/auth/health
  if (pathname === '/api/auth/health' || pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'RuangSinema Auth Server',
      database: isDbConnected ? 'MySQL Connected (phpMyAdmin Ready)' : 'Persistent Fallback Mode',
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('RuangSinema Auth API Server');
});

server.listen(PORT, () => {
  console.log(`🛡️ RuangSinema Auth Server running on http://localhost:${PORT}`);
  console.log(`📊 phpMyAdmin Database target: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
});

// Cloud -> local user replication is intentionally not automated: the cloud API only
// exposes public profile fields, so credentials must be pushed to /api/auth/sync by a
// trusted caller instead of being pulled from a public listing.
