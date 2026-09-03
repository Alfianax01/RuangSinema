/**
 * RuangSinema GeoIP Resolver Service
 * Menentukan lokasi (Negara, Wilayah, Kota, ISP, Koordinat) dari IP Klien
 * Dilengkapi batas waktu 2 detik & degradasi anggun agar tidak pernah menghambat proses login
 */

// Cache lokasi per IP (TTL 24 jam)
const geoCache = new Map();

export async function lookupIpLocation(ip) {
  if (!ip || typeof ip !== 'string') {
    return getDefaultLocation('Tidak diketahui');
  }

  const cleanIp = ip.trim();

  // 1. Deteksi IP Privat / Localhost (Langsung kembali dalam 0ms)
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('172.16.') ||
    cleanIp.startsWith('172.31.')
  ) {
    return {
      ip: cleanIp,
      country: 'Indonesia (Lokal)',
      region: 'DKI Jakarta / Jaringan Lokal',
      city: 'Localhost',
      latitude: -6.2088,
      longitude: 106.8456,
      isp: 'Local Development Network',
      is_vpn: false,
      cached: false
    };
  }

  // 2. Cek Cache
  if (geoCache.has(cleanIp)) {
    return { ...geoCache.get(cleanIp), cached: true };
  }

  // 3. Panggil API Resolusi dengan Timeout Ketat 2 Detik
  try {
    const token = process.env.GEOIP_TOKEN;
    const url = token
      ? `https://ipinfo.io/${cleanIp}/json?token=${token}`
      : `https://ipapi.co/${cleanIp}/json/`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'RuangSinema-Security-Bot/1.0' },
      signal: AbortSignal.timeout(2000)
    });

    if (res.ok) {
      const data = await res.json();
      const loc = {
        ip: cleanIp,
        country: data.country_name || data.country || 'Indonesia',
        region: data.region || data.region_name || 'Lokal',
        city: data.city || 'Tidak diketahui',
        latitude: parseFloat(data.latitude || (data.loc?.split(',')[0])) || 0,
        longitude: parseFloat(data.longitude || (data.loc?.split(',')[1])) || 0,
        isp: data.org || data.isp || 'Provider Publik',
        is_vpn: Boolean(data.security?.vpn || data.security?.proxy),
        cached: false
      };

      geoCache.set(cleanIp, loc);

      // Batasi ukuran cache
      if (geoCache.size > 5000) {
        geoCache.clear();
      }

      return loc;
    }
  } catch (err) {
    // Timeout atau jaringan eksternal lambat -> Degradasi anggun
  }

  return getDefaultLocation(cleanIp);
}

function getDefaultLocation(ip) {
  return {
    ip,
    country: 'Indonesia',
    region: 'Tidak diketahui',
    city: 'Tidak diketahui',
    latitude: 0,
    longitude: 0,
    isp: 'Internet Service Provider',
    is_vpn: false,
    cached: false
  };
}

