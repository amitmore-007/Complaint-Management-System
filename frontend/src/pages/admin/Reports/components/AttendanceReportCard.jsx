import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Coffee, LogIn, LogOut, Users } from 'lucide-react';
import dayjs from 'dayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MenuItem, TextField } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useTheme } from '../../../../context/ThemeContext';
import { useAllAttendance } from '../../../../hooks/useAttendance';

// â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const formatSecondsShort = (totalSeconds = 0) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
};

const formatTime = (date) =>
  date ? new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
};

const defaultFrom = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toISOString().slice(0, 10);
};
const defaultTo = () => new Date().toISOString().slice(0, 10);

const statusBadge = (status) => {
  if (status === 'working')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />Working</span>;
  if (status === 'on_break')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" />On Break</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"><span className="w-1.5 h-1.5 rounded-full bg-gray-400" />Checked Out</span>;
};

// â”€â”€ component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AttendanceReportCard = () => {
  const { isDarkMode } = useTheme();
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo]     = useState(defaultTo());
  const [roleFilter, setRoleFilter] = useState('');

  const muiTheme = useMemo(
    () => createTheme({ palette: { mode: isDarkMode ? 'dark' : 'light' } }),
    [isDarkMode]
  );

  const params = Object.fromEntries(
    Object.entries({ from, to, userRole: roleFilter || undefined }).filter(([, v]) => v)
  );

  const { data: records = [], isLoading } = useAllAttendance(params);

  const totalWorkSeconds  = records.reduce((s, r) => s + (r.totalWorkSeconds  || 0), 0);
  const totalBreakSeconds = records.reduce((s, r) => s + (r.totalBreakSeconds || 0), 0);
  const uniqueUsers = new Set(records.map((r) => r.userId)).size;

  const summaryCards = [
    { title: 'Records',          value: records.length,                       icon: BarChart3, bgColor: 'from-blue-600 to-blue-700'     },
    { title: 'Unique Users',     value: uniqueUsers,                          icon: Users,     bgColor: 'from-purple-500 to-purple-600'  },
    { title: 'Total Work Time',  value: formatSecondsShort(totalWorkSeconds),  icon: Clock,     bgColor: 'from-green-500 to-emerald-600'  },
    { title: 'Total Break Time', value: formatSecondsShort(totalBreakSeconds), icon: Coffee,    bgColor: 'from-amber-500 to-orange-500'   },
  ];

  const th = `px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`;
  const td = `px-4 py-4 text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;
  const rowBase = `border-b ${isDarkMode ? 'border-white/10 hover:bg-white/10/40' : 'border-gray-100 hover:bg-gray-50'} transition-colors`;

  return (
    <div className="space-y-6">

      {/* filters */}
      <ThemeProvider theme={muiTheme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div className="flex flex-wrap items-center gap-3">

            <DatePicker
              label="From"
              value={dayjs(from)}
              onChange={(v) => v && setFrom(v.format('YYYY-MM-DD'))}
              slotProps={{ textField: { size: 'small' } }}
            />

            <DatePicker
              label="To"
              value={dayjs(to)}
              onChange={(v) => v && setTo(v.format('YYYY-MM-DD'))}
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

          </div>
        </LocalizationProvider>
      </ThemeProvider>

      {/* summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <motion.div key={card.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <div className={`group relative p-5 rounded-2xl border transition-all duration-300 overflow-hidden ${
              isDarkMode ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200 hover:shadow-lg'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{card.title}</p>
                  <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${card.bgColor} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* table */}
      <div className={`rounded-2xl border overflow-hidden ${isDarkMode ? 'bg-[#111] border-white/10' : 'bg-white border-gray-200'} shadow-sm`}>
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className={`w-12 h-12 mx-auto mb-3 ${isDarkMode ? 'text-gray-700' : 'text-gray-300'}`} />
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>No records for the selected date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={isDarkMode ? 'bg-[#111]' : 'bg-gray-50'}>
                <tr>
                  <th className={th}>Date</th>
                  <th className={th}>Name</th>
                  <th className={th}>Phone</th>
                  <th className={th}>Role</th>
                  <th className={th}><span className="flex items-center gap-1"><LogIn className="w-3.5 h-3.5" />Check In</span></th>
                  <th className={th}><span className="flex items-center gap-1"><LogOut className="w-3.5 h-3.5" />Check Out</span></th>
                  <th className={th}><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Work Time</span></th>
                  <th className={th}><span className="flex items-center gap-1"><Coffee className="w-3.5 h-3.5" />Break</span></th>
                  <th className={th}>Breaks</th>
                  <th className={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r._id} className={rowBase}>
                    <td className={`${td} font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatDate(r.date)}</td>
                    <td className={`${td} font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{r.userName}</td>
                    <td className={td}>{r.userPhone}</td>
                    <td className={td}>
                      <span className={`capitalize px-2 py-0.5 rounded text-xs font-medium ${isDarkMode ? 'bg-[#111] text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                        {r.userRole}
                      </span>
                    </td>
                    <td className={td}>{formatTime(r.checkInTime)}</td>
                    <td className={td}>{formatTime(r.checkOutTime)}</td>
                    <td className={`${td} font-mono font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatSecondsShort(r.totalWorkSeconds)}</td>
                    <td className={`${td} font-mono`}>{formatSecondsShort(r.totalBreakSeconds)}</td>
                    <td className={td}>{r.sessions.filter((s) => s.type === 'break').length}</td>
                    <td className={td}>{statusBadge(r.currentStatus)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className={isDarkMode ? 'bg-[#111]' : 'bg-gray-50'}>
                <tr className={`border-t-2 ${isDarkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <td colSpan={6} className={`px-4 py-3 text-sm font-bold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Total ({records.length} records)
                  </td>
                  <td className={`px-4 py-3 text-sm font-bold font-mono ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{formatSecondsShort(totalWorkSeconds)}</td>
                  <td className={`px-4 py-3 text-sm font-bold font-mono ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{formatSecondsShort(totalBreakSeconds)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceReportCard;

