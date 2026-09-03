/**
 * RuangSinema Multi-Factor Authentication (2FA / MFA) Service
 * Standar: RFC 6238 (TOTP) + RFC 4226 (HOTP) + Recovery Codes + Email OTP
 * Enkripsi Secret: AES-256-GCM
 */

import crypto from 'crypto';

// Kunci Enkripsi Master 32-Byte untuk Secret TOTP
const TOTP_MASTER_KEY = crypto.createHash('sha256').update(process.env.TOTP_ENC_KEY || 'ruangsinema_totp_encryption_key_2026_aes256gcm_secret').digest();

// In-memory cache replay protection: key = user_id:step
const replayCache = new Set();

// In-memory email OTP store: key = email -> { otpHash, expiresAt, attempts, sendCount, lastSentAt }
const emailOtpStore = new Map();

// Base32 Alphabet (RFC 4648)
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input) {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Enkripsi Secret TOTP (AES-256-GCM)
 */
export function encryptSecret(plainSecret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', TOTP_MASTER_KEY, iv);
  let encrypted = cipher.update(plainSecret, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Dekripsi Secret TOTP (AES-256-GCM)
 */
export function decryptSecret(encryptedPayload) {
  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) return null;
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', TOTP_MASTER_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return null;
  }
}

/**
 * Buat Secret Baru untuk Pendaftaran TOTP
 */
export function generateTotpSecret(email) {
  const randomBytes = crypto.randomBytes(20);
  const secretBase32 = base32Encode(randomBytes);
  const cleanEmail = encodeURIComponent(email.toLowerCase().trim());
  const otpauthUrl = `otpauth://totp/RuangSinema:${cleanEmail}?secret=${secretBase32}&issuer=RuangSinema&algorithm=SHA1&digits=6&period=30`;
  return {
    secret: secretBase32,
    otpauthUrl
  };
}

/**
 * Kalkulasi Kode TOTP pada Time Step Tertentu (RFC 6238)
 */
export function generateTotpCode(secretBase32, timeStep) {
  const key = base32Decode(secretBase32);
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeBigInt64BE(BigInt(timeStep), 0);

  const hmac = crypto.createHmac('sha1', key).update(counterBuf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = binary % 1000000;
  return otp.toString().padStart(6, '0');
}

/**
 * Verifikasi Kode TOTP (Drift ±1 window = 30 detik sebelum & sesudah)
 * Mencegah Replay Attack
 */
export function verifyTotpCode(secretBase32, code, userId = 'user') {
  if (!secretBase32 || !code) return false;
  const cleanCode = String(code).trim().replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleanCode)) return false;

  const currentStep = Math.floor(Date.now() / 1000 / 30);
  const windows = [0, -1, 1]; // Current, Previous, Next

  for (const w of windows) {
    const step = currentStep + w;
    const expectedCode = generateTotpCode(secretBase32, step);

    if (crypto.timingSafeEqual(Buffer.from(cleanCode), Buffer.from(expectedCode))) {
      // Periksa Replay
      const replayKey = `${userId}:${step}`;
      if (replayCache.has(replayKey)) {
        return false; // Kode sudah pernah digunakan pada window ini!
      }
      replayCache.add(replayKey);

      // Bersihkan cache lama berkala
      if (replayCache.size > 10000) {
        replayCache.clear();
      }
      return true;
    }
  }

  return false;
}

/**
 * Generate 10 Kode Pemulihan (Recovery Codes) Sekali Pakai
 */
export function generateRecoveryCodes() {
  const codes = [];
  const hashedCodes = [];

  for (let i = 0; i < 10; i++) {
    const raw = `${crypto.randomBytes(2).toString('hex')}-${crypto.randomBytes(2).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(raw.toLowerCase().trim()).digest('hex');
    codes.push(raw);
    hashedCodes.push(hash);
  }

  return { codes, hashedCodes };
}

/**
 * Verifikasi Kode Pemulihan Sekali Pakai
 */
export function verifyRecoveryCode(inputCode, storedHashedCodes) {
  if (!inputCode || !Array.isArray(storedHashedCodes)) return { valid: false, remainingHashes: storedHashedCodes };
  const inputHash = crypto.createHash('sha256').update(inputCode.toLowerCase().trim()).digest('hex');

  const idx = storedHashedCodes.findIndex(h => h === inputHash);
  if (idx >= 0) {
    const remaining = [...storedHashedCodes];
    remaining.splice(idx, 1);
    return { valid: true, remainingHashes: remaining };
  }

  return { valid: false, remainingHashes: storedHashedCodes };
}

/**
 * Generate Email OTP (6 Digit, TTL 5 Menit)
 */
export function generateEmailOtp(email) {
  const cleanEmail = email.toLowerCase().trim();
  const now = Date.now();
  let entry = emailOtpStore.get(cleanEmail);

  if (entry && now - entry.firstSent < 15 * 60 * 1000 && entry.sendCount >= 3) {
    return { success: false, message: 'Batas pengiriman OTP tercapai. Silakan tunggu 15 menit.' };
  }

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

  emailOtpStore.set(cleanEmail, {
    otpHash,
    expiresAt: now + 5 * 60 * 1000,
    attempts: 0,
    firstSent: entry ? entry.firstSent : now,
    sendCount: entry ? entry.sendCount + 1 : 1
  });

  return {
    success: true,
    code: otpCode,
    expiresInSeconds: 300
  };
}

/**
 * Verifikasi Email OTP
 */
export function verifyEmailOtp(email, inputCode) {
  const cleanEmail = email.toLowerCase().trim();
  const entry = emailOtpStore.get(cleanEmail);
  if (!entry) return { valid: false, message: 'Kode OTP tidak ditemukan atau telah kedaluwarsa.' };

  if (Date.now() > entry.expiresAt) {
    emailOtpStore.delete(cleanEmail);
    return { valid: false, message: 'Kode OTP telah kedaluwarsa. Silakan minta kode baru.' };
  }

  if (entry.attempts >= 5) {
    emailOtpStore.delete(cleanEmail);
    return { valid: false, message: 'Terlalu banyak percobaan salah. Silakan minta kode baru.' };
  }

  entry.attempts += 1;
  const inputHash = crypto.createHash('sha256').update(String(inputCode).trim()).digest('hex');

  if (inputHash === entry.otpHash) {
    emailOtpStore.delete(cleanEmail);
    return { valid: true };
  }

  return { valid: false, message: 'Kode OTP salah. Sisa kesempatan: ' + (5 - entry.attempts) };
}
