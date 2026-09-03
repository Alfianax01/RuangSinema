import React, { useState, useEffect } from 'react';
import { Shield, ShieldCheck, Ban, Unlock, X, Globe, Laptop, Clock } from 'lucide-react';
import { getAuthToken } from '../services/auth';

interface SecurityEvent {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  email?: string;
  ip?: string;
  location?: {
    city?: string;
    country?: string;
    isp?: string;
  };
  device?: string;
  message?: string;
  timestamp: string;
}

interface SecurityDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SecurityDashboardModal: React.FC<SecurityDashboardModalProps> = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    const streamUrl = '/api/security/stream';
    const eventSource = new EventSource(streamUrl);

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'connected') return;

        setEvents((prev) => {
          if (prev.some((item) => item.id === data.id)) return prev;
          return [data, ...prev].slice(0, 100);
        });
      } catch (err) {}
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [isOpen]);

  const handleUnlock = async (email?: string, ip?: string) => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const token = getAuthToken();
      const res = await fetch('/api/security/unlock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email, ip })
      });
      const data = await res.json();
      setActionMsg(data.message || 'Kunci berhasil dibuka.');
    } catch (e: any) {
      setActionMsg('Gagal membuka kunci.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockIp = async (ip?: string) => {
    if (!ip) return;
    setActionLoading(true);
    setActionMsg('');
    try {
      const token = getAuthToken();
      const res = await fetch('/api/security/ip-block', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ip, reason: 'Diblokir oleh Super Admin dari dashboard' })
      });
      const data = await res.json();
      setActionMsg(data.message || 'IP berhasil diblokir.');
    } catch (e: any) {
      setActionMsg('Gagal memblokir IP.');
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#141414] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-600/20 border border-red-500/30 text-[#E50914]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">Security Shield Dashboard</h2>
                <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1.5 ${
                  connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {connected ? 'LIVE STREAM' : 'MENYAMBUNG'}
                </div>
              </div>
              <p className="text-xs text-zinc-400">Pemantauan brute-force, lockout, dan deteksi IP real-time</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Status Banner */}
        {actionMsg && (
          <div className="px-5 py-2.5 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center justify-between">
            <span>{actionMsg}</span>
            <button onClick={() => setActionMsg('')} className="text-emerald-400 hover:text-white text-xs font-bold">Tutup</button>
          </div>
        )}

        {/* Main Feed Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 divide-y divide-white/5">
          {events.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto opacity-70" />
              <p className="text-sm font-bold text-white">Sistem Keamanan Berjalan Normal</p>
              <p className="text-xs text-zinc-500">Belum ada insiden brute-force atau percobaan login mencurigakan yang terdeteksi.</p>
            </div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase tracking-wider ${
                      ev.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-amber-500/20 text-amber-400'
                    }`}>
                      {ev.type}
                    </span>
                    <span className="font-bold text-white text-sm">{ev.email || 'Klien Anonim'}</span>
                    <span className="text-zinc-500 text-[11px] flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(ev.timestamp).toLocaleTimeString('id-ID')}
                    </span>
                  </div>

                  <p className="text-zinc-300">{ev.message}</p>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400 pt-0.5">
                    {ev.ip && (
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-zinc-500" />
                        IP: <code className="text-zinc-300 font-mono">{ev.ip}</code>
                      </span>
                    )}
                    {ev.location?.city && (
                      <span>
                        📍 {ev.location.city}, {ev.location.country} ({ev.location.isp})
                      </span>
                    )}
                    {ev.device && (
                      <span className="flex items-center gap-1">
                        <Laptop className="w-3 h-3 text-zinc-500" />
                        {ev.device}
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleUnlock(ev.email, ev.ip)}
                    disabled={actionLoading}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-emerald-600/20 text-zinc-300 hover:text-emerald-400 border border-white/10 hover:border-emerald-500/40 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Buka Kunci</span>
                  </button>
                  {ev.ip && (
                    <button
                      onClick={() => handleBlockIp(ev.ip)}
                      disabled={actionLoading}
                      className="px-2.5 py-1.5 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 font-semibold text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Blokir IP</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-400">
          <span>Otomatis menyegarkan feed via Server-Sent Events (SSE)</span>
          <button 
            onClick={() => setEvents([])} 
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Bersihkan Tampilan
          </button>
        </div>

      </div>
    </div>
  );
};
