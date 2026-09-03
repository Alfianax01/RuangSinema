const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bioskopku_db',
};

const VERCEL_USERS_API = process.env.VERCEL_USERS_API || 'https://ruang-sinema.vercel.app/api/auth/users';

async function runSync() {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    console.error('❌ ADMIN_API_KEY belum diset. Endpoint /api/auth/users butuh header X-Admin-Key.');
    process.exitCode = 1;
    return;
  }

  console.log('🔄 Menghubungkan ke MySQL phpMyAdmin...');
  const pool = mysql.createPool(DB_CONFIG);

  try {
    const res = await fetch(VERCEL_USERS_API, { headers: { 'X-Admin-Key': adminKey } });
    if (!res.ok) {
      console.error(`❌ Gagal mengambil data user dari cloud (HTTP ${res.status}).`);
      process.exitCode = 1;
      return;
    }

    const data = await res.json();
    const users = data.users || [];
    console.log(`📥 Mengambil ${users.length} user dari Vercel Cloud...`);

    let updated = 0;
    let skipped = 0;

    for (const u of users) {
      const email = (u.email || '').toLowerCase().trim();
      if (!email) continue;

      // The cloud API only exposes public profile fields, so this script never touches
      // credentials. Accounts that do not exist locally must be created through registration
      // or pushed to /api/auth/sync with their hashed credentials.
      const [result] = await pool.query(
        'UPDATE users SET name = ?, genres = ?, role = ? WHERE email = ?',
        [u.name || 'VIP Member', JSON.stringify(u.genres || []), u.role || 'VIP Member', email]
      );

      if (result.affectedRows > 0) {
        updated++;
        console.log(`✅ Profil diperbarui di phpMyAdmin: ${email}`);
      } else {
        skipped++;
        console.log(`⏭️  Dilewati (belum ada di MySQL lokal): ${email}`);
      }
    }

    console.log(`🎉 SINKRONISASI SELESAI! ${updated} profil diperbarui, ${skipped} dilewati.`);
  } catch (err) {
    console.error('❌ Error sinkronisasi:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

runSync();
