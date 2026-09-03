import type { User } from '../types';

// Storage Keys
const USER_KEY = 'bioskopku_active_user';
const TOKEN_KEY = 'bioskopku_auth_token';
const DEVICE_TOKEN_KEY = 'bioskopku_device_token';

// Dynamic API URL for Vercel Cloud & Local Dev
const getAuthApiUrl = () => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:5001/api/auth';
    }
    return '/api/auth';
  }
  return 'http://localhost:5001/api/auth';
};

export function getActiveUser(): User | null {
  if (typeof window === 'undefined') return null;
  const cached = localStorage.getItem(USER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  return null;
}

export function saveActiveUser(user: User): void {
  if (typeof window === 'undefined') return;
  // Hapus semua field sensitif bila ada
  const cleanUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    genres: user.genres || [],
    role: user.role || 'VIP Member',
    avatar: user.avatar
  };
  localStorage.setItem(USER_KEY, JSON.stringify(cleanUser));
}

export function removeActiveUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function saveAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getDeviceToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(DEVICE_TOKEN_KEY);
}

export function saveDeviceToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEVICE_TOKEN_KEY, token);
}

// Bersihkan riwayat password plaintext lama bila ada di browser user
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('bioskopku_local_users');
  } catch (e) {}
}

/**
 * LOGIN USER
 * ZERO BACKDOOR, ZERO PLAINTEXT PASSWORDS, DUKUNGAN 2FA
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{
  success: boolean;
  user?: User;
  message: string;
  mfa_required?: boolean;
  mfa_type?: string;
  mfa_token?: string;
  locked?: boolean;
  remainingMinutes?: number;
}> {
  const cleanEmail = email.toLowerCase().trim();
  const authUrl = getAuthApiUrl();
  const deviceToken = getDeviceToken();

  try {
    const res = await fetch(`${authUrl}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(deviceToken ? { 'X-Device-Token': deviceToken } : {})
      },
      body: JSON.stringify({ email: cleanEmail, password, deviceToken }),
      signal: AbortSignal.timeout(6000)
    });

    const data = await res.json();

    // 1. Akun Terkunci (5x Gagal)
    if (res.status === 423 || data.locked) {
      return {
        success: false,
        locked: true,
        remainingMinutes: data.remainingMinutes || 15,
        message: data.message || 'Akun sementara dikunci karena 5 kali percobaan gagal.'
      };
    }

    // 2. Butuh Verifikasi 2 Langkah (2FA)
    if (data.mfa_required && data.mfa_token) {
      return {
        success: false,
        mfa_required: true,
        mfa_type: data.mfa_type || 'totp',
        mfa_token: data.mfa_token,
        message: data.message || 'Silakan masukkan kode autentikasi 2 langkah (2FA).'
      };
    }

    // 3. Login Sukses
    if (res.ok && data.user) {
      saveActiveUser(data.user);
      if (data.accessToken) {
        saveAuthToken(data.accessToken);
      }
      return {
        success: true,
        user: data.user,
        message: data.message || 'Login berhasil!'
      };
    }

    return {
      success: false,
      message: data.message || 'Email atau kata sandi salah.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal terhubung ke server keamanan. Silakan periksa koneksi internet Anda.'
    };
  }
}

/**
 * VERIFIKASI KODE 2FA (MFA)
 */
export async function verifyMfaCode({
  mfaToken,
  code,
  recoveryCode,
  rememberDevice
}: {
  mfaToken: string;
  code?: string;
  recoveryCode?: string;
  rememberDevice?: boolean;
}): Promise<{ success: boolean; user?: User; message: string }> {
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/mfa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mfa_token: mfaToken,
        code,
        recovery_code: recoveryCode,
        remember_device: rememberDevice
      }),
      signal: AbortSignal.timeout(6000)
    });

    const data = await res.json();

    if (res.ok && data.user) {
      saveActiveUser(data.user);
      if (data.accessToken) {
        saveAuthToken(data.accessToken);
      }
      if (data.deviceToken) {
        saveDeviceToken(data.deviceToken);
      }
      return {
        success: true,
        user: data.user,
        message: data.message || 'Verifikasi 2 langkah berhasil!'
      };
    }

    return {
      success: false,
      message: data.message || 'Kode verifikasi tidak valid atau telah kedaluwarsa.'
    };
  } catch (e: any) {
    return {
      success: false,
      message: 'Terjadi gangguan jaringan saat verifikasi kode.'
    };
  }
}

/**
 * REGISTER USER (Validasi Kuat di Server & Hashing PBKDF2 210k)
 */
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: cleanEmail, password }),
      signal: AbortSignal.timeout(6000)
    });

    const data = await res.json();

    if (res.ok && data.user) {
      return {
        success: true,
        user: data.user,
        message: data.message || 'Registrasi VIP berhasil!'
      };
    }

    return {
      success: false,
      message: data.message || 'Gagal mendaftarkan akun.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Gagal terhubung ke server registrasi.'
    };
  }
}

/**
 * MINTA TOKEN RESET PASSWORD (15 Menit via Email)
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string; previewToken?: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/reset-password/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
      signal: AbortSignal.timeout(6000)
    });

    const data = await res.json();
    return {
      success: res.ok && Boolean(data.success),
      message: data.message || 'Jika email terdaftar, petunjuk pemulihan kata sandi telah dikirimkan.',
      previewToken: data.previewToken
    };
  } catch (err) {
    return {
      success: false,
      message: 'Gagal terhubung ke server pemulihan kata sandi.'
    };
  }
}

/**
 * KONFIRMASI GANTI PASSWORD DENGAN TOKEN
 */
export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/reset-password/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim(), newPassword }),
      signal: AbortSignal.timeout(5000)
    });

    const data = await res.json();
    return {
      success: res.ok && Boolean(data.success),
      message: data.message || 'Kata sandi berhasil diperbarui.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Terjadi gangguan koneksi saat mengubah kata sandi.'
    };
  }
}

/**
 * SETUP MFA (TOTP)
 */
export async function setupMfa(): Promise<{ success: boolean; secret?: string; otpauthUrl?: string; recoveryCodes?: string[]; message?: string }> {
  const authUrl = getAuthApiUrl();
  const token = getAuthToken();

  try {
    const res = await fetch(`${authUrl}/mfa/setup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: 'Gagal inisiasi 2FA.' };
  }
}

/**
 * AKTIFKAN MFA DENGAN 1 KODE VALID
 */
export async function enableMfa(code: string): Promise<{ success: boolean; message: string }> {
  const authUrl = getAuthApiUrl();
  const token = getAuthToken();

  try {
    const res = await fetch(`${authUrl}/mfa/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ code })
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, message: 'Gagal mengaktifkan 2FA.' };
  }
}

export async function saveUserPreferences(_email: string, genres: string[]): Promise<boolean> {
  const active = getActiveUser();
  if (active) {
    active.genres = genres;
    saveActiveUser(active);
  }
  return true;
}