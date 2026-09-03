/**
 * RuangSinema Rate Limiting, Brute-Force Shield, & Lockout Manager
 * Melacak percobaan login gagal per Email & per IP dalam window 15 menit.
 */

// Memory Cache untuk Rate Limiting Serverless / Node Process
const attemptStore = new Map(); // key: email atau ip -> { count, firstAttempt, lockedUntil, lockoutLevel }
const ipBlockStore = new Set(); // set of blocked IPs

export const LOCKOUT_THRESHOLD = 5;
export const WINDOW_MS = 15 * 60 * 1000; // 15 Menit
export const LOCKOUT_LEVELS = [
  15 * 60 * 1000,     // Level 1: 15 Menit
  60 * 60 * 1000,     // Level 2: 1 Jam
  24 * 60 * 60 * 1000 // Level 3: 24 Jam
];

/**
 * Ekstraksi IP Klien Asli yang Aman
 * Mengambil elemen pertama dari x-forwarded-for (di balik proxy Vercel / Cloudflare)
 */
export function getClientIp(req) {
  if (!req) return '127.0.0.1';

  const xForwardedFor = req.headers?.['x-forwarded-for'] || req.headers?.['x-real-ip'];
  if (xForwardedFor && typeof xForwardedFor === 'string') {
    const ips = xForwardedFor.split(',');
    const firstIp = ips[0].trim();
    if (isValidIp(firstIp)) {
      return firstIp;
    }
  }

  const socketIp = req.socket?.remoteAddress || req.connection?.remoteAddress;
  if (socketIp) {
    // Bersihkan IPv6 mapped IPv4 (misal: ::ffff:127.0.0.1)
    if (socketIp.startsWith('::ffff:')) {
      return socketIp.substring(7);
    }
    return socketIp;
  }

  return '127.0.0.1';
}

function isValidIp(ip) {
  if (!ip || typeof ip !== 'string') return false;
  // Validasi IPv4
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(ip)) {
    return ip.split('.').every(num => parseInt(num, 10) >= 0 && parseInt(num, 10) <= 255);
  }
  // Validasi IPv6
  const ipv6Pattern = /^[0-9a-fA-F:]+$/;
  return ipv6Pattern.test(ip);
}

/**
 * Parser User-Agent sederhana untuk mengekstrak Browser, OS, dan Device
 */
export function parseUserAgent(uaString) {
  if (!uaString || typeof uaString !== 'string') {
    return { browser: 'Unknown', os: 'Unknown', device: 'Desktop' };
  }

  let browser = 'Browser Lain';
  if (uaString.includes('Edg/')) browser = 'Microsoft Edge';
  else if (uaString.includes('Chrome/')) browser = 'Google Chrome';
  else if (uaString.includes('Safari/') && !uaString.includes('Chrome/')) browser = 'Apple Safari';
  else if (uaString.includes('Firefox/')) browser = 'Mozilla Firefox';

  let os = 'OS Lain';
  if (uaString.includes('Windows NT 10.0')) os = 'Windows 10/11';
  else if (uaString.includes('Windows')) os = 'Windows';
  else if (uaString.includes('Android')) os = 'Android';
  else if (uaString.includes('iPhone') || uaString.includes('iPad')) os = 'iOS';
  else if (uaString.includes('Mac OS X')) os = 'macOS';
  else if (uaString.includes('Linux')) os = 'Linux';

  let device = 'Desktop';
  if (uaString.includes('Mobile') || uaString.includes('Android') || uaString.includes('iPhone')) {
    device = 'Mobile';
  } else if (uaString.includes('iPad') || uaString.includes('Tablet')) {
    device = 'Tablet';
  }

  return { browser, os, device };
}

/**
 * Periksa apakah Klien atau Email sedang dikunci
 */
export function checkLockout(email, ip) {
  const now = Date.now();

  // 1. Cek Blokir IP Manual
  if (ipBlockStore.has(ip)) {
    return {
      locked: true,
      reason: 'IP_BLOCKED',
      message: 'Akses dari alamat IP ini telah diblokir secara permanen oleh sistem keamanan.'
    };
  }

  // 2. Cek Lockout Berdasarkan Email
  const emailKey = `email:${email.toLowerCase().trim()}`;
  const emailEntry = attemptStore.get(emailKey);
  if (emailEntry && emailEntry.lockedUntil && emailEntry.lockedUntil > now) {
    const remainingMinutes = Math.ceil((emailEntry.lockedUntil - now) / 60000);
    return {
      locked: true,
      remainingMinutes,
      lockoutLevel: emailEntry.lockoutLevel || 1,
      message: `Akun sementara dikunci demi keamanan karena ${LOCKOUT_THRESHOLD} kali percobaan gagal. Silakan coba lagi dalam ${remainingMinutes} menit.`
    };
  }

  // 3. Cek Lockout Berdasarkan IP
  const ipKey = `ip:${ip}`;
  const ipEntry = attemptStore.get(ipKey);
  if (ipEntry && ipEntry.lockedUntil && ipEntry.lockedUntil > now) {
    const remainingMinutes = Math.ceil((ipEntry.lockedUntil - now) / 60000);
    return {
      locked: true,
      remainingMinutes,
      lockoutLevel: ipEntry.lockoutLevel || 1,
      message: `Terlalu banyak percobaan gagal dari IP ini. Silakan coba lagi dalam ${remainingMinutes} menit.`
    };
  }

  // Hitung delay buatan (progressive delay untuk percobaan 3 dan 4)
  const currentAttempts = Math.max(emailEntry?.count || 0, ipEntry?.count || 0);
  let delayMs = 0;
  if (currentAttempts === 3) delayMs = 1000;
  if (currentAttempts === 4) delayMs = 2000;

  return { locked: false, delayMs, currentAttempts };
}

/**
 * Catat Percobaan Login Gagal
 * Mengembalikan status apakah memicu kunci akun (lockout triggered)
 */
export async function recordFailedAttempt(email, ip) {
  const now = Date.now();
  const cleanEmail = email.toLowerCase().trim();
  const emailKey = `email:${cleanEmail}`;
  const ipKey = `ip:${ip}`;

  function updateKey(key) {
    let entry = attemptStore.get(key);
    if (!entry || (now - entry.firstAttempt > WINDOW_MS && !entry.lockedUntil)) {
      entry = { count: 1, firstAttempt: now, lockedUntil: null, lockoutLevel: 0 };
    } else {
      entry.count += 1;
    }

    // Jika mencapai threshold 5x
    if (entry.count >= LOCKOUT_THRESHOLD) {
      const level = Math.min(entry.lockoutLevel + 1, LOCKOUT_LEVELS.length);
      const lockDuration = LOCKOUT_LEVELS[level - 1];
      entry.lockedUntil = now + lockDuration;
      entry.lockoutLevel = level;
    }

    attemptStore.set(key, entry);
    return entry;
  }

  const emailRes = updateKey(emailKey);
  const ipRes = updateKey(ipKey);

  const isLocked = emailRes.count >= LOCKOUT_THRESHOLD || ipRes.count >= LOCKOUT_THRESHOLD;
  const lockDurationMs = emailRes.lockedUntil ? (emailRes.lockedUntil - now) : 0;
  const remainingMinutes = Math.max(1, Math.ceil(lockDurationMs / 60000));

  return {
    isLocked,
    remainingMinutes,
    count: Math.max(emailRes.count, ipRes.count)
  };
}

/**
 * Reset Percobaan Gagal saat Login Berhasil
 */
export function resetFailedAttempts(email, ip) {
  if (email) {
    attemptStore.delete(`email:${email.toLowerCase().trim()}`);
  }
  if (ip) {
    attemptStore.delete(`ip:${ip}`);
  }
}

/**
 * Blokir IP Manual
 */
export function blockIp(ip) {
  if (ip) ipBlockStore.add(ip);
}

/**
 * Buka Kunci Akun Manual
 */
export function unlockAccount(email, ip) {
  if (email) attemptStore.delete(`email:${email.toLowerCase().trim()}`);
  if (ip) {
    attemptStore.delete(`ip:${ip}`);
    ipBlockStore.delete(ip);
  }
}
