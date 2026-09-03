import React, { useState, useRef, useEffect } from 'react';
import { ShieldCheck, Key, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { verifyMfaCode } from '../services/auth';
import type { User } from '../types';

interface MfaVerificationModalProps {
  mfaToken: string;
  mfaType?: string;
  onSuccess: (user: User) => void;
  onCancel: () => void;
}

export const MfaVerificationModal: React.FC<MfaVerificationModalProps> = ({
  mfaToken,
  mfaType = 'totp',
  onSuccess,
  onCancel
}) => {
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [recoveryCode, setRecoveryCode] = useState('');
  const [useRecovery, setUseRecovery] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus otomatis ke digit pertama
    if (!useRecovery && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [useRecovery]);

  useEffect(() => {
    if (mfaType === 'email' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, mfaType]);

  const handleDigitChange = (index: number, val: string) => {
    if (!/^\d*$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val.slice(-1);
    setDigits(newDigits);
    setErrorMsg('');

    // Pindah ke kotak berikutnya jika ada isinya
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Jika sudah terisi 6 digit lengkap, langsung submit otomatis
    if (val && index === 5 && newDigits.every(d => d !== '')) {
      handleAutoSubmit(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const newDigits = pastedData.slice(0, 6).split('');
      setDigits(newDigits);
      inputRefs.current[5]?.focus();
      handleAutoSubmit(newDigits.join(''));
    }
  };

  const handleAutoSubmit = async (fullCode: string) => {
    submitCode(fullCode, undefined);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (useRecovery) {
      if (!recoveryCode.trim()) {
        setErrorMsg('Silakan masukkan kode pemulihan.');
        return;
      }
      submitCode(undefined, recoveryCode.trim());
    } else {
      const code = digits.join('');
      if (code.length < 6) {
        setErrorMsg('Silakan masukkan 6 digit kode verifikasi.');
        return;
      }
      submitCode(code, undefined);
    }
  };

  const submitCode = async (code?: string, recovery?: string) => {
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await verifyMfaCode({
        mfaToken,
        code,
        recoveryCode: recovery,
        rememberDevice
      });

      if (res.success && res.user) {
        onSuccess(res.user);
      } else {
        setErrorMsg(res.message || 'Kode verifikasi salah atau telah kedaluwarsa.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memverifikasi kode 2FA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E50914] to-[#990008] p-0.5 mx-auto mb-3 shadow-lg shadow-[#E50914]/30 flex items-center justify-center">
          <div className="w-full h-full bg-[#181818] rounded-[14px] flex items-center justify-center">
            <ShieldCheck className="w-6 h-6 text-[#E50914]" />
          </div>
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">Verifikasi Dua Langkah (2FA)</h2>
        <p className="text-xs text-zinc-400 max-w-xs mx-auto">
          {useRecovery
            ? 'Masukkan salah satu dari 10 kode pemulihan darurat Anda'
            : mfaType === 'email'
            ? 'Masukkan 6 digit kode yang baru saja kami kirimkan ke email Anda'
            : 'Buka aplikasi Google Authenticator atau Authenticator Anda dan masukkan 6 digit kode'}
        </p>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-[#E50914]/20 border border-[#E50914]/50 text-red-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Input */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {!useRecovery ? (
          <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={el => { inputRefs.current[idx] = el; }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={e => handleDigitChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold bg-[#242424] focus:bg-[#303030] text-white border border-white/10 focus:border-[#E50914] rounded-xl outline-none transition-all shadow-inner"
              />
            ))}
          </div>
        ) : (
          <div className="relative">
            <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={recoveryCode}
              onChange={e => setRecoveryCode(e.target.value)}
              placeholder="Contoh: a1b2-c3d4"
              className="w-full bg-[#242424] border border-white/10 focus:border-[#E50914] text-xs text-white placeholder-zinc-500 rounded-xl py-3 pl-10 pr-4 outline-none font-mono"
              autoFocus
            />
          </div>
        )}

        {/* Checkbox Percayai Perangkat ini 30 Hari */}
        <div className="flex items-center gap-2.5 pt-1 text-xs text-zinc-300">
          <input
            type="checkbox"
            id="rememberDevice"
            checked={rememberDevice}
            onChange={e => setRememberDevice(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-zinc-800 text-[#E50914] focus:ring-0 cursor-pointer"
          />
          <label htmlFor="rememberDevice" className="cursor-pointer select-none">
            Percayai perangkat ini selama 30 hari
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#FF2E38] to-[#E50914] hover:from-[#FF454E] hover:to-[#F40612] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-[#E50914]/30 active:scale-98 transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span>Verifikasi & Masuk</span>
          )}
        </button>

        {/* Switch Options */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={() => {
              setUseRecovery(!useRecovery);
              setErrorMsg('');
            }}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            {useRecovery ? 'Gunakan kode 6 digit' : 'Gunakan Recovery Code'}
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="text-zinc-400 hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Kembali</span>
          </button>
        </div>
      </form>
    </div>
  );
};
