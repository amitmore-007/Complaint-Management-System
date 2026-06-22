import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Coffee, LogIn, LogOut, UserX, Play, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MenuItem, TextField } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { useTheme } from '../../context/ThemeContext';
import { useAllAttendance, useAttendanceSummary } from '../../hooks/useAttendance';

// ── helpers ─────────────────────────────────────────────────────────────────

const toShort = (totalSeconds = 0) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
};

const fmtTime = (date) =>
  date ? new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const initials = (name = '') =>
  name.split(' ').slice(0, 2).map((w) => w.charAt(0).toUpperCase()).join('');

// ── role config ──────────────────────────────────────────────────────────────

const ROLE_CFG = {
  admin:      { bg: 'bg-purple-100 text-purple-700', avatar: 'bg-gradient-to-br from-purple-500 to-indigo-600', label: 'Admin' },
  technician: { bg: 'bg-blue-100 text-blue-700',     avatar: 'bg-gradient-to-br from-blue-500 to-cyan-600',    label: 'Technician' },
  client:     { bg: 'bg-teal-100 text-teal-700',     avatar: 'bg-gradient-to-br from-teal-500 to-green-500',   label: 'Client' },
};
const defaultRole = { bg: 'bg-gray-100 text-gray-600', avatar: 'bg-gradient-to-br from-gray-400 to-gray-600', label: '—' };

// ── status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
  if (status === 'working')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Working
      </span>
    );
  if (status === 'on_break')
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />On Break
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">
      <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Checked Out
    </span>
  );
};

// ── live work-time cell ───────────────────────────────────────────────────────

const LiveWorkTime = ({ totalWorkSeconds, currentSessionStart, isWorking }) => {
  const [display, setDisplay] = useState(totalWorkSeconds);

  useEffect(() => {
    if (!isWorking || !currentSessionStart) { setDisplay(totalWorkSeconds); return; }
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(currentSessionStart).getTime()) / 1000);
      setDisplay(totalWorkSeconds + elapsed);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [totalWorkSeconds, currentSessionStart, isWorking]);

  return (
    <span className={`font-mono text-sm font-semibold tabular-nums ${isWorking ? 'text-green-500' : ''}`}>
      {toShort(display)}
    </span>
  );
};

// ── main component ────────────────────────────────────────────────────────────

const AttendanceManagement = () => {
  const { isDarkMode } = useTheme();
  const [date, setDate] = useState(todayStr());
  const [roleFilter, setRoleFilter] = useState('');
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: isDarkMode ? 'dark' : 'light' } }),
    [isDarkMode]
  );

  const params = Object.fromEntries(
    Object.entries({ date, userRole: roleFilter || undefined }).filter(([, v]) => v)
  );

  const { data: records = [], isLoading, refetch, isFetching } = useAllAttendance(params, { refetchInterval: 60_000 });
  const { data: summary } = useAttendanceSummary(date);

  useEffect(() => {
    if (!isFetching) setLastRefresh(new Date());
  }, [isFetching]);

  const summaryCards = [
    { title: 'Working',        value: summary?.working        ?? 0, icon: Play,   bgColor: 'from-green-500 to-emerald-600', shadow: 'shadow-green-500/20' },
    { title: 'On Break',       value: summary?.on_break       ?? 0, icon: Coffee, bgColor: 'from-amber-500 to-orange-500',  shadow: 'shadow-amber-500/20' },
    { title: 'Checked Out',    value: summary?.checked_out    ?? 0, icon: LogOut, bgColor: 'from-slate-500 to-gray-600',    shadow: 'shadow-gray-500/20'  },
    { title: 'Not Checked In', value: summary?.not_checked_in ?? 0, icon: UserX,  bgColor: 'from-red-500 to-rose-600',      shadow: 'shadow-red-500/20'   },
  ];

  const surface = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const thClass = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;
  const tdClass = `px-4 py-3.5 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;

  return (
    <DashboardLayout>
      <div className="py-8 px-4 md:px-6 space-y-6">

        {/* ── header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Attendance</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />Live
              </span>
            </div>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              {records.length} record{records.length !== 1 ? 's' : ''} · last refreshed {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>

          {/* ── filters ── */}
          <ThemeProvider theme={muiTheme}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <div className="flex flex-wrap items-center gap-3">

                <DatePicker
                  label="Date"
                  value={dayjs(date)}
                  onChange={(v) => v && setDate(v.format('YYYY-MM-DD'))}
                  slotProps={{ textField: { size: 'small' } }}
                />

                <TextField
                  select
                  label="Role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  size="small"
                  sx={{ minWidth: 130 }}
                  SelectProps={{ MenuProps: { disableScrollLock: true } }}
                >
                  <MenuItem value="">All Roles</MenuItem>
                  <MenuItem value="admin">Admin</MenuItem>
                  <MenuItem value="technician">Technician</MenuItem>
                  <MenuItem value="client">Client</MenuItem>
                </TextField>

                <button
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className={`h-10 w-10 inline-flex items-center justify-center rounded-xl border transition-colors cursor-pointer disabled:cursor-not-allowed ${isDarkMode ? 'border-gray-700 hover:bg-gray-800 text-gray-400' : 'border-gray-200 hover:bg-gray-50 text-gray-500'} disabled:opacity-50`}
                  title="Refresh now"
                >
                  <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                </button>

              </div>
            </LocalizationProvider>
          </ThemeProvider>
        </div>

        {/* ── summary cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className={`group relative p-5 rounded-2xl border transition-all duration-300 overflow-hidden ${
                isDarkMode
                  ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-lg'
              }`}>
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${card.bgColor} transition-opacity`} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{card.title}</p>
                    <p className={`text-3xl font-bold tabular-nums ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-gradient-to-br ${card.bgColor} rounded-xl flex items-center justify-center shadow-lg ${card.shadow} group-hover:scale-110 transition-transform duration-300`}>
                    <card.icon className="h-5 w-5 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ── table ── */}
        <div className={`rounded-2xl border overflow-hidden ${surface} shadow-sm`}>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>Loading attendance…</p>
            </div>
          ) : records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <Users className={`w-8 h-8 ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`} />
              </div>
              <p className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No records for this date</p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-600' : 'text-gray-400'}`}>Nobody has checked in yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={isDarkMode ? 'bg-gray-800/80' : 'bg-gray-50'}>
                  <tr>
                    <th className={thClass}>Employee</th>
                    <th className={thClass}>Role</th>
                    <th className={thClass}>Status</th>
                    <th className={thClass}><span className="flex items-center gap-1"><LogIn className="w-3.5 h-3.5" />In</span></th>
                    <th className={thClass}><span className="flex items-center gap-1"><LogOut className="w-3.5 h-3.5" />Out</span></th>
                    <th className={thClass}><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Work</span></th>
                    <th className={thClass}><span className="flex items-center gap-1"><Coffee className="w-3.5 h-3.5" />Break</span></th>
                    <th className={thClass}>Breaks</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const isWorking = r.currentStatus === 'working';
                    const isOnBreak = r.currentStatus === 'on_break';
                    const roleCfg   = ROLE_CFG[r.userRole] || defaultRole;
                    const rowHighlight = isWorking
                      ? isDarkMode ? 'border-l-2 border-l-green-500/60 bg-green-950/10' : 'border-l-2 border-l-green-400 bg-green-50/40'
                      : isOnBreak
                      ? isDarkMode ? 'border-l-2 border-l-amber-500/60' : 'border-l-2 border-l-amber-400 bg-amber-50/20'
                      : '';

                    return (
                      <tr
                        key={r._id}
                        className={`border-t transition-colors ${isDarkMode ? 'border-gray-800 hover:bg-gray-800/40' : 'border-gray-100 hover:bg-gray-50/80'} ${rowHighlight}`}
                      >
                        <td className={`${tdClass} min-w-[180px]`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl ${roleCfg.avatar} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                              <span className="text-white text-xs font-bold">{initials(r.userName)}</span>
                            </div>
                            <div>
                              <p className={`font-semibold text-sm leading-tight ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{r.userName}</p>
                              <p className={`text-xs mt-0.5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{r.userPhone}</p>
                            </div>
                          </div>
                        </td>

                        <td className={tdClass}>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${roleCfg.bg}`}>
                            {roleCfg.label}
                          </span>
                        </td>

                        <td className={tdClass}><StatusBadge status={r.currentStatus} /></td>

                        <td className={`${tdClass} font-mono text-xs tabular-nums`}>{fmtTime(r.checkInTime)}</td>
                        <td className={`${tdClass} font-mono text-xs tabular-nums ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{fmtTime(r.checkOutTime)}</td>

                        <td className={tdClass}>
                          <LiveWorkTime
                            totalWorkSeconds={r.totalWorkSeconds}
                            currentSessionStart={r.currentSessionStart}
                            isWorking={isWorking}
                          />
                        </td>

                        <td className={`${tdClass} font-mono text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{toShort(r.totalBreakSeconds)}</td>
                        <td className={`${tdClass} text-center`}>
                          <span className={`text-xs font-bold tabular-nums ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {r.sessions.filter((s) => s.type === 'break').length}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
};

export default AttendanceManagement;
