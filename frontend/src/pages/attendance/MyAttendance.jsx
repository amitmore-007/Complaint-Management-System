import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Coffee, Play, Phone, Shield, History, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import useAuthStore from '../../store/authStore';
import { useTheme } from '../../context/ThemeContext';
import {
  useTodayAttendance,
  useAttendanceHistory,
  useCheckIn,
  useStartBreak,
  useEndBreak,
  useCheckOut,
} from '../../hooks/useAttendance';

// ── formatters ───────────────────────────────────────────────────────────────

const toClock = (totalSeconds = 0) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
};

const toShort = (totalSeconds = 0) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
};

const fmtTime = (date) =>
  date ? new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });
};

const roleLabel = (r) => (r === 'admin' ? 'Admin' : r === 'technician' ? 'Technician' : 'Client');

// ── status config ────────────────────────────────────────────────────────────

const STATUS = {
  working: {
    label: 'Working',
    gradient: 'from-emerald-500 via-green-500 to-teal-500',
    timerLabel: 'Work Time',
    dot: 'bg-white',
    historyBg: 'bg-green-50',
    historyText: 'text-green-700',
    historyDot: 'bg-green-500',
  },
  on_break: {
    label: 'On Break',
    gradient: 'from-amber-500 via-orange-500 to-yellow-400',
    timerLabel: 'Break Time',
    dot: 'bg-white',
    historyBg: 'bg-amber-50',
    historyText: 'text-amber-700',
    historyDot: 'bg-amber-500',
  },
  checked_out: {
    label: 'Checked Out',
    gradient: 'from-slate-500 via-slate-600 to-gray-700',
    timerLabel: 'Total Work',
    dot: 'bg-white',
    historyBg: 'bg-gray-100',
    historyText: 'text-gray-600',
    historyDot: 'bg-gray-400',
  },
};

const DEFAULT_GRADIENT = 'from-blue-600 via-indigo-600 to-purple-600';

// ── live timer ───────────────────────────────────────────────────────────────

const LiveTimer = ({ baseSeconds, currentSessionStart, active, large = false }) => {
  const [secs, setSecs] = useState(baseSeconds);

  useEffect(() => {
    if (!active || !currentSessionStart) { setSecs(baseSeconds); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(currentSessionStart).getTime()) / 1000);
      setSecs(baseSeconds + elapsed);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [baseSeconds, currentSessionStart, active]);

  if (large) {
    // split into HH MM SS segments for big display
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const seg = (v) => String(v).padStart(2, '0');
    return (
      <div className="flex items-center justify-center gap-1 tabular-nums">
        <span>{seg(h)}</span>
        <span className="opacity-60 animate-pulse">:</span>
        <span>{seg(m)}</span>
        <span className="opacity-60 animate-pulse">:</span>
        <span>{seg(s)}</span>
      </div>
    );
  }

  return <span className="font-mono">{toShort(secs)}</span>;
};

// ── main component ───────────────────────────────────────────────────────────

const MyAttendance = () => {
  const { isDarkMode } = useTheme();
  const { user } = useAuthStore();
  const [showHistory, setShowHistory] = useState(false);

  const { data: attendance, isLoading } = useTodayAttendance();
  const { data: history = [], isLoading: histLoading } = useAttendanceHistory(30);

  const checkInMutation    = useCheckIn();
  const startBreakMutation = useStartBreak();
  const endBreakMutation   = useEndBreak();
  const checkOutMutation   = useCheckOut();

  const isAnyLoading =
    checkInMutation.isPending || startBreakMutation.isPending ||
    endBreakMutation.isPending || checkOutMutation.isPending;

  const handle = (mutation, label) => async () => {
    try {
      await mutation.mutateAsync();
      toast.success(`${label} successful`);
    } catch (err) {
      toast.error(err?.response?.data?.message || `${label} failed`);
    }
  };

  const status = attendance?.currentStatus;
  const cfg = status ? STATUS[status] : null;
  const gradient = cfg?.gradient ?? DEFAULT_GRADIENT;
  const breakCount = attendance ? attendance.sessions.filter((s) => s.type === 'break').length : 0;

  const surface = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';

  return (
    <DashboardLayout>
      <div className="max-w-lg mx-auto py-8 px-4 space-y-5">

        {/* ── hero card ── */}
        <motion.div
          className="rounded-3xl overflow-hidden shadow-2xl"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* gradient top */}
          <div className={`relative bg-gradient-to-br ${gradient} p-7`}>
            {/* subtle pattern overlay */}
            <div className="absolute inset-0 opacity-10"
              style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            {/* user row */}
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-lg flex-shrink-0">
                  <span className="text-white font-bold text-lg">{user?.name?.charAt(0)?.toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-white font-bold text-base leading-tight">{user?.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-white/70 text-xs flex items-center gap-1">
                      <Shield className="w-3 h-3" />{roleLabel(user?.role)}
                    </span>
                    <span className="text-white/40 text-xs">·</span>
                    <span className="text-white/70 text-xs flex items-center gap-1">
                      <Phone className="w-3 h-3" />{user?.phoneNumber}
                    </span>
                  </div>
                </div>
              </div>

              {/* status pill */}
              {cfg ? (
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-white text-xs font-semibold">{cfg.label}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-full flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-white/60" />
                  <span className="text-white text-xs font-semibold">Not Checked In</span>
                </div>
              )}
            </div>

            {/* big timer */}
            <div className="relative mt-8 text-center">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin w-8 h-8 rounded-full border-2 border-white/40 border-t-white" />
                </div>
              ) : attendance ? (
                <>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">
                    {status === 'on_break' ? 'Break Time' : status === 'checked_out' ? 'Total Work' : 'Work Time'}
                  </p>
                  <div className="text-white font-bold text-6xl tracking-tight leading-none">
                    <LiveTimer
                      baseSeconds={status === 'on_break' ? attendance.totalBreakSeconds : attendance.totalWorkSeconds}
                      currentSessionStart={attendance.currentSessionStart}
                      active={status === 'working' || status === 'on_break'}
                      large
                    />
                  </div>
                  <p className="text-white/50 text-xs mt-3">
                    Checked in at {fmtTime(attendance.checkInTime)}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-2">Ready to start?</p>
                  <div className="text-white/40 font-bold text-6xl tracking-tight leading-none">--:--:--</div>
                  <p className="text-white/40 text-xs mt-3">
                    {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* ── bottom panel ── */}
          <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-6 space-y-5`}>

            {/* mini stats (only when checked in) */}
            {attendance && (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Break Time', value: <LiveTimer baseSeconds={attendance.totalBreakSeconds} currentSessionStart={attendance.currentSessionStart} active={status === 'on_break'} />, color: 'text-amber-500' },
                  { label: 'Breaks',     value: breakCount,   color: 'text-purple-500' },
                  { label: 'Check Out',  value: fmtTime(attendance.checkOutTime), color: 'text-red-400' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={`rounded-xl p-3 text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                    <p className={`text-sm font-bold ${color} ${typeof value === 'object' ? '' : ''}`}>{value}</p>
                    <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* action buttons */}
            {!attendance && (
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={handle(checkInMutation, 'Check-in')} disabled={isAnyLoading}
                className={`w-full py-4 rounded-2xl bg-gradient-to-r ${DEFAULT_GRADIENT} text-white font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 disabled:opacity-60 transition-all cursor-pointer disabled:cursor-not-allowed`}>
                {isAnyLoading ? <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <LogIn className="w-5 h-5" />}
                Check In for Today
              </motion.button>
            )}

            {status === 'working' && (
              <div className="grid grid-cols-2 gap-3">
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={handle(startBreakMutation, 'Break started')} disabled={isAnyLoading}
                  className="py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-amber-500/30 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed">
                  {isAnyLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Coffee className="w-4 h-4" />}
                  Start Break
                </motion.button>
                <motion.button whileTap={{ scale: 0.97 }}
                  onClick={handle(checkOutMutation, 'Checked out')} disabled={isAnyLoading}
                  className="py-4 rounded-2xl bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/30 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed">
                  {isAnyLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <LogOut className="w-4 h-4" />}
                  Check Out
                </motion.button>
              </div>
            )}

            {status === 'on_break' && (
              <motion.button whileTap={{ scale: 0.97 }}
                onClick={handle(endBreakMutation, 'Break ended')} disabled={isAnyLoading}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-green-500/30 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed">
                {isAnyLoading ? <div className="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin" /> : <Play className="w-5 h-5" />}
                Resume Work
              </motion.button>
            )}

            {status === 'checked_out' && (
              <div className={`flex items-center justify-center gap-2 py-3 rounded-2xl ${isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-500'} text-sm font-medium`}>
                <LogOut className="w-4 h-4" />
                Shift complete · {fmtTime(attendance?.checkInTime)} – {fmtTime(attendance?.checkOutTime)}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── history ── */}
        <div className={`rounded-2xl border overflow-hidden ${surface} shadow-sm`}>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`w-full flex items-center justify-between px-5 py-4 font-semibold transition-colors cursor-pointer ${isDarkMode ? 'text-white hover:bg-gray-800' : 'text-gray-900 hover:bg-gray-50'}`}
          >
            <span className="flex items-center gap-2 text-sm">
              <History className="w-4 h-4 text-blue-500" />
              Attendance History
              {history.length > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  {history.length}
                </span>
              )}
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className={`border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-100'}`} />
                {histLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-6 h-6 rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className={`w-10 h-10 mx-auto mb-2 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No history yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={isDarkMode ? 'bg-gray-800/60' : 'bg-gray-50'}>
                        <tr>
                          {['Date', 'In', 'Out', 'Work', 'Break', 'Status'].map((h) => (
                            <th key={h} className={`px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((r) => {
                          const s = STATUS[r.currentStatus] || STATUS.checked_out;
                          return (
                            <tr key={r._id} className={`border-t transition-colors ${isDarkMode ? 'border-gray-800 hover:bg-gray-800/40' : 'border-gray-100 hover:bg-gray-50/60'}`}>
                              <td className={`px-4 py-3 font-medium text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{fmtDate(r.date)}</td>
                              <td className={`px-4 py-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fmtTime(r.checkInTime)}</td>
                              <td className={`px-4 py-3 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fmtTime(r.checkOutTime)}</td>
                              <td className={`px-4 py-3 font-mono font-semibold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{toShort(r.totalWorkSeconds)}</td>
                              <td className={`px-4 py-3 font-mono text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{toShort(r.totalBreakSeconds)}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.historyBg} ${s.historyText}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${s.historyDot}`} />{s.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default MyAttendance;
