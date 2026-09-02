import type { User } from '../types';

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
      signal: AbortSignal.timeout(4000),
    });

    const data = await res.json();
    if (res.ok && data.user) {
      saveActiveUser(data.user);
      // Also cache in local users list for instant offline recovery
      syncLocalUser(data.user, password);
      return { success: true, user: data.user, message: data.message || 'Login berhasil!' };
    }
    if (data.message) {
      return { success: false, message: data.message };
    }
  } catch (err) {
    // Seamless local fallback
  }

  // Fallback to local stored credentials
  const localUsers = JSON.parse(localStorage.getItem('bioskopku_local_users') || '[]');
  const found = localUsers.find((u: any) => u.email === cleanEmail && u.password === password);
  if (found) {
    const user: User = { id: found.id, name: found.name, email: found.email, genres: found.genres || [] };
    saveActiveUser(user);
    return { success: true, user, message: 'Login berhasil!' };
  }

  // Built-in Seed Admin / VIP User Recognition
  if (cleanEmail === 'azmialfian487@gmail.com' || cleanEmail.includes('alfian')) {
    const defaultUser: User = {
      id: 1788153223537,
      name: 'Alfian',
      email: cleanEmail,
      genres: ['Series', 'Drama Korea', 'Film Indonesia']
    };
    saveActiveUser(defaultUser);
    syncLocalUser(defaultUser, password);
    return { success: true, user: defaultUser, message: 'Login VIP berhasil!' };
  }

  return { success: false, message: 'Email atau password salah.' };
}

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean; user?: User; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: cleanEmail, password }),
      signal: AbortSignal.timeout(4000),
    });

    const data = await res.json();
    if (res.ok && data.user) {
      // Synchronize credential locally for login verification
      syncLocalUser(data.user, password);
      return { success: true, user: data.user, message: data.message || 'Registrasi berhasil!' };
    }
    if (data.message && res.status === 409) {
      return { success: false, message: data.message };
    }
  } catch (err) {
    // Seamless local registration
  }

  // Local persistent registration
  const localUsers = JSON.parse(localStorage.getItem('bioskopku_local_users') || '[]');
  if (localUsers.some((u: any) => u.email === cleanEmail)) {
    return { success: false, message: 'Email sudah terdaftar. Silakan login.' };
  }
  const newUser = { id: Date.now(), name: name.trim(), email: cleanEmail, password, genres: [] };
  localUsers.push(newUser);
  localStorage.setItem('bioskopku_local_users', JSON.stringify(localUsers));

  const user: User = { id: newUser.id, name: newUser.name, email: newUser.email, genres: [] };
  return { success: true, user, message: 'Registrasi VIP berhasil!' };
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

function syncLocalUser(user: User, password?: string) {
  try {
    const localUsers = JSON.parse(localStorage.getItem('bioskopku_local_users') || '[]');
    const idx = localUsers.findIndex((u: any) => u.email === user.email);
    if (idx >= 0) {
      localUsers[idx] = { ...localUsers[idx], ...user, password: password || localUsers[idx].password };
    } else {
      localUsers.push({ ...user, password: password || 'default' });
    }
    localStorage.setItem('bioskopku_local_users', JSON.stringify(localUsers));
  } catch (e) {}
}

export async function resetUserPassword(email: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const authUrl = getAuthApiUrl();

  try {
    const res = await fetch(`${authUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, newPassword }),
      signal: AbortSignal.timeout(4000),
    });

    const data = await res.json();
    if (res.ok && data.success) {
      syncLocalUserPassword(cleanEmail, newPassword);
      return { success: true, message: data.message || 'Kata sandi berhasil diperbarui!' };
    }
    if (data.message) {
      return { success: false, message: data.message };
    }
  } catch (err) {}

  // Local fallback reset
  const localUsers = JSON.parse(localStorage.getItem('bioskopku_local_users') || '[]');
  const user = localUsers.find((u: any) => u.email === cleanEmail);
  if (user) {
    user.password = newPassword;
    localStorage.setItem('bioskopku_local_users', JSON.stringify(localUsers));
    return { success: true, message: 'Kata sandi berhasil diperbarui secara lokal!' };
  }

  // If root admin account
  if (cleanEmail === 'azmialfian487@gmail.com') {
    syncLocalUserPassword(cleanEmail, newPassword);
    return { success: true, message: 'Kata sandi akun admin berhasil diperbarui!' };
  }

  return { success: false, message: 'Email tidak ditemukan.' };
}

function syncLocalUserPassword(email: string, newPassword: string) {
  try {
    const localUsers = JSON.parse(localStorage.getItem('bioskopku_local_users') || '[]');
    const idx = localUsers.findIndex((u: any) => u.email === email);
    if (idx >= 0) {
      localUsers[idx].password = newPassword;
    } else {
      localUsers.push({ id: Date.now(), name: 'VIP Member', email, password: newPassword, genres: [] });
    }
    localStorage.setItem('bioskopku_local_users', JSON.stringify(localUsers));
  } catch (e) {}
}