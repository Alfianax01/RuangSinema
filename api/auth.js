import crypto from 'crypto';

const PBKDF2_ITERATIONS = 210000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';
const DUMMY_SALT = 'ruangsinema-dummy-salt';

const ALLOWED_ORIGINS = (process.env.AUTH_ALLOWED_ORIGINS || 'https://ruang-sinema.vercel.app,http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

let memoryUsers = [
  {
    id: 1788153223537,
    name: 'alfian',
    email: 'azmialfian487@gmail.com',
    salt: '21787e2d1ef9fa432aa4d799e1dbca28',
    passwordHash: 'ee8b864417be0be17ae8cd4364cf303467d5c21c4f44d912cf3ce5d2989b58e5ed10caad746801edabb65ce0bc6f08daca0e21e074416aa667bbef31264137bd',
    iterations: 10000,
    genres: ['Series'],
    role: 'Super Admin',
    created_at: '2026-08-31T05:13:43.537Z'
  }
];

function hashPassword(password, salt, iterations = PBKDF2_ITERATIONS) {
  return crypto.pbkdf2Sync(password, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST).toString('hex');
}

function verifyPassword(password, salt, storedHash, iterations) {
  if (!salt || !storedHash) return false;
  const calculatedHash = hashPassword(password, salt, iterations || 10000);
  try {
    return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (e) {
    return false;
  }
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    genres: user.genres || [],
    role: user.role || 'VIP Member',
    created_at: user.created_at
  };
}

function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= 10
    && /[A-Za-z]/.test(password)
    && /[0-9]/.test(password);
}

function isAdminRequest(req) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey) return false;
  const provided = req.headers['x-admin-key'];
  if (typeof provided !== 'string' || provided.length !== configuredKey.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(configuredKey));
}

export default async function handler(req, res) {
  try {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    const reqUrl = req.url || '';
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    // 1. GET ALL USERS (/api/auth/users or /api/auth?action=users) — admin only
    if (req.method === 'GET') {
      if (!isAdminRequest(req)) {
        res.statusCode = 403;
        res.end(JSON.stringify({ success: false, message: 'Akses ditolak.' }));
        return;
      }
      const safeUsers = memoryUsers.map(toPublicUser);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, users: safeUsers, count: safeUsers.length }));
      return;
    }

    // 2. REGISTER
    if (reqUrl.includes('register') || body.action === 'register' || (!reqUrl.includes('login') && !reqUrl.includes('reset') && body.name)) {
      const { name, email, password } = body;
      if (!name || !email || !password) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Nama, email, dan kata sandi wajib diisi.' }));
        return;
      }

      if (!isStrongPassword(password)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Kata sandi minimal 10 karakter dan harus memuat huruf serta angka.' }));
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      if (memoryUsers.some(u => u.email === cleanEmail)) {
        res.statusCode = 409;
        res.end(JSON.stringify({ success: false, message: 'Email sudah terdaftar. Silakan masuk.' }));
        return;
      }

      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);

      const newUser = {
        id: Date.now(),
        name: String(name).trim(),
        email: cleanEmail,
        salt,
        passwordHash,
        iterations: PBKDF2_ITERATIONS,
        genres: [],
        role: 'VIP Member',
        created_at: new Date().toISOString()
      };

      memoryUsers.unshift(newUser);

      res.statusCode = 201;
      res.end(JSON.stringify({
        success: true,
        message: 'Registrasi VIP berhasil!',
        user: toPublicUser(newUser)
      }));
      return;
    }

    // 3. LOGIN
    if (reqUrl.includes('login') || body.action === 'login') {
      const { email, password } = body;
      if (!email || !password) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Email dan kata sandi wajib diisi.' }));
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = memoryUsers.find(u => u.email === cleanEmail);

      let isValid = false;
      if (user) {
        isValid = verifyPassword(password, user.salt, user.passwordHash, user.iterations);
      } else {
        // Hash against a dummy salt so response timing does not leak account existence.
        hashPassword(password, DUMMY_SALT, 10000);
      }

      if (!isValid) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Email atau kata sandi salah.' }));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Login berhasil!',
        user: toPublicUser(user)
      }));
      return;
    }

    // 4. RESET PASSWORD
    if (reqUrl.includes('reset') || body.action === 'reset-password') {
      const { email, newPassword } = body;
      if (!email || !newPassword) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Email dan kata sandi baru wajib diisi.' }));
        return;
      }

      if (!isStrongPassword(newPassword)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Kata sandi minimal 10 karakter dan harus memuat huruf serta angka.' }));
        return;
      }

      const cleanEmail = email.toLowerCase().trim();
      const user = memoryUsers.find(u => u.email === cleanEmail);

      if (user) {
        const salt = crypto.randomBytes(16).toString('hex');
        user.salt = salt;
        user.passwordHash = hashPassword(newPassword, salt);
        user.iterations = PBKDF2_ITERATIONS;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Jika email terdaftar, kata sandi telah diperbarui. Silakan masuk dengan kata sandi baru Anda.'
      }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, service: 'RuangSinema Cloud Auth API Online' }));
  } catch (fatalError) {
    console.error('Auth handler error:', fatalError);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, message: 'Terjadi gangguan pada server.' }));
  }
}
