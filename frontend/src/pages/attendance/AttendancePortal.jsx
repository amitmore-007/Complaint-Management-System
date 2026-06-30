import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { endpoints } from '../../api/endpoints';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const portalApi = axios.create({ baseURL: API_BASE, timeout: 15000 });

const SESSION_KEY = (token) => `portal_session_${token}`;

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : null;

const toHM = (secs = 0) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
};

// ── Status display ────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  if (status === 'working')
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-700">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Working
      </span>
    );
  if (status === 'on_break')
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-amber-100 text-amber-700">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        On Break
      </span>
    );
  if (status === 'checked_out')
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-600">
        <span className="w-2 h-2 rounded-full bg-gray-400" />
        Checked Out
      </span>
    );
  return null;
};

// ── PIN input ─────────────────────────────────────────────────────────────

const PinInput = ({ value, onChange, disabled }) => {
  const refs = [useRef(), useRef(), useRef(), useRef()];

  const handleKey = (i, e) => {
    if (e.key === 'Backspace') {
      if (value[i]) {
        onChange(value.slice(0, i) + ' ' + value.slice(i + 1));
      } else if (i > 0) {
        refs[i - 1].current?.focus();
        onChange(value.slice(0, i - 1) + ' ' + value.slice(i));
      }
      return;
    }
    if (!/^\d$/.test(e.key)) return;
    const next = value.slice(0, i) + e.key + value.slice(i + 1);
    onChange(next);
    if (i < 3) refs[i + 1].current?.focus();
  };

  return (
    <div className="flex gap-3 justify-center">
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] === ' ' || value[i] === undefined ? '' : value[i]}
          onChange={() => {}}
          onKeyDown={(e) => handleKey(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          className="w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:outline-none bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:border-blue-400 transition-colors disabled:opacity-50"
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────

const AttendancePortal = () => {
  const { token } = useParams();

  const [screen, setScreen]       = useState('loading');  // loading | pin | actions | done | invalid
  const [pin, setPin]             = useState('    ');
  const [pinError, setPinError]   = useState('');
  const [verifying, setVerifying] = useState(false);
  const [acting, setActing]       = useState(false);
  const [actionDone, setActionDone] = useState('');

  const [sessionToken, setSessionToken] = useState(null);
  const [userName, setUserName]         = useState('');
  const [attendance, setAttendance]     = useState(null);

  const saveSession = (tok, name) => {
    localStorage.setItem(SESSION_KEY(token), tok);
    setSessionToken(tok);
    setUserName(name);
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY(token));
    setSessionToken(null);
    setAttendance(null);
    setPin('    ');
    setPinError('');
    setScreen('pin');
  };

  const fetchStatus = useCallback(async (tok) => {
    try {
      const { data } = await portalApi.get(endpoints.attendance.portal.status(token), {
        headers: { Authorization: `Bearer ${tok}` },
      });
      setAttendance(data.attendance);
      setUserName(data.user.name);
      setScreen('actions');
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        clearSession();
      } else if (err?.response?.status === 404) {
        setScreen('invalid');
      } else {
        setScreen('actions');
      }
    }
  }, [token]);

  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY(token));
    if (stored) {
      setSessionToken(stored);
      fetchStatus(stored);
    } else {
      setScreen('pin');
    }
  }, [token, fetchStatus]);

  const handlePinSubmit = async () => {
    const digits = pin.replace(/ /g, '');
    if (digits.length < 4) { setPinError('Enter all 4 digits.'); return; }
    setPinError('');
    setVerifying(true);
    try {
      const { data } = await portalApi.post(endpoints.attendance.portal.session(token), { pin: digits });
      saveSession(data.sessionToken, data.user.name);
      await fetchStatus(data.sessionToken);
    } catch (err) {
      const msg = err?.response?.data?.message || 'Incorrect PIN.';
      if (err?.response?.status === 404) setScreen('invalid');
      else setPinError(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleAction = async (action) => {
    setActing(true);
    try {
      const { data } = await portalApi.post(
        endpoints.attendance.portal.record(token),
        { action },
        { headers: { Authorization: `Bearer ${sessionToken}` } }
      );
      const labels = { check_in: 'Checked In', check_out: 'Checked Out', break_start: 'Break Started', break_end: 'Break Ended' };
      setActionDone(labels[action] || 'Done');
      setAttendance(data.attendance);
      setScreen('done');
      setTimeout(() => setScreen('actions'), 2200);
    } catch (err) {
      if (err?.response?.status === 401) { clearSession(); return; }
      alert(err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setActing(false);
    }
  };

  const status = attendance?.currentStatus || null;
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Constro Energy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Attendance Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-100 dark:border-gray-700">

          {/* ── Loading ── */}
          {screen === 'loading' && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
            </div>
          )}

          {/* ── Invalid ── */}
          {screen === 'invalid' && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <p className="font-semibold text-gray-900 dark:text-white">Invalid Link</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">This link is invalid or has been revoked. Contact your admin for a new link.</p>
            </div>
          )}

          {/* ── PIN entry ── */}
          {screen === 'pin' && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Enter your PIN</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">4-digit PIN set by your admin</p>
              </div>

              <PinInput value={pin} onChange={setPin} disabled={verifying} />

              {pinError && (
                <p className="text-center text-sm font-medium text-red-600">{pinError}</p>
              )}

              <button
                onClick={handlePinSubmit}
                disabled={verifying || pin.replace(/ /g, '').length < 4}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? 'Verifying…' : 'Confirm'}
              </button>
            </div>
          )}

          {/* ── Actions ── */}
          {screen === 'actions' && (
            <div className="space-y-5">
              <div className="text-center">
                <p className="text-lg font-bold text-gray-900 dark:text-white">{userName}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{today}</p>
              </div>

              {attendance ? (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-2 text-center">
                  <StatusPill status={status} />
                  {attendance.checkInTime && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      In {fmtTime(attendance.checkInTime)}
                      {attendance.checkOutTime && ` · Out ${fmtTime(attendance.checkOutTime)}`}
                    </p>
                  )}
                  <p className="text-xs font-mono text-gray-500 dark:text-gray-400">
                    Work {toHM(attendance.totalWorkSeconds)}
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Not checked in yet</p>
                </div>
              )}

              <div className="space-y-2.5">
                {!status && (
                  <ActionBtn label="Check In" color="green" icon="login" onClick={() => handleAction('check_in')} loading={acting} />
                )}
                {status === 'working' && (
                  <>
                    <ActionBtn label="Start Break" color="amber" icon="coffee" onClick={() => handleAction('break_start')} loading={acting} />
                    <ActionBtn label="Check Out" color="slate" icon="logout" onClick={() => handleAction('check_out')} loading={acting} />
                  </>
                )}
                {status === 'on_break' && (
                  <>
                    <ActionBtn label="End Break" color="blue" icon="play" onClick={() => handleAction('break_end')} loading={acting} />
                    <ActionBtn label="Check Out" color="slate" icon="logout" onClick={() => handleAction('check_out')} loading={acting} />
                  </>
                )}
                {status === 'checked_out' && (
                  <div className="text-center py-4">
                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">You're done for today ✓</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Total: {toHM(attendance?.totalWorkSeconds)}</p>
                  </div>
                )}
              </div>

              <button
                onClick={clearSession}
                className="w-full text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
              >
                Sign out of this device
              </button>
            </div>
          )}

          {/* ── Done ── */}
          {screen === 'done' && (
            <div className="flex flex-col items-center py-10 gap-3 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white">{actionDone}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{fmtTime(new Date())}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

const COLORS = {
  green: 'bg-green-600 hover:bg-green-700',
  amber: 'bg-amber-500 hover:bg-amber-600',
  blue:  'bg-blue-600 hover:bg-blue-700',
  slate: 'bg-slate-600 hover:bg-slate-700',
};

const ActionBtn = ({ label, color, onClick, loading }) => (
  <button
    onClick={onClick}
    disabled={loading}
    className={`w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-colors ${COLORS[color]} disabled:opacity-50 disabled:cursor-not-allowed`}
  >
    {loading ? (
      <span className="inline-flex items-center justify-center gap-2">
        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
        Please wait…
      </span>
    ) : label}
  </button>
);

export default AttendancePortal;
