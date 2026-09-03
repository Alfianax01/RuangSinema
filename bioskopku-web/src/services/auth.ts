import type { User } from '../types';

const LEGACY_LOCAL_USERS_KEY = 'bioskopku_local_users';

// Older builds cached plaintext passwords in localStorage; purge them on load.
if (typeof window !== 'undefined') {
  localStorage.removeItem(LEGACY_LOCAL_USERS_KEY);
}

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

const USER_KEY = 'bioskopku_active_user';

export function getActiveUser(): User | null {
  const cached = localStorage.getItem(USER_KEY);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch (e) {}
  }
  return null;
}

export function saveActiveUser(user: User): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function removeActiveUser(): void {
  localStorage.removeItem(USER_KEY);
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; user?: User; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (res.ok && data.user) {
      saveActiveUser(data.user);
      return { success: true, user: data.user, message: data.message || 'Login berhasil!' };
    }
    return { success: false, message: data.message || 'Email atau kata sandi salah.' };
  } catch (err) {
    return { success: false, message: 'Tidak dapat terhubung ke server. Coba lagi sebentar lagi.' };
  }
}

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean; user?: User; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: cleanEmail, password }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (res.ok && data.user) {
      return { success: true, user: data.user, message: data.message || 'Registrasi berhasil!' };
    }
    return { success: false, message: data.message || 'Gagal mendaftar. Coba lagi.' };
  } catch (err) {
    return { success: false, message: 'Tidak dapat terhubung ke server. Coba lagi sebentar lagi.' };
  }
}

export async function saveUserPreferences(email: string, genres: string[]): Promise<boolean> {
  const active = getActiveUser();
  if (active) {
    active.genres = genres;
    saveActiveUser(active);
  }

  try {
    const authUrl = getAuthApiUrl();
    await fetch(`${authUrl}/preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, genres }),
      signal: AbortSignal.timeout(3000),
    });
    return true;
  } catch (e) {
    return true;
  }
}

export async function resetUserPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, newPassword }),
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();
    if (res.ok && (data.success || data.status === 'success')) {
      return { success: true, message: data.message || 'Kata sandi berhasil diperbarui!' };
    }
    return { success: false, message: data.message || 'Gagal mereset kata sandi.' };
  } catch (err) {
    return { success: false, message: 'Tidak dapat terhubung ke server. Coba lagi sebentar lagi.' };
  }
}
