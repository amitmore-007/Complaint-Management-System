import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Coffee, Play, History, ChevronDown, ChevronUp, Clock, CalendarCheck } from 'lucide-react';
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

// ── status config ────────────────────────────────────────────────────────────

const STATUS = {
  working: {
    label: 'Working',
    dot: 'bg-green-500',
    badge: 'bg-green-500/10 text-green-400 border-green-500/20',
    timerColor: 'text-green-400',
    historyBg: 'bg-green-100',
    historyText: 'text-green-700',
    historyDot: 'bg-green-500',
  },
  on_break: {
    label: 'On Break',
    dot: 'bg-amber-400',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    timerColor: 'text-amber-400',
    historyBg: 'bg-amber-100',
    historyText: 'text-amber-700',
    historyDot: 'bg-amber-500',
  },
  checked_out: {
    label: 'Checked Out',
    dot: 'bg-gray-400',
    badge: 'bg-white/5 text-gray-400 border-white/10',
    timerColor: 'text-white',
    historyBg: 'bg-gray-100',
    historyText: 'text-gray-600',
    historyDot: 'bg-gray-400',
  },
};

// ── live timer ───────────────────────────────────────────────────────────────

const LiveTimer = ({ baseSeconds, currentSessionStart, active }) => {
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

  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const seg = (v) => String(v).padStart(2, '0');

  return (
    <span className="font-mono tabular-nums">
      {seg(h)}:{seg(m)}:{seg(s)}
    </span>
  );
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
  const breakCount = attendance ? attendance.sessions.filter((s) => s.type === 'break').length : 0;

  const surface = isDarkMode ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200';
  const card = isDarkMode ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200';

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-6 px-4 space-y-4">

        {/* ── page header ── */}
        <div>
          <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            My Attendance
          </h1>
          <p className={`text-sm mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* ── main card ── */}
        <motion.div
          className={`rounded-2xl border overflow-hidden ${card}`}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* user + status row */}
          <div className={`px-5 py-4 flex items-center justify-between border-b ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0`}>
                <span className="text-white font-bold text-sm">{user?.name?.charAt(0)?.toUpperCase()}</span>
              </div>
              <div>
                <p className={`text-sm font-semibold leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {user?.name}
                </p>
                <p className={`text-xs mt-0.5 capitalize ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {user?.role} · {user?.phoneNumber}
                </p>
              </div>
            </div>

            {cfg ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${status === 'working' ? 'animate-pulse' : ''}`} />
                {cfg.label}
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${isDarkMode ? 'bg-white/5 text-gray-500 border-white/10' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                Not Checked In
              </span>
            )}
          </div>

          {/* timer section */}
          <div className="px-5 py-6">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <div className={`animate-spin w-6 h-6 rounded-full border-2 border-t-blue-500 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`} />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {status === 'on_break' ? 'Break Time' : status === 'checked_out' ? 'Total Work' : 'Work Time'}
                  </p>
                  {attendance ? (
                    <div className={`text-4xl font-bold tracking-tight ${cfg?.timerColor ?? (isDarkMode ? 'text-white' : 'text-gray-900')}`}>
                      <LiveTimer
                        baseSeconds={status === 'on_break' ? attendance.totalBreakSeconds : attendance.totalWorkSeconds}
                        currentSessionStart={attendance.currentSessionStart}
                        active={status === 'working' || status === 'on_break'}
                      />
                    </div>
                  ) : (
                    <div className={`text-4xl font-bold tracking-tight ${isDarkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                      --:--:--
                    </div>
                  )}
                  {attendance?.checkInTime && (
                    <p className={`text-xs mt-1.5 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                      In at {fmtTime(attendance.checkInTime)}
                      {attendance.checkOutTime && ` · Out at ${fmtTime(attendance.checkOutTime)}`}
                    </p>
                  )}
                </div>

                {/* stat pills */}
                {attendance && (
                  <div className="flex flex-col gap-2 items-end">
                    <div className={`text-right text-xs px-3 py-1.5 rounded-lg border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                      <p className={`font-mono font-semibold text-amber-400`}>
                        <LiveTimer
                          baseSeconds={attendance.totalBreakSeconds}
                          currentSessionStart={attendance.currentSessionStart}
                          active={status === 'on_break'}
                        />
                      </p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Break</p>
                    </div>
                    <div className={`text-right text-xs px-3 py-1.5 rounded-lg border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-gray-50 border-gray-100'}`}>
                      <p className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{breakCount}</p>
                      <p className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Breaks</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* action buttons */}
          <div className={`px-5 pb-5 space-y-3`}>
            {!attendance && !isLoading && (
              <button
                onClick={handle(checkInMutation, 'Check-in')}
                disabled={isAnyLoading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAnyLoading
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <LogIn className="w-4 h-4" />}
                Check In
              </button>
            )}

            {status === 'working' && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handle(startBreakMutation, 'Break started')}
                  disabled={isAnyLoading}
                  className={`py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    isDarkMode
                      ? 'border-white/10 text-gray-300 hover:bg-white/5'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {isAnyLoading
                    ? <div className="w-4 h-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
                    : <Coffee className="w-4 h-4" />}
                  Start Break
                </button>
                <button
                  onClick={handle(checkOutMutation, 'Checked out')}
                  disabled={isAnyLoading}
                  className="py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAnyLoading
                    ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <LogOut className="w-4 h-4" />}
                  Check Out
                </button>
              </div>
            )}

            {status === 'on_break' && (
              <button
                onClick={handle(endBreakMutation, 'Break ended')}
                disabled={isAnyLoading}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAnyLoading
                  ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  : <Play className="w-4 h-4" />}
                Resume Work
              </button>
            )}

            {status === 'checked_out' && (
              <div className="space-y-3">
                <div className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs ${isDarkMode ? 'border-white/10 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Shift complete
                </div>
                <button
                  onClick={handle(checkInMutation, 'Check-in')}
                  disabled={isAnyLoading}
                  className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAnyLoading
                    ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    : <LogIn className="w-4 h-4" />}
                  Check In Again
                </button>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── history ── */}
        <div className={`rounded-2xl border overflow-hidden ${surface}`}>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors cursor-pointer ${isDarkMode ? 'text-white hover:bg-white/5' : 'text-gray-900 hover:bg-gray-50'}`}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <History className="w-4 h-4 text-blue-500" />
              Attendance History
              {history.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-white/10 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                  {history.length}
                </span>
              )}
            </span>
            {showHistory
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />}
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
                <div className={`border-t ${isDarkMode ? 'border-white/10' : 'border-gray-100'}`} />
                {histLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin w-5 h-5 rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-center py-10">
                    <Clock className={`w-8 h-8 mx-auto mb-2 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>No history yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={isDarkMode ? 'bg-white/5' : 'bg-gray-50'}>
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
                            <tr key={r._id} className={`border-t transition-colors ${isDarkMode ? 'border-white/10 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50/60'}`}>
                              <td className={`px-4 py-3 font-medium text-xs ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{fmtDate(r.date)}</td>
                              <td className={`px-4 py-3 text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fmtTime(r.checkInTime)}</td>
                              <td className={`px-4 py-3 text-xs font-mono ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fmtTime(r.checkOutTime)}</td>
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
