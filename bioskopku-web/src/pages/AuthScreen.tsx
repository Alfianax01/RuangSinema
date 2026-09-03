import React, { useState, useEffect } from 'react';
import { Film, Lock, Mail, User as UserIcon, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowLeft, Key } from 'lucide-react';
import type { User } from '../types';
import { loginUser, registerUser, requestPasswordReset, confirmPasswordReset } from '../services/auth';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { MfaVerificationModal } from '../components/MfaVerificationModal';

interface AuthScreenProps {
  onAuthSuccess: (user: User, isNewUser: boolean) => void;
}

type AuthMode = 'login' | 'register' | 'forgot' | 'reset' | 'mfa';

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // State MFA
  const [mfaToken, setMfaToken] = useState('');
  const [mfaType, setMfaType] = useState('totp');

  // Deteksi jika pengguna membuka link reset password dari email (?token=...&mode=reset)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const tokenParam = urlParams.get('token');
      if (tokenParam) {
        setResetToken(tokenParam);
        setMode('reset');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      // 1. MODE LOGIN
      if (mode === 'login') {
        const res = await loginUser(email, password);

        if (res.mfa_required && res.mfa_token) {
          setMfaToken(res.mfa_token);
          setMfaType(res.mfa_type || 'totp');
          setMode('mfa');
          return;
        }

        if (res.success && res.user) {
          onAuthSuccess(res.user, false);
        } else {
          setErrorMsg(res.message || 'Email atau kata sandi salah.');
        }
      } 
      // 2. MODE REGISTER
      else if (mode === 'register') {
        if (password.length < 10) {
          setErrorMsg('Kata sandi minimal 10 karakter dengan kombinasi huruf dan angka.');
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
      } 
      // 3. MODE FORGOT (KIRIM TOKEN PEMULIHAN)
      else if (mode === 'forgot') {
        const res = await requestPasswordReset(email);
        if (res.success) {
          if (res.previewToken) {
            setResetToken(res.previewToken);
            setMode('reset');
            setSuccessMsg('Token pemulihan berhasil dibuat! Silakan masukkan kata sandi baru Anda di bawah.');
          } else {
            setSuccessMsg(res.message || 'Jika email terdaftar, petunjuk pemulihan kata sandi telah dikirimkan ke email Anda.');
          }
        } else {
          setErrorMsg(res.message || 'Gagal memproses permintaan pemulihan kata sandi.');
        }
      } 
      // 4. MODE RESET (KONFIRMASI DENGAN TOKEN ACAK)
      else if (mode === 'reset') {
        if (!resetToken.trim()) {
          setErrorMsg('Token pemulihan wajib diisi.');
          setLoading(false);
          return;
        }
        if (password.length < 10) {
          setErrorMsg('Kata sandi baru minimal 10 karakter.');
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setErrorMsg('Konfirmasi kata sandi tidak cocok.');
          setLoading(false);
          return;
        }

        const res = await confirmPasswordReset(resetToken, password);
        if (res.success) {
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setResetToken('');
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

  const handleMfaSuccess = (user: User) => {
    onAuthSuccess(user, false);
  };

  return (
    <div className="min-h-screen w-full bg-[#141414] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-sm scale-105"
        style={{ backgroundImage: "url('https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg')" }}
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
      <div className="relative z-10 w-full max-w-md bg-black/85 border border-white/10 rounded-2xl p-8 sm:p-10 shadow-2xl space-y-6 backdrop-blur-xl">
        
        {/* Jika dalam step MFA (2FA) */}
        {mode === 'mfa' ? (
          <MfaVerificationModal
            mfaToken={mfaToken}
            mfaType={mfaType}
            onSuccess={handleMfaSuccess}
            onCancel={() => {
              setMode('login');
              setMfaToken('');
              setErrorMsg('');
            }}
          />
        ) : (
          <>
            {/* Title Header */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {mode === 'login' && 'Masuk ke RuangSinema'}
                  {mode === 'register' && 'Daftar Akun VIP'}
                  {mode === 'forgot' && 'Lupa Kata Sandi'}
                  {mode === 'reset' && 'Ganti Kata Sandi'}
                </h1>
                {(mode === 'forgot' || mode === 'reset') && (
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
                {mode === 'register' && 'Buat akun gratis untuk simpan playlist & akses streaming 60 FPS'}
                {mode === 'forgot' && 'Masukkan email terdaftar untuk menerima token pemulihan 15 menit'}
                {mode === 'reset' && 'Masukkan token pemulihan dari email dan buat kata sandi baru Anda'}
              </p>
            </div>

            {/* Success Alert */}
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 text-xs font-semibold flex items-start gap-2.5 shadow-lg shadow-emerald-950/40 animate-fadeIn">
                <CheckCircle2 className="w-4.5 h-4.5 shrink-0 text-emerald-400 mt-0.5" />
                <span className="leading-relaxed">{successMsg}</span>
              </div>
            )}

            {/* Error Alert */}
            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-[#E50914]/20 border border-[#E50914]/50 text-red-400 text-xs font-semibold flex items-start gap-2.5 shadow-lg shadow-red-950/40 animate-fadeIn">
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

              {mode !== 'reset' && (
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
              )}

              {/* Input Token Khusus Mode Reset */}
              {mode === 'reset' && (
                <div className="relative flex items-center">
                  <Key className="absolute left-4 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Token Pemulihan (32 karakter)"
                    className="w-full bg-[#242424] focus:bg-[#303030] border border-white/10 focus:border-[#E50914] text-xs text-white placeholder-gray-400 rounded-xl py-3.5 pl-11 pr-4 outline-none font-mono transition-all"
                    required
                  />
                </div>
              )}

              {/* Password Input with Show/Hide Eye Toggle */}
              {mode !== 'forgot' && (
                <div className="space-y-2">
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 w-4 h-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'reset' ? 'Kata Sandi Baru (Min. 10 Karakter)' : 'Kata Sandi'}
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

                  {/* Password Strength Meter saat Register & Reset */}
                  {(mode === 'register' || mode === 'reset') && (
                    <PasswordStrengthMeter password={password} />
                  )}
                </div>
              )}

              {/* Confirm Password Input for Reset Mode */}
              {mode === 'reset' && (
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

              {/* Switch to Token Input if already in Forgot mode */}
              {mode === 'forgot' && (
                <div className="flex justify-end pt-0.5">
                  <button
                    type="button"
                    onClick={() => { setMode('reset'); setErrorMsg(''); setSuccessMsg(''); }}
                    className="text-xs text-[#E50914] hover:underline"
                  >
                    Sudah punya token pemulihan? Masukkan di sini
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
                    {mode === 'forgot' && 'Kirim Petunjuk Pemulihan'}
                    {mode === 'reset' && 'Simpan Kata Sandi Baru'}
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

              {(mode === 'register' || mode === 'forgot' || mode === 'reset') && (
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
            </div>
          </>
        )}

      </div>
    </div>
  );
};
