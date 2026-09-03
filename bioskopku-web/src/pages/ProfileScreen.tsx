import React, { useState } from 'react';
import { Mail, Sparkles, LogOut, CheckCircle, ShieldCheck, Shield, Key, Copy, Check, Loader2, AlertCircle } from 'lucide-react';
import type { User } from '../types';
import { setupMfa, enableMfa } from '../services/auth';

interface ProfileScreenProps {
  user: User;
  onOpenGenrePreferences: () => void;
  onOpenSecurityDashboard?: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  user,
  onOpenGenrePreferences,
  onOpenSecurityDashboard,
  onLogout,
}) => {
  const isAdmin = user.role === 'Super Admin' || user.role === 'Admin';
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaSecret, setMfaSecret] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [verifyCode, setVerifyCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaSuccessMsg, setMfaSuccessMsg] = useState('');
  const [mfaErrorMsg, setMfaErrorMsg] = useState('');

  const handleStartMfaSetup = async () => {
    setMfaLoading(true);
    setMfaErrorMsg('');
    try {
      const res = await setupMfa();
      if (res.success && res.secret) {
        setMfaSecret(res.secret);
        setRecoveryCodes(res.recoveryCodes || []);
        setShowMfaSetup(true);
      } else {
        setMfaErrorMsg(res.message || 'Gagal memulai setup 2FA.');
      }
    } catch (e: any) {
      setMfaErrorMsg('Gagal terhubung ke server autentikasi.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleConfirmMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.length < 6) {
      setMfaErrorMsg('Masukkan 6 digit kode dari aplikasi Authenticator.');
      return;
    }
    setMfaLoading(true);
    setMfaErrorMsg('');
    try {
      const res = await enableMfa(verifyCode);
      if (res.success) {
        setMfaSuccessMsg('Verifikasi 2 Langkah (2FA) berhasil diaktifkan untuk akun Anda!');
        user.role = user.role; // trigger update
      } else {
        setMfaErrorMsg(res.message || 'Kode salah.');
      }
    } catch (e: any) {
      setMfaErrorMsg('Gagal memverifikasi kode.');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCopySecret = () => {
    navigator.clipboard.writeText(mfaSecret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-28 space-y-6 animate-in fade-in duration-300">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Akun & Keamanan Saya
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Kelola profil, keamanan verifikasi 2 langkah, dan preferensi tontonan Anda di RuangSinema.
        </p>
      </div>

      {/* User Card */}
      <div className="p-6 sm:p-8 rounded-2xl bg-[#181818] border border-white/10 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <div className="w-18 h-18 rounded bg-gradient-to-br from-[#FF2E38] to-[#E50914] text-white font-black text-2xl flex items-center justify-center shadow-lg shadow-[#E50914]/30">
            {user.name.charAt(0).toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white">{user.name}</h2>
              <span className="px-2 py-0.5 rounded bg-[#E50914] text-white text-[10px] font-black uppercase tracking-wider">
                {user.role || 'VIP MEMBER'}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span>{user.email}</span>
            </p>
          </div>
        </div>

        {/* Security & VIP Status Badge */}
        <div className="p-4 rounded-xl bg-[#242424] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-300">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white">Perlindungan Kredensial OWASP Hardened</span>
              <p className="text-[11px] text-zinc-400">Password di-hash dengan PBKDF2-SHA512 (210.000 Iterasi) & Anti Brute-Force Shield.</p>
            </div>
          </div>
          <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
            <CheckCircle className="w-3.5 h-3.5" /> Terlindungi
          </span>
        </div>

        {/* Admin Tools: Security Dashboard Button */}
        {isAdmin && onOpenSecurityDashboard && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-600/20 text-[#E50914]">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Security Shield Dashboard (Super Admin)</h4>
                <p className="text-xs text-zinc-400">Pantau insiden brute-force, geolokasi IP penyerang, dan buka kunci akun real-time.</p>
              </div>
            </div>
            <button
              onClick={onOpenSecurityDashboard}
              className="px-4 py-2 rounded-xl bg-[#E50914] hover:bg-[#FF2E38] text-white font-bold text-xs shadow-lg shadow-[#E50914]/30 transition-all shrink-0"
            >
              Buka Dashboard
            </button>
          </div>
        )}

        {/* 2FA / Verifikasi Dua Langkah */}
        <div className="p-4 rounded-xl bg-[#242424] border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-[#E50914]" />
              <div>
                <h4 className="text-sm font-bold text-white">Verifikasi Dua Langkah (2FA)</h4>
                <p className="text-[11px] text-zinc-400">Gunakan Google Authenticator / Microsoft Authenticator untuk keamanan maksimal.</p>
              </div>
            </div>

            {!showMfaSetup && !mfaSuccessMsg && (
              <button
                onClick={handleStartMfaSetup}
                disabled={mfaLoading}
                className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
              >
                {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aktifkan 2FA'}
              </button>
            )}
          </div>

          {/* Success Message */}
          {mfaSuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-semibold">
              {mfaSuccessMsg}
            </div>
          )}

          {/* Error Message */}
          {mfaErrorMsg && (
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{mfaErrorMsg}</span>
            </div>
          )}

          {/* Setup MFA Flow */}
          {showMfaSetup && !mfaSuccessMsg && (
            <form onSubmit={handleConfirmMfa} className="pt-3 border-t border-white/10 space-y-4 text-xs animate-fadeIn">
              <div className="space-y-2">
                <p className="text-zinc-300">1. Salin Kunci Rahasia ini dan masukkan ke aplikasi Authenticator Anda:</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2.5 rounded-lg bg-black/60 text-amber-400 font-mono text-xs border border-white/10 select-all">
                    {mfaSecret}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="p-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 text-xs font-bold transition-colors"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedSecret ? 'Disalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              {recoveryCodes.length > 0 && (
                <div className="space-y-1.5 p-3 rounded-lg bg-black/40 border border-white/5">
                  <p className="font-bold text-white text-[11px]">Simpan 10 Kode Pemulihan Darurat Anda:</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-zinc-400">
                    {recoveryCodes.map((rc, i) => (
                      <span key={i} className="p-1 bg-white/5 rounded text-center">{rc}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-zinc-300">2. Masukkan 6 digit kode dari Authenticator untuk mengonfirmasi:</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Contoh: 123456"
                    className="w-44 bg-[#181818] border border-white/20 focus:border-[#E50914] text-white text-center font-bold tracking-widest text-sm rounded-lg p-2 outline-none"
                    required
                  />
                  <button
                    type="submit"
                    disabled={mfaLoading}
                    className="px-4 py-2 rounded-lg bg-[#E50914] hover:bg-[#FF2E38] text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#E50914]/30"
                  >
                    {mfaLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Konfirmasi & Aktifkan'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMfaSetup(false)}
                    className="px-3 py-2 text-zinc-400 hover:text-white"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Genre Preferences */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#E50914]" />
              <h3 className="text-sm font-bold text-white">Preferensi Genre Favorit</h3>
            </div>
            <button
              onClick={onOpenGenrePreferences}
              className="text-xs font-bold text-[#E50914] hover:underline"
            >
              Ubah Preferensi
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {user.genres && user.genres.length > 0 ? (
              user.genres.map((g, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-semibold bg-[#222222] text-white border border-white/10"
                >
                  {g}
                </span>
              ))
            ) : (
              <span className="text-xs text-gray-500 italic">Belum ada genre yang dipilih.</span>
            )}
          </div>
        </div>

        {/* Logout Button */}
        <div className="pt-4 border-t border-white/10 flex justify-end">
          <button
            onClick={onLogout}
            className="px-5 py-2.5 rounded bg-white/10 hover:bg-red-600 hover:text-white text-gray-300 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
