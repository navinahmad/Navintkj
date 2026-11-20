import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import {
  EMPLOYEE_STATUS_LABELS,
  ROLE_LABELS,
  type EmployeeAttendanceRecord,
  type EmployeeAttendanceStatus,
} from '../../types/app';

interface EmployeeAttendanceResponse {
  today: string;
  todayRecord: EmployeeAttendanceRecord | null;
  records: EmployeeAttendanceRecord[];
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function EmployeeAttendancePage() {
  const { user } = useAuth();
  const [data, setData] = useState<EmployeeAttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<EmployeeAttendanceStatus>('hadir');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const res = await apiRequest<EmployeeAttendanceResponse>('/api/attendance/employee/me');
      setData(res);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat data absensi.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleCheckIn(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/attendance/employee/check-in', {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      });
      setNotes('');
      setFeedback({ type: 'success', text: 'Absensi masuk berhasil dicatat.' });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mencatat absensi masuk.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    setFeedback(null);
    setSubmitting(true);
    try {
      await apiRequest('/api/attendance/employee/check-out', {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
      setNotes('');
      setFeedback({ type: 'success', text: 'Absensi pulang (check-out) berhasil dicatat.' });
      await loadData();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal mencatat absensi pulang.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return null;

  const todayRecord = data?.todayRecord || null;

  return (
    <div className="space-y-6">
      {/* Live Clock + Self Check-In / Check-Out Panel */}
      <section className="grid gap-6 lg:grid-cols-12">
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <p className="text-xs font-semibold text-red-700">Waktu Saat Ini</p>
          <p className="mt-2 font-mono text-4xl font-extrabold tracking-tight text-slate-950 tabular-nums">
            {clock.toLocaleTimeString('id-ID', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            {clock.toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>

          <div className="mt-6 space-y-2 border-t border-slate-200 pt-5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nama Karyawan</span>
              <span className="font-semibold text-slate-900">{user.fullName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Peran</span>
              <span className="font-medium text-slate-800">{ROLE_LABELS[user.role]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">NIP / NUPTK</span>
              <span className="font-mono text-xs font-medium text-slate-800 tabular-nums">
                {user.nip || '—'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <h2 className="text-lg font-bold text-slate-950">Absensi Mandiri Harian</h2>
          <p className="mt-1 text-xs text-slate-500">
            Semua peran (Admin, Guru, dan Tenaga Kependidikan) mencatat kehadiran harian di sini.
          </p>

          {feedback && (
            <div
              className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                feedback.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {loading ? (
            <div className="mt-6 h-32 animate-pulse rounded-lg bg-slate-100" />
          ) : !todayRecord ? (
            <form onSubmit={handleCheckIn} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Status Kehadiran
                </label>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeAttendanceStatus[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setStatus(key)}
                      className={`rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                        status === key
                          ? 'border-red-700 bg-red-700 text-white'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-red-300'
                      }`}
                    >
                      {EMPLOYEE_STATUS_LABELS[key]}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-xs font-semibold text-slate-700">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  id="notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Hadir tepat waktu / Surat tugas dinas luar"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" />
                {submitting ? 'Menyimpan...' : 'Catat Absen Masuk'}
              </button>
            </form>
          ) : (
            <div className="mt-5 space-y-5">
              <div className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500">Status Hari Ini</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    {EMPLOYEE_STATUS_LABELS[todayRecord.status]}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jam Masuk</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatTime(todayRecord.checkInTime)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Jam Pulang</p>
                  <p className="mt-1 font-mono text-sm font-bold text-slate-900 tabular-nums">
                    {formatTime(todayRecord.checkOutTime)}
                  </p>
                </div>
              </div>

              {!todayRecord.checkOutTime ? (
                <div className="space-y-3">
                  <div>
                    <label htmlFor="checkoutNotes" className="block text-xs font-semibold text-slate-700">
                      Pembaruan Catatan Pulang (Opsional)
                    </label>
                    <input
                      id="checkoutNotes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Tambahkan ringkasan kegiatan hari ini jika diperlukan"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleCheckOut}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    {submitting ? 'Memproses...' : 'Catat Absen Pulang (Check-Out)'}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Clock className="h-4 w-4" />
                  <span>Presensi masuk dan pulang hari ini sudah lengkap.</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Personal Attendance History */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-base font-bold text-slate-950">Riwayat Presensi Pribadi</h3>
          <p className="text-xs text-slate-500">Daftar kehadiran harian akun Anda</p>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
          </div>
        ) : !data || data.records.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Belum ada catatan absensi. Silakan isi absensi masuk di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Jam Masuk</th>
                  <th className="px-6 py-3">Jam Pulang</th>
                  <th className="px-6 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {data.records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-900 tabular-nums">
                      {rec.date}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {EMPLOYEE_STATUS_LABELS[rec.status]}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTime(rec.checkInTime)}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTime(rec.checkOutTime)}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-600">{rec.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
