/**
 * RuangSinema Security & Authentication Unit Test Suite
 * Menjalankan uji menyeluruh untuk membuktikan seluruh kriteria keamanan terpenuhi.
 */

import assert from 'assert';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  normalizeEmail,
  signJwt,
  verifyJwt,
  PBKDF2_ITERATIONS
} from '../api/_lib/auth-core.js';

import {
  getClientIp,
  checkLockout,
  recordFailedAttempt,
  resetFailedAttempts
} from '../api/_lib/rate-limit.js';

import {
  generateTotpSecret,
  generateTotpCode,
  verifyTotpCode,
  encryptSecret,
  decryptSecret,
  generateRecoveryCodes,
  verifyRecoveryCode
} from '../api/_lib/mfa-service.js';

console.log('\n🔒 [STARTING RUANGSINEMA SECURITY UNIT TESTS] 🔒\n');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [FAIL] ${name}`);
    console.error(`     Error: ${err.message}\n`);
    process.exit(1);
  }
}

async function runAllTests() {
  // =========================================================================
  // 1. Uji Password Hashing (PBKDF2-SHA512 210k Iterasi & Constant-Time)
  // =========================================================================
  test('PBKDF2-SHA512: Menggunakan minimal 210.000 iterasi dengan salt acak', () => {
    const rawPass = 'RahasiaKuat2026!';
    const { hash, salt, iterations } = hashPassword(rawPass);

    assert.strictEqual(iterations, 210000, 'Iterasi harus 210.000');
    assert.strictEqual(typeof salt, 'string');
    assert.strictEqual(salt.length, 32, 'Salt 16 byte harus 32 hex karakter');
    assert.strictEqual(typeof hash, 'string');
    assert.strictEqual(hash.length, 128, 'Hash SHA-512 64 byte harus 128 hex karakter');

    // Verifikasi password benar
    const checkValid = verifyPassword(rawPass, salt, hash);
    assert.strictEqual(checkValid.valid, true);
    assert.strictEqual(checkValid.needsRehash, false);

    // Verifikasi password salah
    const checkInvalid = verifyPassword('PasswordSalah123', salt, hash);
    assert.strictEqual(checkInvalid.valid, false);
  });

  // =========================================================================
  // 2. Uji Kebijakan Password (Minimal 10 Karakter, Huruf + Angka, Anti-Pasaran)
  // =========================================================================
  test('Kebijakan Password: Wajib tolak < 10 karakter, tanpa angka, dan kata sandi pasaran', () => {
    // Terlalu pendek
    assert.strictEqual(validatePasswordPolicy('Abc1!').valid, false);
    // Tanpa angka
    assert.strictEqual(validatePasswordPolicy('hanyaHurufSajaSemua').valid, false);
    // Tanpa huruf
    assert.strictEqual(validatePasswordPolicy('123456789012345').valid, false);
    // Password pasaran umum
    assert.strictEqual(validatePasswordPolicy('password123').valid, false);
    assert.strictEqual(validatePasswordPolicy('rahasia123').valid, false);
    // Password valid & kuat
    assert.strictEqual(validatePasswordPolicy('KombinasiKuat2026').valid, true);
  });

  // =========================================================================
  // 3. Uji Deteksi 5x Percobaan Gagal (Lockout 15 Menit)
  // =========================================================================
  test('Anti-Brute Force: 5x percobaan gagal mengunci akun selama 15 menit', async () => {
    const testEmail = 'attacker@badguy.com';
    const testIp = '103.21.244.2';
    resetFailedAttempts(testEmail, testIp);

    // Percobaan 1 s/d 4: Belum terkunci
    for (let i = 1; i <= 4; i++) {
      const res = await recordFailedAttempt(testEmail, testIp);
      assert.strictEqual(res.isLocked, false, `Percobaan ke-${i} tidak boleh langsung mengunci`);
      assert.strictEqual(checkLockout(testEmail, testIp).locked, false);
    }

    // Percobaan 5: Harus terkunci!
    const res5 = await recordFailedAttempt(testEmail, testIp);
    assert.strictEqual(res5.isLocked, true, 'Percobaan ke-5 wajib mengunci akun');
    assert.strictEqual(res5.remainingMinutes >= 14, true, 'Durasi kunci minimal 15 menit');

    // Cek status lockout
    const lockCheck = checkLockout(testEmail, testIp);
    assert.strictEqual(lockCheck.locked, true);
    assert.ok(lockCheck.message.includes('5 kali percobaan gagal'));

    // Reset setelah lockout
    resetFailedAttempts(testEmail, testIp);
    assert.strictEqual(checkLockout(testEmail, testIp).locked, false);
  });

  // =========================================================================
  // 4. Uji Verifikasi 2 Langkah (TOTP RFC 6238, Window Drift, Anti-Replay)
  // =========================================================================
  test('2FA TOTP: Menghasilkan kode 6 digit yang valid dan mencegah Replay Attack', () => {
    const { secret, otpauthUrl } = generateTotpSecret('user@ruangsinema.com');
    assert.strictEqual(typeof secret, 'string');
    assert.ok(otpauthUrl.startsWith('otpauth://totp/'));

    const currentStep = Math.floor(Date.now() / 1000 / 30);
    const validCode = generateTotpCode(secret, currentStep);

    // Verifikasi kode valid saat ini
    const isValid = verifyTotpCode(secret, validCode, 'test_user_1');
    assert.strictEqual(isValid, true, 'Kode TOTP yang cocok harus valid');

    // Replay attack: Kode yang sama dalam window yang sama harus DITOLAK
    const isReplayed = verifyTotpCode(secret, validCode, 'test_user_1');
    assert.strictEqual(isReplayed, false, 'Replay kode TOTP wajib ditolak!');

    // Kode sembarang harus ditolak
    assert.strictEqual(verifyTotpCode(secret, '000000', 'test_user_2'), false);
  });

  // =========================================================================
  // 5. Uji Enkripsi Secret TOTP (AES-256-GCM)
  // =========================================================================
  test('Kriptografi: Secret TOTP dienkripsi dan didekripsi dengan aman via AES-256-GCM', () => {
    const rawSecret = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptSecret(rawSecret);

    assert.notStrictEqual(encrypted, rawSecret);
    assert.strictEqual(encrypted.split(':').length, 3, 'Harus format IV:Tag:Cipher');

    const decrypted = decryptSecret(encrypted);
    assert.strictEqual(decrypted, rawSecret, 'Hasil dekripsi harus identik dengan aslinya');
  });

  // =========================================================================
  // 6. Uji Single-Use Recovery Codes
  // =========================================================================
  test('Recovery Codes: 10 kode pemulihan sekali pakai, hangus setelah digunakan', () => {
    const { codes, hashedCodes } = generateRecoveryCodes();
    assert.strictEqual(codes.length, 10);
    assert.strictEqual(hashedCodes.length, 10);

    const firstCode = codes[0];
    // Penggunaan pertama -> Berhasil & jumlah sisa kode berkurang 1
    const useResult1 = verifyRecoveryCode(firstCode, hashedCodes);
    assert.strictEqual(useResult1.valid, true);
    assert.strictEqual(useResult1.remainingHashes.length, 9);

    // Penggunaan kedua dengan kode yang sama -> DITOLAK karena sudah hangus!
    const useResult2 = verifyRecoveryCode(firstCode, useResult1.remainingHashes);
    assert.strictEqual(useResult2.valid, false, 'Kode recovery sekali pakai tidak boleh digunakan lagi');
  });

  // =========================================================================
  // 7. Uji Ekstraksi IP Klien dari Header x-forwarded-for
  // =========================================================================
  test('Ekstraksi IP: Mengambil IP pertama yang valid dari x-forwarded-for proxy chain', () => {
    const mockReq = {
      headers: {
        'x-forwarded-for': '182.253.18.42, 10.0.0.1, 172.16.0.1'
      }
    };
    const ip = getClientIp(mockReq);
    assert.strictEqual(ip, '182.253.18.42', 'Harus mengambil IP asli pertama klien publik');
  });

  // =========================================================================
  // 8. Uji JWT Session Token Engine
  // =========================================================================
  test('JWT: Sign & Verify Access Token dengan masa kedaluwarsa 15 menit', () => {
    const payload = { id: 101, email: 'vip@ruangsinema.com', role: 'VIP Member' };
    const token = signJwt(payload, undefined, 900);
    assert.strictEqual(typeof token, 'string');
    assert.strictEqual(token.split('.').length, 3);

    const verified = verifyJwt(token);
    assert.strictEqual(verified.id, 101);
    assert.strictEqual(verified.email, 'vip@ruangsinema.com');
    assert.strictEqual(verified.role, 'VIP Member');

    // Token dimodifikasi (tampered) harus ditolak
    const tampered = token.slice(0, -4) + 'abcd';
    assert.strictEqual(verifyJwt(tampered), null);
  });

  console.log(`\n🎉 SELURUH ${passedTests} UJI KEAMANAN BERHASIL LULUS 100%! 🛡️\n`);
}

runAllTests();

