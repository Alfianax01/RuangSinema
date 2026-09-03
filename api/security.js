/**
 * RuangSinema Real-Time Security Stream & Admin Dashboard API
 * Endpoint: /api/security (SSE stream, event log, manual IP block, unlock account)
 */

import { verifyJwt } from './_lib/auth-core.js';
import { blockIp, unlockAccount, getClientIp } from './_lib/rate-limit.js';

// In-memory store untuk SSE clients dan log peristiwa keamanan
const sseClients = new Set();
export const inMemorySecurityEvents = [];

/**
 * Broadcast event keamanan ke seluruh dashboard admin yang terhubung secara real-time
 */
export function broadcastSecurityEvent(eventData) {
  const event = {
    id: Date.now().toString(),
    ...eventData,
    timestamp: new Date().toISOString()
  };

  inMemorySecurityEvents.unshift(event);
  if (inMemorySecurityEvents.length > 500) {
    inMemorySecurityEvents.pop();
  }

  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try {
      client.res.write(payload);
    } catch (e) {
      sseClients.delete(client);
    }
  }
}

// Origin yang diizinkan untuk CORS
const ALLOWED_ORIGINS = [
  'https://ruang-sinema.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
];

function setCorsHeaders(req, res) {
  const origin = req.headers?.origin;
  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', 'https://ruang-sinema.vercel.app');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = req.url || '';

  // 1. SSE Real-Time Stream: GET /api/security/stream
  if (url.includes('/stream') || req.headers?.accept?.includes('text/event-stream')) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const client = { res, id: Date.now() };
    sseClients.add(client);

    // Kirim pesan salam awal & event-event terkini
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Terhubung ke RuangSinema Security Stream Real-Time' })}\n\n`);
    const recent = inMemorySecurityEvents.slice(0, 20);
    for (const ev of recent) {
      res.write(`data: ${JSON.stringify(ev)}\n\n`);
    }

    // Heartbeat ping tiap 25 detik agar koneksi Vercel tidak timeout
    const intervalId = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch (e) {
        clearInterval(intervalId);
        sseClients.delete(client);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(intervalId);
      sseClients.delete(client);
    });
    return;
  }

  // Verifikasi Hak Akses Admin untuk tindakan keamanan
  const authHeader = req.headers?.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const user = verifyJwt(token);

  if (!user || (user.role !== 'Super Admin' && user.role !== 'Admin')) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Akses ditolak. Fitur ini hanya untuk Super Admin.' }));
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  // 2. Ambil Daftar Riwayat Event Keamanan: GET /api/security/events
  if (req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      events: inMemorySecurityEvents.slice(0, 100),
      connectedAdmins: sseClients.size
    }));
    return;
  }

  // 3. Blokir IP Manual: POST /api/security/ip-block
  if (url.includes('/ip-block') || body.action === 'block_ip') {
    const targetIp = body.ip;
    if (!targetIp) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, message: 'Alamat IP wajib disertakan.' }));
      return;
    }

    blockIp(targetIp);
    broadcastSecurityEvent({
      type: 'ip_blocked_manually',
      severity: 'critical',
      ip: targetIp,
      blockedBy: user.email,
      reason: body.reason || 'Diblokir oleh Super Admin dari dashboard'
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, message: `IP ${targetIp} berhasil diblokir.` }));
    return;
  }

  // 4. Buka Kunci Akun Manual: POST /api/security/unlock
  if (url.includes('/unlock') || body.action === 'unlock') {
    const { email, ip } = body;
    unlockAccount(email, ip);

    broadcastSecurityEvent({
      type: 'account_unlocked_manually',
      severity: 'info',
      email: email || 'Semua',
      ip: ip || 'Semua',
      unlockedBy: user.email
    });

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, message: `Kunci akun / IP berhasil dibuka kembali.` }));
    return;
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ success: false, message: 'Endpoint keamanan tidak ditemukan.' }));
}

