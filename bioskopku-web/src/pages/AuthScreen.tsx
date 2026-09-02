
import React, { useState } from 'react';
import { Film, Lock, Mail, User as UserIcon, Loader2 } from 'lucide-react';
import type { User } from '../types';
import { loginUser, registerUser } from '../services/auth';

interface AuthScreenProps {
  onAuthSuccess: (user: User, isNewUser: boolean) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await loginUser(email, password);
        if (res.success && res.user) {
          onAuthSuccess(res.user, false);
        } else {
          setErrorMsg(res.message || 'Email atau kata sandi salah.');
        }
      } else {
        const res = await registerUser(name, email, password);
        if (res.success && res.user) {
          onAuthSuccess(res.user, true);
        } else {
          setErrorMsg(res.message || 'Gagal mendaftar.');
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
      
      {/* Background Ambience (Netflix Poster Grid Overlay) */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-sm scale-105"
        style={{ backgroundImage: "url('https://image.tmdb.org/t/p/original/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-black/80 to-[#141414]/90" />

      {/* Netflix Top Header */}
      <div className="absolute top-6 left-6 sm:left-12 z-20 flex items-center gap-2">
        <div className="w-8 h-8 rounded bg-[#E50914] flex items-center justify-center">
          <Film className="w-5 h-5 text-white stroke-[2.5]" />
        </div>
        <span className="text-2xl font-black text-[#E50914] tracking-tighter uppercase">
          RUANG<span className="text-white">SINEMA</span>
        </span>
      </div>

      {/* Netflix Auth Box */}
      <div className="relative z-10 w-full max-w-md bg-black/75 border border-white/10 rounded-md p-8 sm:p-12 shadow-2xl space-y-6">
        
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          {isLogin ? 'Masuk' : 'Daftar Akun'}
        </h1>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded bg-[#E87C03]/20 border border-[#E87C03] text-[#E87C03] text-xs font-bold">
            {errorMsg}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative flex items-center">
              <UserIcon className="absolute left-4 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full bg-[#333333] focus:bg-[#454545] border border-transparent focus:border-white text-xs text-white placeholder-gray-400 rounded py-3.5 pl-11 pr-4 outline-none transition-all"
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
              placeholder="Email atau nomor telepon"
              className="w-full bg-[#333333] focus:bg-[#454545] border border-transparent focus:border-white text-xs text-white placeholder-gray-400 rounded py-3.5 pl-11 pr-4 outline-none transition-all"
              required
            />
          </div>

          <div className="relative flex items-center">
            <Lock className="absolute left-4 w-4 h-4 text-gray-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kata Sandi"
              className="w-full bg-[#333333] focus:bg-[#454545] border border-transparent focus:border-white text-xs text-white placeholder-gray-400 rounded py-3.5 pl-11 pr-4 outline-none transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded bg-[#E50914] hover:bg-[#F40612] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all disabled:opacity-50 mt-4"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-white" />
            ) : (
              <span>{isLogin ? 'Masuk' : 'Daftar'}</span>
            )}
          </button>
        </form>

        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>{isLogin ? 'Baru di RuangSinema?' : 'Sudah punya akun?'}</span>
          <button
            type="button"
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
            className="text-white font-bold hover:underline"
          >
            {isLogin ? 'Daftar sekarang.' : 'Masuk sekarang.'}
          </button>
        </div>
      </div>
    </div>
  );
};
