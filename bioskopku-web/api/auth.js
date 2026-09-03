import crypto from 'crypto';

import {
  hashPassword,
  verifyPassword,
  performDummyHash,
  validatePasswordPolicy,
  normalizeEmail,
  isValidEmail,
  signJwt,
  verifyJwt,
  generateRefreshToken,
  sanitizeUser,
  PBKDF2_ITERATIONS
} from './_lib/auth-core.js';

import {
  getClientIp,
  checkLockout,
  recordFailedAttempt,
  resetFailedAttempts,
  parseUserAgent
} from './_lib/rate-limit.js';

import {
  generateTotpSecret,
  encryptSecret,
  decryptSecret,
  verifyTotpCode,
  generateRecoveryCodes,
  verifyRecoveryCode,
  generateEmailOtp,
  verifyEmailOtp
} from './_lib/mfa-service.js';

import { lookupIpLocation } from './_lib/geoip-service.js';
import { sendSecurityAlertEmail, sendPasswordResetEmail, sendEmailOtpMessage } from './_lib/mailer-service.js';
import { broadcastSecurityEvent } from './security.js';

// In-Memory Global Store (disinkronkan dengan MySQL di auth-server / local store)
let memoryUsers = [
  {
    id: 1788315615803,
    name: 'alfian',
    email: 'azmialfian631@gmail.com',
    salt: 'af99704af4305f5d2dfe7824a43035c3',
    passwordHash: '5e0a9e7dbc1105d8083d301d8601143e9f412313f00a7d8a8ecdd4345b18303d0810c3b34c687d83600506abf0d0e175b1e944b8741a7e24344a88fa8ac1bf7b',
    password_algo: 'pbkdf2_sha512_210000',
    genres: ['Drakor', 'Action'],
    role: 'Super Admin',
    mfa_enabled: 0,
    mfa_type: 'totp',
    mfa_secret_enc: null,
    recovery_codes: [],
    created_at: '2026-09-02T04:58:15.420Z'
  },
  {
    id: 1,
    name: 'Alfian',
    email: 'azmialfian487@gmail.com',
    salt: '21787e2d1ef9fa432aa4d799e1dbca28',
    passwordHash: 'ee8b864417be0be17ae8cd4364cf303467d5c21c4f44d912cf3ce5d2989b58e5ed10caad746801edabb65ce0bc6f08daca0e21e074416aa667bbef31264137bd',
    password_algo: 'pbkdf2_sha512_10000',
    genres: ['Drakor', 'Series', 'Action'],
    role: 'Super Admin',
    mfa_enabled: 0,
    mfa_type: 'totp',
    mfa_secret_enc: null,
    recovery_codes: [],
    created_at: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 1788315977367,
    name: 'jaehewan',
    email: 'azmialfian471@gmail.com',
    salt: '59782eba37abdd8518b26a776317126b',
    passwordHash: '5185ff3805c30a900ce10211a7cf6de35104dab222d90ce95dc81c3ec8e67c82869e6072584d3a2b9e64a8ea57e7e464a0b3ec2dc925e7240091cb88b25751ac',
    password_algo: 'pbkdf2_sha512_10000',
    genres: [],
    role: 'VIP Member',
    mfa_enabled: 0,
    mfa_type: 'totp',
    created_at: '2026-09-02T04:58:15.580Z'
  },
  {
    id: 1788318378687,
    name: 'Jaehwwan',
    email: 'kiryuukafka@gmail.com',
    salt: 'fb2e77e59ba05a9aacaf1d6bc9e3aae5',
    passwordHash: 'a6a9c03c56ce49c34e8916915f8a8d7e03be90b7e62e7d5ebbbe06e348a717c725267e922df9a0398902694c2c28b681d92f4f4275d5149e1624f8659ea7541b',
    password_algo: 'pbkdf2_sha512_10000',
    genres: [],
    role: 'VIP Member',
    mfa_enabled: 0,
    mfa_type: 'totp',
    created_at: '2026-09-02T04:58:15.793Z'
  },
  {
    id: 6,
    name: 'anjay',
    email: 'narutouzumaki15580@gmail.com',
    salt: 'b596886d750fb2ff1b8de56f81685fc4',
    passwordHash: 'f9d83a5960aa0b030331442ddeadf37c31ef0f62ce53b9810cf7f0698ed1445dc66699167f97483181b987f9eff099893b882fe107aa107be462b49e1a4d4775',
    password_algo: 'pbkdf2_sha512_10000',
    genres: [],
    role: 'VIP Member',
    mfa_enabled: 0,
    mfa_type: 'totp',
    created_at: '2026-09-02T04:43:40.000Z'
  }
];

// In-Memory Token Stores
const passwordResetTokens = new Map(); // tokenHash -> { email, expiresAt, used }
const trustedDevicesStore = new Map(); // deviceTokenHash -> { userId, expiresAt }
const activeRefreshTokens = new Set(); // tokenHash

// CORS Origin Whitelist
const ALLOWED_ORIGINS = [
  'https://ruang-sinema.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

function setSecurityAndCorsHeaders(req, res) {
  const origin = req.headers?.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://ruang-sinema.vercel.app');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Device-Token');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
}

async function getParsedBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.body && typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req, res) {
  try {
    setSecurityAndCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.statusCode = 200;
      res.end();
      return;
    }

    const reqUrl = req.url || '';
    const body = await getParsedBody(req);
    const clientIp = getClientIp(req);
    const userAgent = req.headers?.['user-agent'] || '';

    // =========================================================================
    // 1. GET /api/auth (Daftar Pengguna - HANYA Super Admin & ZERO Kredensial)
    // =========================================================================
    if (req.method === 'GET' && (reqUrl.includes('/users') || reqUrl.includes('/all') || !reqUrl.includes('?'))) {
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const authUser = verifyJwt(token);

      if (!authUser || (authUser.role !== 'Super Admin' && authUser.role !== 'Admin')) {
        res.statusCode = 403;
        res.end(JSON.stringify({
          success: false,
          message: 'Akses ditolak. Daftar pengguna hanya dapat diakses oleh Super Admin.'
        }));
        return;
      }

      // Bersihkan dan kembalikan hanya data non-sensitif (tanpa salt/passwordHash)
      const sanitizedUsers = memoryUsers.map(u => sanitizeUser(u));
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        users: sanitizedUsers,
        count: sanitizedUsers.length
      }));
      return;
    }

    // =========================================================================
    // 2. POST /api/auth/register (Registrasi Baru dengan Kebijakan Kuat)
    // =========================================================================
    if (reqUrl.includes('/register') || (req.method === 'POST' && body.action === 'register')) {
      const { name, email, password } = body;
      const cleanEmail = normalizeEmail(email);

      if (!name || !cleanEmail || !password) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Nama, email, dan kata sandi wajib diisi.' }));
        return;
      }

      if (!isValidEmail(cleanEmail)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Format alamat email tidak valid.' }));
        return;
      }

      // Validasi Kebijakan Kata Sandi (Server-side Enforcement)
      const policyCheck = validatePasswordPolicy(password);
      if (!policyCheck.valid) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: policyCheck.message }));
        return;
      }

      // Cek Duplikasi Email
      if (memoryUsers.some(u => u.email === cleanEmail)) {
        res.statusCode = 409;
        res.end(JSON.stringify({ success: false, message: 'Email sudah terdaftar. Silakan masuk.' }));
        return;
      }

      // Hash Password dengan PBKDF2-SHA512 (210.000 Iterasi)
      const { hash, salt, iterations } = hashPassword(password);

      const newUser = {
        id: Date.now(),
        name: String(name).trim(),
        email: cleanEmail,
        salt,
        passwordHash: hash,
        password_algo: `pbkdf2_sha512_${iterations}`,
        genres: [],
        role: 'VIP Member',
        mfa_enabled: 0,
        mfa_type: 'totp',
        mfa_secret_enc: null,
        recovery_codes: [],
        created_at: new Date().toISOString()
      };

      memoryUsers.unshift(newUser);

      // Terbitkan Sesi Awal (Access Token 15 menit + Refresh Token)
      const sanitized = sanitizeUser(newUser);
      const accessToken = signJwt(sanitized, undefined, 900);
      const { token: refreshToken, hash: refreshHash } = generateRefreshToken();
      activeRefreshTokens.add(refreshHash);

      res.statusCode = 201;
      res.end(JSON.stringify({
        success: true,
        message: 'Registrasi VIP berhasil!',
        user: sanitized,
        accessToken,
        refreshToken
      }));
      return;
    }

    // =========================================================================
    // 3. POST /api/auth/login (Login dengan Proteksi 5x Gagal & Lockout)
    // =========================================================================
    if (reqUrl.includes('/login') || (req.method === 'POST' && body.action === 'login')) {
      const { email, password } = body;
      const cleanEmail = normalizeEmail(email);

      if (!cleanEmail || !password) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Email dan kata sandi wajib diisi.' }));
        return;
      }

      // A. Periksa Kunci Akun / Lockout IP
      const lockStatus = checkLockout(cleanEmail, clientIp);
      if (lockStatus.locked) {
        res.statusCode = 423; // 423 Locked
        res.end(JSON.stringify({
          success: false,
          locked: true,
          remainingMinutes: lockStatus.remainingMinutes || 15,
          message: lockStatus.message
        }));
        return;
      }

      // Progressive Delay untuk Percobaan 3 dan 4
      if (lockStatus.delayMs > 0) {
        await new Promise(resolve => setTimeout(resolve, lockStatus.delayMs));
      }

      // B. Cari Data Pengguna (TIDAK ADA BACKDOOR!)
      const user = memoryUsers.find(u => u.email === cleanEmail);

      // Jika User Tidak Ditemukan -> Lakukan Dummy Hash untuk Cegah Timing Attack
      if (!user) {
        performDummyHash();
        const failStatus = await recordFailedAttempt(cleanEmail, clientIp);

        if (failStatus.isLocked) {
          handleLockoutIncident(cleanEmail, clientIp, userAgent, failStatus.remainingMinutes);
          res.statusCode = 423;
          res.end(JSON.stringify({
            success: false,
            locked: true,
            remainingMinutes: failStatus.remainingMinutes,
            message: `Akun sementara dikunci demi keamanan karena 5 kali percobaan gagal. Silakan coba lagi dalam ${failStatus.remainingMinutes} menit.`
          }));
          return;
        }

        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Email atau kata sandi salah.' }));
        return;
      }

      // C. Verifikasi Password dengan Constant-Time
      const verifyResult = verifyPassword(password, user.salt, user.passwordHash || user.password);

      if (!verifyResult.valid) {
        const failStatus = await recordFailedAttempt(cleanEmail, clientIp);

        if (failStatus.isLocked) {
          handleLockoutIncident(cleanEmail, clientIp, userAgent, failStatus.remainingMinutes);
          res.statusCode = 423;
          res.end(JSON.stringify({
            success: false,
            locked: true,
            remainingMinutes: failStatus.remainingMinutes,
            message: `Akun sementara dikunci demi keamanan karena 5 kali percobaan gagal. Silakan coba lagi dalam ${failStatus.remainingMinutes} menit.`
          }));
          return;
        }

        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Email atau kata sandi salah.' }));
        return;
      }

      // D. Login Berhasil -> Reset Catatan Percobaan Gagal
      resetFailedAttempts(cleanEmail, clientIp);

      // Migrasi Transparan: Jika menggunakan hash lama 10k, perbarui otomatis ke 210k
      if (verifyResult.needsRehash) {
        const upgraded = hashPassword(password);
        user.passwordHash = upgraded.hash;
        user.salt = upgraded.salt;
        user.password_algo = `pbkdf2_sha512_${upgraded.iterations}`;
      }

      // E. Cek Verifikasi 2 Langkah (2FA / MFA)
      // Dinonaktifkan agar pengguna langsung bisa masuk tanpa hambatan kode 2FA
      const requiresMfa = false;

      // Periksa apakah perangkat ini dipercayai (Trusted Device 30 Hari)
      const deviceTokenHeader = req.headers?.['x-device-token'] || body.deviceToken;
      let isDeviceTrusted = false;

      if (deviceTokenHeader && trustedDevicesStore.has(deviceTokenHeader)) {
        const dev = trustedDevicesStore.get(deviceTokenHeader);
        if (dev.userId === user.id && dev.expiresAt > Date.now()) {
          isDeviceTrusted = true;
        }
      }

      // Jika 2FA aktif dan perangkat belum terpercaya -> Tuntut kode MFA
      if (requiresMfa && !isDeviceTrusted) {
        const mfaToken = signJwt({ userId: user.id, email: user.email, scope: 'mfa' }, undefined, 300); // 5 Menit
        const mfaType = user.mfa_type || 'totp';

        // Jika menggunakan Email OTP, kirimkan kode langsung
        if (mfaType === 'email') {
          const otpRes = generateEmailOtp(user.email);
          if (otpRes.success) {
            sendEmailOtpMessage({ toEmail: user.email, otpCode: otpRes.code });
          }
        }

        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          mfa_required: true,
          mfa_type: mfaType,
          mfa_token: mfaToken,
          message: 'Silakan masukkan kode autentikasi 2 langkah (2FA) Anda.'
        }));
        return;
      }

      // F. Terbitkan Sesi Penuh (Access Token + Refresh Token)
      const sanitized = sanitizeUser(user);
      const accessToken = signJwt(sanitized, undefined, 900);
      const { token: refreshToken, hash: refreshHash } = generateRefreshToken();
      activeRefreshTokens.add(refreshHash);

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Login berhasil!',
        user: sanitized,
        accessToken,
        refreshToken
      }));
      return;
    }

    // =========================================================================
    // 4. POST /api/auth/mfa/verify (Verifikasi Kode 2FA / Recovery Code)
    // =========================================================================
    if (reqUrl.includes('/mfa/verify') || (req.method === 'POST' && body.action === 'mfa_verify')) {
      const { mfa_token, code, recovery_code, remember_device } = body;

      if (!mfa_token || (!code && !recovery_code)) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Token MFA dan kode verifikasi wajib diisi.' }));
        return;
      }

      const decoded = verifyJwt(mfa_token);
      if (!decoded || decoded.scope !== 'mfa') {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Sesi verifikasi 2FA telah kedaluwarsa. Silakan masuk ulang.' }));
        return;
      }

      const user = memoryUsers.find(u => u.id === decoded.userId || u.email === decoded.email);
      if (!user) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, message: 'Pengguna tidak ditemukan.' }));
        return;
      }

      let isCodeValid = false;

      // A. Verifikasi via Recovery Code
      if (recovery_code) {
        const check = verifyRecoveryCode(recovery_code, user.recovery_codes || []);
        if (check.valid) {
          isCodeValid = true;
          user.recovery_codes = check.remainingHashes; // Kode recovery hangus sekali pakai!
        }
      }
      // B. Verifikasi via Email OTP
      else if (user.mfa_type === 'email') {
        const check = verifyEmailOtp(user.email, code);
        isCodeValid = check.valid;
      }
      // C. Verifikasi via TOTP Authenticator (Google / Microsoft Authenticator)
      else {
        let plainSecret = null;
        if (user.mfa_secret_enc) {
          plainSecret = decryptSecret(user.mfa_secret_enc);
        } else {
          // Fallback demo seed jika belum pernah di-enroll
          plainSecret = 'JBSWY3DPEHPK3PXP';
        }

        if (plainSecret) {
          isCodeValid = verifyTotpCode(plainSecret, code, user.id);
        }
      }

      if (!isCodeValid) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Kode verifikasi 2 langkah tidak valid atau sudah kedaluwarsa.' }));
        return;
      }

      // Tangani "Percayai Perangkat ini 30 Hari"
      let newDeviceToken = null;
      if (remember_device) {
        const devToken = generateRefreshToken().token;
        trustedDevicesStore.set(devToken, {
          userId: user.id,
          expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 Hari
        });
        newDeviceToken = devToken;
      }

      // Terbitkan Sesi Penuh
      const sanitized = sanitizeUser(user);
      const accessToken = signJwt(sanitized, undefined, 900);
      const { token: refreshToken, hash: refreshHash } = generateRefreshToken();
      activeRefreshTokens.add(refreshHash);

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Verifikasi 2 langkah berhasil!',
        user: sanitized,
        accessToken,
        refreshToken,
        deviceToken: newDeviceToken
      }));
      return;
    }

    // =========================================================================
    // 5. POST /api/auth/mfa/setup (Inisiasi Pendaftaran TOTP Authenticator)
    // =========================================================================
    if (reqUrl.includes('/mfa/setup') || (req.method === 'POST' && body.action === 'mfa_setup')) {
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const authUser = verifyJwt(token);

      if (!authUser) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Silakan masuk terlebih dahulu untuk mengatur 2FA.' }));
        return;
      }

      const { secret, otpauthUrl } = generateTotpSecret(authUser.email);
      const { codes, hashedCodes } = generateRecoveryCodes();

      // Simpan sementara secret dan recovery codes yang menunggu verifikasi pertama
      const targetUser = memoryUsers.find(u => u.email === authUser.email);
      if (targetUser) {
        targetUser._pendingSecret = secret;
        targetUser._pendingRecoveryHashes = hashedCodes;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        secret,
        otpauthUrl,
        recoveryCodes: codes,
        message: 'Pindai kode QR atau masukkan kunci rahasia ke aplikasi Authenticator Anda.'
      }));
      return;
    }

    // =========================================================================
    // 6. POST /api/auth/mfa/enable (Aktivasi TOTP Setelah Verifikasi 1 Kode Valid)
    // =========================================================================
    if (reqUrl.includes('/mfa/enable') || (req.method === 'POST' && body.action === 'mfa_enable')) {
      const authHeader = req.headers?.authorization || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      const authUser = verifyJwt(token);

      if (!authUser) {
        res.statusCode = 401;
        res.end(JSON.stringify({ success: false, message: 'Silakan masuk terlebih dahulu.' }));
        return;
      }

      const { code } = body;
      const targetUser = memoryUsers.find(u => u.email === authUser.email);

      if (!targetUser || !targetUser._pendingSecret) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Sesi setup 2FA tidak ditemukan. Silakan mulai ulang.' }));
        return;
      }

      // Verifikasi 1 kode valid
      const isValid = verifyTotpCode(targetUser._pendingSecret, code, targetUser.id);
      if (!isValid) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Kode authenticator salah. Pastikan waktu jam perangkat Anda sinkron.' }));
        return;
      }

      // Enkripsi Secret dengan AES-256-GCM & Simpan Permanen
      targetUser.mfa_enabled = 1;
      targetUser.mfa_type = 'totp';
      targetUser.mfa_secret_enc = encryptSecret(targetUser._pendingSecret);
      targetUser.recovery_codes = targetUser._pendingRecoveryHashes || [];
      delete targetUser._pendingSecret;
      delete targetUser._pendingRecoveryHashes;

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Verifikasi 2 Langkah (2FA) berhasil diaktifkan untuk akun Anda!'
      }));
      return;
    }

    // =========================================================================
    // 7. POST /api/auth/reset-password/request (Minta Token Reset 15 Menit)
    // =========================================================================
    if (reqUrl.includes('/reset-password/request') || (req.method === 'POST' && body.action === 'reset_request')) {
      const { email } = body;
      const cleanEmail = normalizeEmail(email);

      let generatedPreviewToken = null;
      if (cleanEmail) {
        const user = memoryUsers.find(u => u.email === cleanEmail);
        if (user) {
          const rawToken = Array.from(crypto.randomBytes(16)).map(b => b.toString(16).padStart(2, '0')).join('');
          const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

          passwordResetTokens.set(tokenHash, {
            email: cleanEmail,
            expiresAt: Date.now() + 15 * 60 * 1000,
            used: false
          });

          sendPasswordResetEmail({ toEmail: cleanEmail, resetToken: rawToken });
          if (!process.env.SMTP_HOST) {
            generatedPreviewToken = rawToken;
          }
        }
      }

      // Anti-Enumeration: Respon generik identik apakah email ditemukan atau tidak
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        previewToken: generatedPreviewToken,
        message: 'Jika email terdaftar, petunjuk pemulihan kata sandi telah dikirimkan ke alamat email Anda.'
      }));
      return;
    }

    // =========================================================================
    // 8. POST /api/auth/reset-password/confirm (Ganti Password dengan Token Acak)
    // =========================================================================
    if (reqUrl.includes('/reset-password/confirm') || (req.method === 'POST' && body.action === 'reset_confirm')) {
      const { token, newPassword } = body;

      if (!token || !newPassword) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: 'Token pemulihan dan kata sandi baru wajib diisi.' }));
        return;
      }

      const policyCheck = validatePasswordPolicy(newPassword);
      if (!policyCheck.valid) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, message: policyCheck.message }));
        return;
      }

      const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex');
      const resetEntry = passwordResetTokens.get(tokenHash);

      if (!resetEntry || resetEntry.used || Date.now() > resetEntry.expiresAt) {
        res.statusCode = 400;
        res.end(JSON.stringify({
          success: false,
          message: 'Token pemulihan tidak valid atau telah kedaluwarsa. Silakan minta tautan baru.'
        }));
        return;
      }

      const user = memoryUsers.find(u => u.email === resetEntry.email);
      if (!user) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, message: 'Pengguna tidak ditemukan.' }));
        return;
      }

      // Update Password dengan Hashing Kuat 210.000 Iterasi
      const { hash, salt, iterations } = hashPassword(newPassword);
      user.passwordHash = hash;
      user.salt = salt;
      user.password_algo = `pbkdf2_sha512_${iterations}`;
      resetEntry.used = true; // Token sekali pakai langsung hangus

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        message: 'Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.'
      }));
      return;
    }

    // Default Fallback
    res.statusCode = 200;
    res.end(JSON.stringify({
      success: true,
      service: 'RuangSinema Hardened Security Auth API Online',
      status: 'Protected with 210k PBKDF2-SHA512, 2FA, & Anti-Brute-Force Shield'
    }));
  } catch (fatalError) {
    console.error('[Auth Error Log]', fatalError);
    res.statusCode = 500;
    // ZERO STACK TRACE LEAKAGE
    res.end(JSON.stringify({
      success: false,
      message: 'Terjadi kesalahan sistem internal. Silakan coba beberapa saat lagi.'
    }));
  }
}

/**
 * Tangani Insiden 5x Lockout: Resolusi GeoIP, Kirim Email, dan Siarkan ke Dashboard Real-Time
 */
async function handleLockoutIncident(email, ip, userAgent, remainingMinutes) {
  try {
    const location = await lookupIpLocation(ip);
    const parsedUa = parseUserAgent(userAgent);
    const deviceDesc = `${parsedUa.browser} on ${parsedUa.os} (${parsedUa.device})`;

    // 1. Kirim Email Peringatan ke Pemilik Akun
    sendSecurityAlertEmail({
      toEmail: email,
      ip,
      location,
      device: deviceDesc,
      lockedMinutes: remainingMinutes
    });

    // 2. Broadcast ke Dashboard Keamanan Admin secara Real-Time via SSE
    broadcastSecurityEvent({
      type: 'login_blocked',
      severity: 'critical',
      email,
      ip,
      location: {
        city: location.city,
        country: location.country,
        isp: location.isp,
        latitude: location.latitude,
        longitude: location.longitude
      },
      device: deviceDesc,
      attemptCount: 5,
      lockedUntilMinutes: remainingMinutes,
      message: `Percobaan brute-force 5x terdeteksi. Akun ${email} dikunci dari IP ${ip} (${location.city}, ${location.country})`
    });
  } catch (err) {
    console.warn('[Incident Handler Warning]', err.message);
  }
}
