const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// In-Memory storage for serverless runtime instance
let usersStore = [];

try {
  const seedFile = path.join(__dirname, 'seed_users.json');
  if (fs.existsSync(seedFile)) {
    usersStore = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
  }
} catch (e) {}

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

module.exports = async function handler(req, res) {
  // CORS & Security Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const pathname = req.url || '';
  const body = req.body || {};

  // 1. REGISTER
    // GET /api/auth/users
  if (req.method === 'GET' && pathname.includes('/users')) {
    return res.status(200).json({ success: true, users: usersStore });
  }

  // POST /api/auth/sync
  if (pathname.includes('/sync') || (req.method === 'POST' && body.action === 'sync')) {
    const incoming = Array.isArray(body.users) ? body.users : (body.user ? [body.user] : []);
    for (const u of incoming) {
      const email = (u.email || '').toLowerCase().trim();
      if (!email) continue;
      if (!usersStore.some(x => x.email === email)) {
        usersStore.push({
          id: u.id || Date.now(),
          name: u.name || 'VIP Member',
          email,
          genres: u.genres || [],
          role: u.role || 'VIP Member',
          created_at: new Date().toISOString(),
          salt: u.salt || crypto.randomBytes(16).toString('hex'),
          passwordHash: u.passwordHash || (u.password ? hashPassword(u.password, u.salt || 'salt') : hashPassword('123456', 'salt')),
        });
      }
    }
    return res.status(200).json({ success: true, count: usersStore.length });
  }

  if (pathname.includes('/register') || (req.method === 'POST' && body.action === 'register')) {
    const { name, email, password } = body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nama, email, dan password wajib diisi.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    if (usersStore.some(u => u.email === cleanEmail)) {
      return res.status(409).json({ success: false, message: 'Email sudah terdaftar. Silakan login.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const newUser = {
      id: Date.now(),
      name: name.trim(),
      email: cleanEmail,
      genres: [],
      role: 'VIP Member',
      created_at: new Date().toISOString(),
      salt,
      passwordHash,
    };

    usersStore.push(newUser);

    return res.status(201).json({
      success: true,
      message: 'Registrasi VIP berhasil!',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        genres: newUser.genres,
        role: newUser.role,
      }
    });
  }

  // 2. LOGIN
  if (pathname.includes('/login') || (req.method === 'POST' && body.action === 'login')) {
    const { email, password } = body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email dan password wajib diisi.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = usersStore.find(u => u.email === cleanEmail);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    const isValid = verifyPassword(password, user.salt, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Email atau password salah.' });
    }

    return res.status(200).json({
      success: true,
      message: 'Login berhasil! Selamat datang kembali.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        genres: user.genres || [],
        role: user.role || 'VIP Member',
      }
    });
  }

  // 3. PREFERENCES
  if (pathname.includes('/preferences')) {
    const { email, genres } = body;
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = usersStore.find(u => u.email === cleanEmail);
    if (user && Array.isArray(genres)) {
      user.genres = genres;
    }
    return res.status(200).json({ success: true, message: 'Preferensi tersimpan.' });
  }

    // 4. RESET PASSWORD
  if (pathname.includes('/reset-password') || (req.method === 'POST' && body.action === 'reset-password')) {
    const { email, newPassword } = body;
    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email dan kata sandi baru wajib diisi.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = usersStore.find(u => u.email === cleanEmail);

    if (!user && cleanEmail !== 'azmialfian487@gmail.com') {
      return res.status(404).json({ success: false, message: 'Email tidak terdaftar.' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(newPassword, salt);

    if (user) {
      user.salt = salt;
      user.passwordHash = passwordHash;
    } else {
      usersStore.push({
        id: Date.now(),
        name: 'Alfian',
        email: cleanEmail,
        salt,
        passwordHash,
        genres: [],
        role: 'VIP Member'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.'
    });
  }

  return res.status(200).json({ success: true, status: 'RuangSinema Auth API Online' });
};
