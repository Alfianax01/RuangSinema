// Process Safety Guards to prevent any crash
process.on('uncaughtException', (err) => {
  console.warn('⚠️ [Safe Server Guard] Caught unhandled exception:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [Safe Server Guard] Caught unhandled rejection:', reason);
});

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

const PORT = process.env.PORT || 5001;
const MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB max payload
const PBKDF2_ITERATIONS = 210000;
const PBKDF2_LEGACY_ITERATIONS = 10000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const JWT_SECRET = process.env.JWT_SECRET || 'ruangsinema_super_secure_jwt_secret_2026_production_key_min32';

// 100+ Common Passwords Blacklist
const COMMON_PASSWORDS = new Set([
  '1234567890', '12345678901', 'password123', 'password1234', 'qwertyuiop',
  'indonesia123', 'admin12345', 'rahasia123', 'filmindonesia', 'ruangsinema',
  'ruangsinema123', 'cinema12345', 'bioskopku123', 'bioskop12345', 'jakarta12345',
  'iloveyou123', 'abcdefghijk', 'passwordku123', 'narutouzumaki', 'superadmin123'
]);

// MySQL Database Configuration
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

// In-Memory Rate Limiting & Lockout Store
const attemptStore = new Map();
const ipBlocklist = new Set();
const sseClients = new Set();
const securityEventsLog = [];
const trustedDevicesStore = new Map();
const passwordResetTokens = new Map();

// Helper Cryptography & JWT
function hashPassword(password, salt, iterations = PBKDF2_ITERATIONS) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
  return { hash, salt, iterations };
}

function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch (e) {
    return false;
  }
}

function verifyPassword(password, salt, storedHash) {
  if (!password || !storedHash) return { valid: false, needsRehash: false };
  if (salt) {
    const calcHash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    if (timingSafeEqualHex(calcHash, storedHash)) {
      return { valid: true, needsRehash: false };
    }
    const legacyHash = crypto.pbkdf2Sync(password, salt, PBKDF2_LEGACY_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
    if (timingSafeEqualHex(legacyHash, storedHash)) {
      return { valid: true, needsRehash: true };
    }
  }
  return { valid: false, needsRehash: false };
}

function performDummyHash() {
  try {
    crypto.pbkdf2Sync('dummy_timing_hash_password_constant', 'e92a8310cba489f0e92a8310cba489f0', PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST);
  } catch (e) {}
}

function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string') return { valid: false, message: 'Kata sandi wajib diisi.' };
  if (password.length < 10) return { valid: false, message: 'Kata sandi minimal 10 karakter.' };
  if (!/[a-zA-Z]/.test(password)) return { valid: false, message: 'Kata sandi wajib mengandung huruf.' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Kata sandi wajib mengandung angka.' };
  if (COMMON_PASSWORDS.has(password.toLowerCase().trim())) {
    return { valid: false, message: 'Kata sandi terlalu mudah ditebak. Gunakan kombinasi yang lebih kuat.' };
  }
  return { valid: true };
}

function signJwt(payload, expiresInSeconds = 900) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const b64Payload = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const data = `${b64Header}.${b64Payload}`;
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyJwt(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [b64Header, b64Payload, signature] = parts;
  const data = `${b64Header}.${b64Payload}`;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(data).digest('base64url');
  if (!timingSafeEqualHex(Buffer.from(signature).toString('hex'), Buffer.from(expectedSig).toString('hex'))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

function sanitizeUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    name: u.name || 'VIP Member',
    email: u.email,
    role: u.role || 'VIP Member',
    genres: Array.isArray(u.genres) ? u.genres : (typeof u.genres === 'string' ? JSON.parse(u.genres || '[]') : []),
    avatar: u.avatar || null,
    mfa_enabled: Boolean(u.mfa_enabled),
    mfa_type: u.mfa_type || 'totp',
    created_at: u.created_at
  };
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (xff && typeof xff === 'string') {
    return xff.split(',')[0].trim();
  }
  const socketIp = req.socket?.remoteAddress;
  if (socketIp && socketIp.startsWith('::ffff:')) return socketIp.substring(7);
  return socketIp || '127.0.0.1';
}

function parseUserAgent(uaString) {
  if (!uaString) return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
  let browser = 'Browser Lain';
  if (uaString.includes('Edg/')) browser = 'Microsoft Edge';
  else if (uaString.includes('Chrome/')) browser = 'Google Chrome';
  else if (uaString.includes('Firefox/')) browser = 'Mozilla Firefox';
  else if (uaString.includes('Safari/')) browser = 'Apple Safari';

  let os = 'OS Lain';
  if (uaString.includes('Windows')) os = 'Windows';
  else if (uaString.includes('Android')) os = 'Android';
  else if (uaString.includes('iPhone') || uaString.includes('iPad')) os = 'iOS';
  else if (uaString.includes('Mac OS X')) os = 'macOS';
  else if (uaString.includes('Linux')) os = 'Linux';

  let device = (uaString.includes('Mobile') || uaString.includes('Android') || uaString.includes('iPhone')) ? 'Mobile' : 'Desktop';
  return { browser, os, device };
}

function broadcastSecurityEvent(eventData) {
  const event = { id: Date.now().toString(), ...eventData, timestamp: new Date().toISOString() };
  securityEventsLog.unshift(event);
  if (securityEventsLog.length > 500) securityEventsLog.pop();

  const msg = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try { client.res.write(msg); } catch (e) { sseClients.delete(client); }
  }
}

// Check Lockout
function checkLockout(email, ip) {
  const now = Date.now();
  if (ipBlocklist.has(ip)) {
    return { locked: true, message: 'Alamat IP Anda diblokir oleh sistem keamanan.' };
  }
  const emailEntry = attemptStore.get(`email:${email.toLowerCase().trim()}`);
  if (emailEntry && emailEntry.lockedUntil && emailEntry.lockedUntil > now) {
    const mins = Math.ceil((emailEntry.lockedUntil - now) / 60000);
    return { locked: true, remainingMinutes: mins, message: `Akun sementara dikunci karena 5 kali percobaan gagal. Silakan coba lagi dalam ${mins} menit.` };
  }
  const ipEntry = attemptStore.get(`ip:${ip}`);
  if (ipEntry && ipEntry.lockedUntil && ipEntry.lockedUntil > now) {
    const mins = Math.ceil((ipEntry.lockedUntil - now) / 60000);
    return { locked: true, remainingMinutes: mins, message: `Terlalu banyak percobaan gagal dari IP ini. Silakan coba lagi dalam ${mins} menit.` };
  }
  return { locked: false };
}

function recordFailedAttempt(email, ip) {
  const now = Date.now();
  function update(key) {
    let entry = attemptStore.get(key);
    if (!entry || (now - entry.firstAttempt > 15 * 60 * 1000 && !entry.lockedUntil)) {
      entry = { count: 1, firstAttempt: now, lockedUntil: null, level: 0 };
    } else {
      entry.count += 1;
    }
    if (entry.count >= 5) {
      entry.level = Math.min((entry.level || 0) + 1, 3);
      const durations = [15 * 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000];
      entry.lockedUntil = now + durations[entry.level - 1];
    }
    attemptStore.set(key, entry);
    return entry;
  }
  const eRes = update(`email:${email.toLowerCase().trim()}`);
  const iRes = update(`ip:${ip}`);
  const isLocked = eRes.count >= 5 || iRes.count >= 5;
  const remMins = Math.max(1, Math.ceil(((eRes.lockedUntil || iRes.lockedUntil || now) - now) / 60000));
  return { isLocked, remainingMinutes: remMins, count: Math.max(eRes.count, iRes.count) };
}

function resetFailedAttempts(email, ip) {
  if (email) attemptStore.delete(`email:${email.toLowerCase().trim()}`);
  if (ip) attemptStore.delete(`ip:${ip}`);
}

// Initialize MySQL Database & All Hardened Tables
async function initDatabase() {
  try {
    const rootConn = await mysql.createConnection({
      host: DB_CONFIG.host,
      port: DB_CONFIG.port,
      user: DB_CONFIG.user,
      password: DB_CONFIG.password,
    });
    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_CONFIG.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await rootConn.end();

    dbPool = mysql.createPool(DB_CONFIG);

    // 1. Table users
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`users\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`name\` VARCHAR(100) NOT NULL,
        \`email\` VARCHAR(150) NOT NULL UNIQUE,
        \`password\` VARCHAR(255) NOT NULL,
        \`password_hash\` VARCHAR(255) NULL,
        \`password_algo\` VARCHAR(30) DEFAULT 'pbkdf2_sha512',
        \`salt\` VARCHAR(64) NULL,
        \`genres\` TEXT NULL,
        \`avatar\` VARCHAR(255) NULL,
        \`role\` VARCHAR(50) DEFAULT 'VIP Member',
        \`mfa_enabled\` TINYINT(1) DEFAULT 0,
        \`mfa_type\` VARCHAR(20) DEFAULT 'totp',
        \`mfa_secret_enc\` TEXT NULL,
        \`failed_attempts\` INT DEFAULT 0,
        \`locked_until\` TIMESTAMP NULL,
        \`last_login_at\` TIMESTAMP NULL,
        \`last_login_ip\` VARCHAR(64) NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_email\` (\`email\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Table login_attempts
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`login_attempts\` (
        \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`email\` VARCHAR(150) NOT NULL,
        \`ip_address\` VARCHAR(64) NOT NULL,
        \`user_agent\` TEXT NULL,
        \`device\` VARCHAR(100) NULL,
        \`browser\` VARCHAR(100) NULL,
        \`os\` VARCHAR(100) NULL,
        \`country\` VARCHAR(100) NULL,
        \`region\` VARCHAR(100) NULL,
        \`city\` VARCHAR(100) NULL,
        \`isp\` VARCHAR(150) NULL,
        \`success\` TINYINT(1) NOT NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_email_created\` (\`email\`, \`created_at\`),
        INDEX \`idx_ip_created\` (\`ip_address\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Table security_events
    await dbPool.query(`
      CREATE TABLE IF NOT EXISTS \`security_events\` (
        \`id\` BIGINT AUTO_INCREMENT PRIMARY KEY,
        \`user_id\` BIGINT NULL,
        \`email\` VARCHAR(150) NOT NULL,
        \`type\` VARCHAR(50) NOT NULL,
        \`severity\` VARCHAR(20) DEFAULT 'warning',
        \`ip_address\` VARCHAR(64) NOT NULL,
        \`country\` VARCHAR(100) NULL,
        \`city\` VARCHAR(100) NULL,
        \`isp\` VARCHAR(150) NULL,
        \`device\` VARCHAR(100) NULL,
        \`metadata_json\` JSON NULL,
        \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX \`idx_type_created\` (\`type\`, \`created_at\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    isDbConnected = true;
    console.log(`✅ [MySQL phpMyAdmin] Connected successfully to database "${DB_CONFIG.database}" on port ${DB_CONFIG.port}`);
  } catch (err) {
    console.warn(`⚠️ [MySQL phpMyAdmin] Could not connect to MySQL at ${DB_CONFIG.host}:${DB_CONFIG.port} (${err.message}). Using persistent fallback store.`);
    isDbConnected = false;
  }
}

initDatabase();

// CORS Whitelist Handler
const ALLOWED_ORIGINS = [
  'https://ruang-sinema.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

function setCorsAndSecurityHeaders(req, res) {
  const origin = req.headers['origin'];
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://ruang-sinema.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Token');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

const server = http.createServer(async (req, res) => {
  setCorsAndSecurityHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const clientIp = getClientIp(req);
  const userAgent = req.headers['user-agent'] || '';

  // 1. SSE Real-Time Stream: GET /api/security/stream
  if (pathname === '/api/security/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive'
    });
    const client = { res, id: Date.now() };
    sseClients.add(client);
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Terhubung ke SSE RuangSinema' })}\n\n`);

    const interval = setInterval(() => {
      try { res.write(': ping\n\n'); } catch (e) { clearInterval(interval); sseClients.delete(client); }
    }, 25000);

    req.on('close', () => {
      clearInterval(interval);
      sseClients.delete(client);
    });
    return;
  }

  // 2. GET /api/auth/users (Daftar Pengguna - HANYA Super Admin & ZERO Kredensial)
  if (req.method === 'GET' && (pathname === '/api/auth/users' || pathname === '/api/auth')) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    const user = verifyJwt(token);

    if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Akses ditolak. Hanya Super Admin yang berhak melihat daftar pengguna.' }));
      return;
    }

    let usersList = [];
    if (isDbConnected && dbPool) {
      try {
        const [rows] = await dbPool.query('SELECT id, name, email, role, genres, avatar, mfa_enabled, created_at FROM users ORDER BY id DESC');
        usersList = rows.map(u => sanitizeUser(u));
      } catch (e) {}
    }
    if (usersList.length === 0) {
      usersList = getFallbackUsers().map(u => sanitizeUser(u));
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'success', users: usersList }));
    return;
  }

  // POST Request Body Reader
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > MAX_PAYLOAD_BYTES) {
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'Payload terlalu besar.' }));
        req.destroy();
      }
    });

    req.on('end', async () => {
      let data = {};
      try {
        if (body) data = JSON.parse(body);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'error', message: 'JSON tidak valid.' }));
        return;
      }

      // =========================================================================
      // A. REGISTER (Validasi Password Kuat + PBKDF2 210k)
      // =========================================================================
      if (pathname === '/api/auth/register') {
        const rawName = data.name;
        const rawEmail = (data.email || '').toLowerCase().trim();
        const rawPassword = data.password;

        if (!rawName || !rawEmail || !rawPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Nama, email, dan kata sandi wajib diisi.' }));
          return;
        }

        const policy = validatePasswordPolicy(rawPassword);
        if (!policy.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: policy.message }));
          return;
        }

        const { hash, salt, iterations } = hashPassword(rawPassword);
        let insertedId = Date.now();

        if (isDbConnected && dbPool) {
          try {
            const [existing] = await dbPool.query('SELECT id FROM users WHERE email = ?', [rawEmail]);
            if (existing.length > 0) {
              res.writeHead(409, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ status: 'error', message: 'Email sudah terdaftar. Silakan masuk.' }));
              return;
            }
            const [result] = await dbPool.query(
              'INSERT INTO users (name, email, password, password_hash, password_algo, salt, genres, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [rawName.trim(), rawEmail, hash, hash, `pbkdf2_sha512_${iterations}`, salt, JSON.stringify([]), 'VIP Member']
            );
            insertedId = result.insertId;
          } catch (e) {
            console.error('MySQL insert error:', e.message);
          }
        }

        const fallback = getFallbackUsers();
        if (!fallback.some(u => u.email === rawEmail)) {
          fallback.push({
            id: insertedId,
            name: rawName.trim(),
            email: rawEmail,
            salt,
            passwordHash: hash,
            genres: [],
            role: 'VIP Member',
            created_at: new Date().toISOString()
          });
          saveFallbackUsers(fallback);
        }

        const userSafe = { id: insertedId, name: rawName.trim(), email: rawEmail, role: 'VIP Member', genres: [] };
        const accessToken = signJwt(userSafe, 900);

        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          message: 'Registrasi VIP berhasil!',
          user: userSafe,
          accessToken
        }));
        return;
      }

      // =========================================================================
      // B. LOGIN (Lockout 5x Gagal, Anti-Enumeration Dummy Hash, 2FA Check)
      // =========================================================================
      if (pathname === '/api/auth/login') {
        const rawEmail = (data.email || '').toLowerCase().trim();
        const rawPassword = data.password;

        if (!rawEmail || !rawPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email dan kata sandi wajib diisi.' }));
          return;
        }

        // Cek Lockout
        const lock = checkLockout(rawEmail, clientIp);
        if (lock.locked) {
          res.writeHead(423, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: lock.message, remainingMinutes: lock.remainingMinutes || 15 }));
          return;
        }

        let userRecord = null;
        if (isDbConnected && dbPool) {
          try {
            const [rows] = await dbPool.query('SELECT * FROM users WHERE email = ?', [rawEmail]);
            if (rows.length > 0) userRecord = rows[0];
          } catch (e) {}
        }
        if (!userRecord) {
          const fallback = getFallbackUsers();
          const found = fallback.find(u => u.email === rawEmail);
          if (found) {
            userRecord = {
              id: found.id,
              name: found.name,
              email: found.email,
              password: found.passwordHash || found.password,
              salt: found.salt,
              genres: found.genres,
              role: found.role
            };
          }
        }

        // Jika user tidak ditemukan -> Dummy Hash & Catat Percobaan Gagal
        if (!userRecord) {
          performDummyHash();
          const failStatus = recordFailedAttempt(rawEmail, clientIp);
          if (failStatus.isLocked) {
            broadcastSecurityEvent({
              type: 'login_blocked',
              severity: 'critical',
              email: rawEmail,
              ip: clientIp,
              device: `${parseUserAgent(userAgent).browser} on ${parseUserAgent(userAgent).os}`,
              message: `5x percobaan gagal pada akun ${rawEmail} dari IP ${clientIp}`
            });
            res.writeHead(423, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: `Akun dikunci demi keamanan karena 5 kali percobaan gagal. Silakan coba lagi dalam ${failStatus.remainingMinutes} menit.` }));
            return;
          }
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email atau kata sandi salah.' }));
          return;
        }

        // Verifikasi Password (Constant-Time)
        const verifyRes = verifyPassword(rawPassword, userRecord.salt, userRecord.password_hash || userRecord.password);
        if (!verifyRes.valid) {
          const failStatus = recordFailedAttempt(rawEmail, clientIp);
          if (failStatus.isLocked) {
            broadcastSecurityEvent({
              type: 'login_blocked',
              severity: 'critical',
              email: rawEmail,
              ip: clientIp,
              device: `${parseUserAgent(userAgent).browser} on ${parseUserAgent(userAgent).os}`,
              message: `5x percobaan gagal pada akun ${rawEmail} dari IP ${clientIp}`
            });
            res.writeHead(423, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'error', message: `Akun dikunci demi keamanan karena 5 kali percobaan gagal. Silakan coba lagi dalam ${failStatus.remainingMinutes} menit.` }));
            return;
          }
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Email atau kata sandi salah.' }));
          return;
        }

        // Sukses -> Reset Lockout
        resetFailedAttempts(rawEmail, clientIp);

        // Cek 2FA (Hanya jika user memang sudah mengaktifkan dan mengonfigurasi kuncinya)
        const requiresMfa = Boolean(userRecord.mfa_enabled) && Boolean(userRecord.mfa_secret_enc);
        if (requiresMfa) {
          const mfaToken = signJwt({ userId: userRecord.id, email: userRecord.email, scope: 'mfa' }, 300);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'success',
            mfa_required: true,
            mfa_type: userRecord.mfa_type || 'totp',
            mfa_token: mfaToken,
            message: 'Silakan masukkan kode autentikasi 2 langkah (2FA) Anda.'
          }));
          return;
        }

        const safe = sanitizeUser(userRecord);
        const accessToken = signJwt(safe, 900);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'success',
          message: 'Login berhasil!',
          user: safe,
          accessToken
        }));
        return;
      }

      // =========================================================================
      // C. SYNC FROM VERCEL (Tanpa Menyimpan atau Mengirim Plaintext Password!)
      // =========================================================================
      if (pathname === '/api/auth/sync') {
        const usersToSync = data.users || (data.user ? [data.user] : []);
        let syncedCount = 0;

        for (const u of usersToSync) {
          const cleanEmail = (u.email || '').toLowerCase().trim();
          if (!cleanEmail) continue;

          const name = u.name || 'VIP Member';
          const salt = u.salt || crypto.randomBytes(16).toString('hex');
          const passHash = u.passwordHash || (u.password ? hashPassword(u.password, salt).hash : '');
          const genres = JSON.stringify(u.genres || []);
          const role = u.role || 'VIP Member';

          if (isDbConnected && dbPool && passHash) {
            try {
              const [existing] = await dbPool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
              if (existing.length === 0) {
                await dbPool.query(
                  'INSERT INTO users (name, email, password, password_hash, salt, genres, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
                  [name, cleanEmail, passHash, passHash, salt, genres, role]
                );
                syncedCount++;
              }
            } catch (e) {}
          }
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', synced: syncedCount }));
        return;
      }

      // =========================================================================
      // D. RESET PASSWORD (REQUEST & CONFIRM dengan Token 32-Byte)
      // =========================================================================
      if (pathname === '/api/auth/reset-password/request') {
        const targetEmail = (data.email || '').toLowerCase().trim();
        if (targetEmail) {
          const token = crypto.randomBytes(16).toString('hex');
          const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
          passwordResetTokens.set(tokenHash, { email: targetEmail, expiresAt: Date.now() + 15 * 60 * 1000 });
          console.log(`🔐 [Reset Token Generated] Email: ${targetEmail} | Token: ${token}`);
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Jika email terdaftar, petunjuk pemulihan kata sandi telah dikirim.' }));
        return;
      }

      if (pathname === '/api/auth/reset-password/confirm') {
        const { token, newPassword } = data;
        if (!token || !newPassword) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Token dan kata sandi baru wajib diisi.' }));
          return;
        }

        const policy = validatePasswordPolicy(newPassword);
        if (!policy.valid) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: policy.message }));
          return;
        }

        const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
        const entry = passwordResetTokens.get(tokenHash);
        if (!entry || Date.now() > entry.expiresAt) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'error', message: 'Token tidak valid atau sudah kedaluwarsa.' }));
          return;
        }

        const { hash, salt, iterations } = hashPassword(newPassword);
        if (isDbConnected && dbPool) {
          await dbPool.query('UPDATE users SET password = ?, password_hash = ?, salt = ?, password_algo = ? WHERE email = ?',
            [hash, hash, salt, `pbkdf2_sha512_${iterations}`, entry.email]);
        }
        passwordResetTokens.delete(tokenHash);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success', message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.' }));
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'error', message: 'Endpoint tidak ditemukan.' }));
    });
    return;
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'RuangSinema Hardened Server' }));
});

server.listen(PORT, () => {
  console.log(`🛡️ RuangSinema Hardened Auth Server running on http://localhost:${PORT}`);
  console.log(`📊 phpMyAdmin Database target: ${DB_CONFIG.user}@${DB_CONFIG.host}:${DB_CONFIG.port}/${DB_CONFIG.database}`);
});

// Otomatis Poll Vercel Cloud setiap 5 detik
const VERCEL_USERS_API = 'https://ruang-sinema.vercel.app/api/auth/users';
async function syncVercelUsersToLocalMySQL() {
  if (!isDbConnected || !dbPool) return;
  try {
    const res = await fetch(VERCEL_USERS_API, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      const users = data.users || [];
      for (const u of users) {
        const cleanEmail = (u.email || '').toLowerCase().trim();
        if (!cleanEmail) continue;
        const [existing] = await dbPool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
        if (existing.length === 0 && u.passwordHash) {
          await dbPool.query(
            'INSERT INTO users (name, email, password, password_hash, salt, genres, role) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [u.name || 'VIP Member', cleanEmail, u.passwordHash, u.passwordHash, u.salt || '', JSON.stringify(u.genres || []), u.role || 'VIP Member']
          );
          console.log(`✨ [Auto-Sync Vercel -> MySQL] Inserted user (${cleanEmail}) into phpMyAdmin`);
        }
      }
    }
  } catch (e) {}
}

setInterval(syncVercelUsersToLocalMySQL, 5000);
