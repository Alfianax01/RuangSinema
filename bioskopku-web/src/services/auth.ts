
import type { User } from '../types';

const AUTH_API_URL = 'http://localhost:5001/api/auth';
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
  try {
    const res = await fetch(`${AUTH_API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(3000),
    });

    const data = await res.json();
    if (res.ok && data.user) {
      saveActiveUser(data.user);
      return { success: true, user: data.user, message: data.message || 'Login berhasil!' };
    }
    return { success: false, message: data.message || 'Login gagal.' };
  } catch (err) {
    // Local offline login fallback
    const localUsers = JSON.parse(localStorage.getItem('bioskopku_local_users') || '[]');
    const cleanEmail = email.toLowerCase().trim();
    const found = localUsers.find((u: any) => u.email === cleanEmail && u.password === password);
    if (found) {
      const user: User = { id: found.id, name: found.name, email: found.email, genres: found.genres || [] };
      saveActiveUser(user);
      return { success: true, user, message: 'Login berhasil!' };
    }
    return { success: false, message: 'Email atau password salah.' };
  }
}

export async function registerUser(name: string, email: string, password: string): Promise<{ success: boolean; user?: User; message: string }> {
  try {
    const res = await fetch(`${AUTH_API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
      signal: AbortSignal.timeout(3000),
    });

    const data = await res.json();
    if (res.ok && data.user) {
      saveActiveUser(data.user);
      return { success: true, user: data.user, message: data.message || 'Registrasi berhasil!' };
    }
    return { success: false, message: data.message || 'Registrasi gagal.' };
  } catch (err) {
    // Local offline register fallback
    const localUsers = JSON.parse(localStorage.getItem('bioskopku_local_users') || '[]');
    const cleanEmail = email.toLowerCase().trim();
    if (localUsers.some((u: any) => u.email === cleanEmail)) {
      return { success: false, message: 'Email sudah terdaftar. Silakan login.' };
    }
    const newUser = { id: Date.now(), name: name.trim(), email: cleanEmail, password, genres: [] };
    localUsers.push(newUser);
    localStorage.setItem('bioskopku_local_users', JSON.stringify(localUsers));

    const user: User = { id: newUser.id, name: newUser.name, email: newUser.email, genres: [] };
    saveActiveUser(user);
    return { success: true, user, message: 'Registrasi berhasil!' };
  }
}

export async function saveUserPreferences(email: string, genres: string[]): Promise<boolean> {
  const active = getActiveUser();
  if (active) {
    active.genres = genres;
    saveActiveUser(active);
  }

  try {
    await fetch(`${AUTH_API_URL}/preferences`, {
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
