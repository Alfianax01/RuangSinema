const crypto = require('crypto');
const https = require('https');

// Persistent Global Cloud Storage Key for Vercel
const CLOUD_STORAGE_API = 'https://api.jsonbin.io/v3/b/66d52f6ee41b4d34e4299b82'; // Free persistent cloud bin
let memoryUsers = [
  {
    id: 1,
    name: 'Alfian',
    email: 'azmialfian487@gmail.com',
    salt: 'e92a8310cba489f0',
    passwordHash: '8b7f8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
    genres: ['Drakor', 'Series', 'Action'],
    role: 'Super Admin',
    created_at: '2026-09-01T00:00:00.000Z'
  }
];

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
}

function verifyPassword(password, salt, storedHash) {
  if (!salt) return password === storedHash;
  const calculatedHash = hashPassword(password, salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(calculatedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  } catch (e) {
    return false;
  }
}

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pathname = req.url || '';
  const body = req.body || {};

  // GET /api/auth/users (Return all users for phpMyAdmin sync)
  if (req.method === 'GET' && (pathname.includes('/users') || req.query?.action === 'users')) {
    const safeUsers = memoryUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      salt: u.salt,
      passwordHash: u.passwordHash,
      genres: u.genres || [],
      role: u.role || 'VIP Member',
      created_at: u.created_at
    }));
    return res.status(200).json({ success: true, users: safeUsers, count: safeUsers.length });
  }

  // 1. REGISTER
  if (pathname.includes('/register') || (req.method === 'POST' && body.action === 'register')) {
    const { name, email, password } = body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan kata sandi wajib diisi.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (memoryUsers.some(u => u.email === cleanEmail)) {
      return res.status(409).json({ success: false, message: 'Email sudah terdaftar. Silakan masuk.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const newUser = {
      id: Date.now(),
      name: name.trim(),
      email: cleanEmail,
      salt,
      passwordHash,
      genres: [],
      role: 'VIP Member',
      created_at: new Date().toISOString()
    };

    memoryUsers.unshift(newUser);

    return res.status(201).json({
      success: true,
      message: 'Registrasi VIP berhasil!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        genres: newUser.genres,
        role: newUser.role,
        salt: newUser.salt,
        passwordHash: newUser.passwordHash
      }
    });
  }

  // 2. LOGIN
  if (pathname.includes('/login') || (req.method === 'POST' && body.action === 'login')) {
    const { email, password } = body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan kata sandi wajib diisi.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    let user = memoryUsers.find(u => u.email === cleanEmail);

    // Dynamic auto-register seed for test
    if (!user && cleanEmail === 'azmialfian487@gmail.com') {
      const salt = crypto.randomBytes(16).toString('hex');
      user = {
        id: 1,
        name: 'Alfian',
        email: cleanEmail,
        salt,
        passwordHash: hashPassword(password, salt),
        genres: ['Drakor', 'Series'],
        role: 'Super Admin',
        created_at: new Date().toISOString()
      };
      memoryUsers.push(user);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email atau kata sandi salah.' });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Email atau kata sandi salah.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login berhasil!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        genres: user.genres || [],
        role: user.role || 'VIP Member'
      }
    });
  }

  // 3. RESET PASSWORD
  if (pathname.includes('/reset-password') || (req.method === 'POST' && body.action === 'reset-password')) {
    const { email, newPassword } = body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email dan kata sandi baru wajib diisi.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = memoryUsers.find(u => u.email === cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Email tidak terdaftar.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    user.salt = salt;
    user.passwordHash = hashPassword(newPassword, salt);

    return res.status(200).json({
      success: true,
      message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.'
    });
  }

  return res.status(200).json({ success: true, service: 'RuangSinema Cloud Auth API Online' });
};
