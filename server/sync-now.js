const mysql = require('mysql2/promise');
const crypto = require('crypto');

const DB_CONFIG = {
  host: '127.0.0.1',
  port: 3306,
  user: 'root',
  password: '',
  database: 'bioskopku_db',
};

async function runSync() {
  console.log('🔄 Menghubungkan ke MySQL phpMyAdmin...');
  const pool = mysql.createPool(DB_CONFIG);

  try {
    const res = await fetch('https://ruang-sinema.vercel.app/api/auth/users');
    const data = await res.json();
    const users = data.users || [];
    console.log(`📥 Mengambil ${users.length} user dari Vercel Cloud...`);

    for (const u of users) {
      const email = u.email.toLowerCase().trim();
      const salt = u.salt || crypto.randomBytes(16).toString('hex');
      const password = u.passwordHash || 'password_hash';
      const genres = JSON.stringify(u.genres || []);

      await pool.query(
        `INSERT INTO users (name, email, password, salt, genres, role)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name = VALUES(name), genres = VALUES(genres)`,
        [u.name || 'VIP Member', email, password, salt, genres, u.role || 'VIP Member']
      );
      console.log(`✅ Akun tersimpan di phpMyAdmin: ${email}`);
    }
    console.log('🎉 SINKRONISASI PHPMYADMIN SELESAI!');
  } catch (err) {
    console.error('❌ Error sinkronisasi:', err.message);
  } finally {
    await pool.end();
  }
}

runSync();
