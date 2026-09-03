import React, { useState } from 'react';
import { Film, Lock, Mail, User as UserIcon, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, KeyRound, ArrowLeft } from 'lucide-react';
import type { User } from '../types';
import { loginUser, registerUser, resetUserPassword } from '../services/auth';

interface AuthScreenProps {
  onAuthSuccess: (user: User, isNewUser: boolean) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

const PASSWORD_RULE = 'Kata sandi minimal 10 karakter dan harus memuat huruf serta angka.';

function isStrongPassword(value: string): boolean {
  return value.length >= 10 && /[A-Za-z]/.test(value) && /[0-9]/.test(value);
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await loginUser(email, password);
        if (res.success && res.user) {
          onAuthSuccess(res.user, false);
        } else {
          setErrorMsg(res.message || 'Email atau kata sandi salah.');
        }
      } else if (mode === 'register') {
        if (!isStrongPassword(password)) {
          setErrorMsg(PASSWORD_RULE);
          setLoading(false);
          return;
        }
        const res = await registerUser(name, email, password);
        if (res.success) {
          setMode('login');
          setPassword('');
          setSuccessMsg('Akun VIP berhasil dibuat! Silakan masuk menggunakan email dan kata sandi Anda.');
        } else {
          setErrorMsg(res.message || 'Gagal mendaftar.');
        }
      } else if (mode === 'forgot') {
        if (!isStrongPassword(password)) {
          setErrorMsg(PASSWORD_RULE);
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi kata sandi tidak cocok.');
          setLoading(false);
          return;
        }
        const res = await resetUserPassword(email, password);
        if (res.success) {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setSuccessMsg('Kata sandi berhasil diperbarui! Silakan masuk dengan kata sandi baru Anda.');
        } else {
          setErrorMsg(res.message || 'Gagal mereset kata sandi.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi gangguan koneksi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#141414] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-sm scale-105"
        style={{ backgroundImage: "url('https://image.tmdb.org/t/p/original/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/80 to-[#141414]/90" />

      {/* Brand Top Header */}
      <div className="absolute top-6 left-6 sm:left-12 z-20 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF2E38] via-[#E50914] to-[#990008] p-0.5 shadow-lg shadow-[#E50914]/40">
          <div className="w-full h-full bg-[#121212] rounded-[10px] flex items-center justify-center">
            <Film className="w-5 h-5 text-[#E50914] stroke-[2.5]" />
          </div>
        </div>
        <span className="text-2xl font-black text-[#E50914] tracking-tighter uppercase">
          RUANG<span className="text-white">SINEMA</span>
        </span>
      </div>

      {/* Auth Box */}
      <div className="relative z-10 w-full max-w-md bg-black/85 border border-white/10 rounded-2xl p-8 sm:p-12 shadow-2xl space-y-6 backdrop-blur-xl">
        
        {/* Title Header */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {mode === 'login' && 'Masuk ke RuangSinema'}
              {mode === 'register' && 'Daftar Akun VIP'}
              {mode === 'forgot' && 'Reset Kata Sandi'}
            </h1>
            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                title="Kembali ke Masuk"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-400">
            {mode === 'login' && 'Nonton streaming film bioskop, Drakor & Dracin HD Sub Indo'}
            {mode === 'register' && 'Buat akun gratis untuk simpan playlist & akses streaming HD. ' + PASSWORD_RULE}
            {mode === 'forgot' && 'Masukkan email terdaftar dan buat kata sandi baru Anda'}
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-semibold flex items-start gap-2.5 shadow-lg shadow-emerald-950/40">
            <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400 mt-0.5" />
            <span className="leading-relaxed">{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-[#E50914]/20 border border-[#E50914]/50 text-red-400 text-xs font-semibold flex items-start gap-2.5 shadow-lg shadow-red-950/40">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-relaxed">{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div className="relative flex items-center">
              <UserIcon className="absolute left-4 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full bg-[#242424] focus:bg-[#303030] border border-white/10 focus:border-[#E50914] text-xs text-white placeholder-gray-400 rounded-xl py-3.5 pl-11 pr-4 outline-none transition-all"
                required
              />
            </div>
          )}

          <div className="relative flex items-center">
            <Mail className="absolute left-4 w-4 h-4 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email akun Anda"
              className="w-full bg-[#242424] focus:bg-[#303030] border border-white/10 focus:border-[#E50914] text-xs text-white placeholder-gray-400 rounded-xl py-3.5 pl-11 pr-4 outline-none transition-all"
              required
            />
          </div>

          {/* Password Input with Show/Hide Eye Toggle */}
          <div className="relative flex items-center">
            {mode === 'forgot' ? (
              <KeyRound className="absolute left-4 w-4 h-4 text-gray-400" />
            ) : (
              <Lock className="absolute left-4 w-4 h-4 text-gray-400" />
            )}
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'forgot' ? 'Kata Sandi Baru' : 'Kata Sandi'}
              className="w-full bg-[#242424] focus:bg-[#303030] border border-white/10 focus:border-[#E50914] text-xs text-white placeholder-gray-400 rounded-xl py-3.5 pl-11 pr-11 outline-none transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 p-1 text-gray-400 hover:text-white transition-colors"
              title={showPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Confirm Password Input for Forgot Mode with Eye Toggle */}
          {mode === 'forgot' && (
            <div className="relative flex items-center">
              <Lock className="absolute left-4 w-4 h-4 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Konfirmasi Kata Sandi Baru"
                className="w-full bg-[#242424] focus:bg-[#303030] border border-white/10 focus:border-[#E50914] text-xs text-white placeholder-gray-400 rounded-xl py-3.5 pl-11 pr-11 outline-none transition-all"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 p-1 text-gray-400 hover:text-white transition-colors"
                title={showConfirmPassword ? 'Sembunyikan Kata Sandi' : 'Lihat Kata Sandi'}
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Forgot Password Link in Login Mode */}
          {mode === 'login' && (
            <div className="flex justify-end pt-0.5">
              <button
                type="button"
                onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-xs text-zinc-400 hover:text-[#E50914] transition-colors"
              >
                Lupa kata sandi?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF2E38] to-[#E50914] hover:from-[#FF454E] hover:to-[#F40612] text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-[#E50914]/30 active:scale-98 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <span>
                {mode === 'login' && 'Masuk Sekarang'}
                {mode === 'register' && 'Daftar Akun VIP'}
                {mode === 'forgot' && 'Reset & Simpan Kata Sandi'}
              </span>
            )}
          </button>
        </form>

        {/* Footer Navigation Switcher */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          {mode === 'login' && (
            <>
              <span>Belum punya akun VIP?</span>
              <button
                type="button"
                onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-white font-bold hover:text-[#E50914] transition-colors"
              >
                Daftar di sini.
              </button>
            </>
          )}

          {mode === 'register' && (
            <>
              <span>Sudah punya akun?</span>
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-white font-bold hover:text-[#E50914] transition-colors"
              >
                Masuk di sini.
              </button>
            </>
          )}

          {mode === 'forgot' && (
            <>
              <span>Ingat kata sandi Anda?</span>
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                className="text-white font-bold hover:text-[#E50914] transition-colors"
              >
                Masuk sekarang.
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  );
};
