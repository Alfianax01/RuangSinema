import React from 'react';
import { Check, X, ShieldCheck, ShieldAlert } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const hasMinLength = password.length >= 10;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  // Hitung Skor (0 - 4)
  let score = 0;
  if (hasMinLength) score += 1;
  if (hasLetter) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial && password.length >= 12) score += 1;

  let label = 'Sangat Lemah';
  let barColor = 'bg-red-500';
  let textColor = 'text-red-400';

  if (score === 2) {
    label = 'Lemah';
    barColor = 'bg-orange-500';
    textColor = 'text-orange-400';
  } else if (score === 3) {
    label = 'Sedang';
    barColor = 'bg-amber-400';
    textColor = 'text-amber-400';
  } else if (score >= 4) {
    label = 'Kuat & Aman';
    barColor = 'bg-emerald-500';
    textColor = 'text-emerald-400';
  }

  const percent = Math.min(100, Math.max(15, (score / 4) * 100));

  return (
    <div className="space-y-2 p-3 bg-zinc-900/90 rounded-xl border border-white/5 text-[11px] animate-fadeIn">
      <div className="flex items-center justify-between">
        <span className="text-zinc-400 flex items-center gap-1.5 font-medium">
          {score >= 3 ? (
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          )}
          Kekuatan Kata Sandi
        </span>
        <span className={`font-bold ${textColor}`}>{label}</span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${barColor} transition-all duration-300 rounded-full`} 
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Checklist Kriteria */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10px] text-zinc-400">
        <div className={`flex items-center gap-1 ${hasMinLength ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
          {hasMinLength ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-zinc-600" />}
          <span>Minimal 10 karakter</span>
        </div>
        <div className={`flex items-center gap-1 ${hasLetter ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
          {hasLetter ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-zinc-600" />}
          <span>Mengandung huruf (a-z)</span>
        </div>
        <div className={`flex items-center gap-1 ${hasNumber ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
          {hasNumber ? <Check className="w-3 h-3 text-emerald-400" /> : <X className="w-3 h-3 text-zinc-600" />}
          <span>Mengandung angka (0-9)</span>
        </div>
        <div className={`flex items-center gap-1 ${hasSpecial ? 'text-emerald-400 font-semibold' : 'text-zinc-500'}`}>
          {hasSpecial ? <Check className="w-3 h-3 text-emerald-400" /> : <span className="w-3 h-3 text-zinc-600 text-center">•</span>}
          <span>Karakter unik (opsional)</span>
        </div>
      </div>
    </div>
  );
};

