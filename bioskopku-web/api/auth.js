import crypto from 'crypto';

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

export default async function handler(req, res) {
  try {
    // Set CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

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

    // 1. GET ALL USERS (/api/auth/users or /api/auth?action=users)
    if (req.method === 'GET') {
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
        genres: [],
        role: 'VIP Member',
        created_at: new Date().toISOString()
      };

      memoryUsers.unshift(newUser);

      res.statusCode = 201;
      res.end(JSON.stringify({
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
      let user = memoryUsers.find(u => u.email === cleanEmail);

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
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Email atau kata sandi salah.' }));
        return;
      }

      const isValid = verifyPassword(password, user.salt, user.passwordHash);
      if (!isValid) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Email atau kata sandi salah.' }));
        return;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Login berhasil!',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          genres: user.genres || [],
          role: user.role || 'VIP Member'
        }
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

      const cleanEmail = email.toLowerCase().trim();
      const user = memoryUsers.find(u => u.email === cleanEmail);

      if (!user) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, message: 'Email tidak terdaftar.' }));
        return;
      }

      const salt = crypto.randomBytes(16).toString('hex');
      user.salt = salt;
      user.passwordHash = hashPassword(newPassword, salt);

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.'
      }));
      return;
    }

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true, service: 'RuangSinema Cloud Auth API Online' }));
  } catch (fatalError) {
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: fatalError.message, stack: fatalError.stack }));
  }
}
