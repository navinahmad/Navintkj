import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import {
  EMPLOYEE_STATUS_LABELS,
  ROLE_LABELS,
  type EmployeeAttendanceRecord,
} from '../../types/app';

interface DashboardData {
  today: string;
  schemaReady?: boolean;
  myTodayAttendance: EmployeeAttendanceRecord | null;
  myRecentAttendance: EmployeeAttendanceRecord[];
  stats: {
    totalEmployees: number;
    employeesPresentToday: number;
    employeesAbsentToday: number;
    totalStudents: number;
    studentsPresentToday: number;
    studentsRecordedToday: number;
  };
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await apiRequest<DashboardData>('/api/dashboard');
        if (active) setData(res);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Gagal memuat dashboard.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Greeting & Today Self Attendance Banner */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold text-red-700">
              {ROLE_LABELS[user.role]}
              {user.jabatan ? ` · ${user.jabatan}` : ''}
            </p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              Selamat Datang, {user.fullName}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              {data ? formatDate(data.today) : 'Memuat tanggal...'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/app/absensi-karyawan"
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 transition-colors whitespace-nowrap shrink-0"
            >
              {data?.myTodayAttendance ? 'Lihat Absensi Hari Ini' : 'Isi Absensi Karyawan'}
              <ArrowRight className="h-4 w-4" />
            </Link>
            {(user.role === 'admin' || user.role === 'guru') && (
              <Link
                to="/app/absensi-siswa"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:border-red-300 hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
              >
                Input Absensi Siswa
              </Link>
            )}
          </div>
        </div>

        {/* Today's Personal Attendance Strip */}
        <div className="mt-6 grid gap-4 border-t border-slate-200 pt-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Status Presensi Pribadi Hari Ini</p>
            <div className="mt-1 flex items-center gap-2">
              {loading ? (
                <span className="text-sm text-slate-400">Memuat...</span>
              ) : data?.myTodayAttendance ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {EMPLOYEE_STATUS_LABELS[data.myTodayAttendance.status]}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-amber-700">
                  <Clock className="h-4 w-4" />
                  Belum Absen Masuk
                </span>
              )}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Jam Masuk</p>
            <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
              {formatTime(data?.myTodayAttendance?.checkInTime || null)}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Jam Pulang</p>
            <p className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
              {formatTime(data?.myTodayAttendance?.checkOutTime || null)}
            </p>
          </div>
        </div>
      </section>

      {data && data.schemaReady === false && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">Tabel Database Supabase Belum Dijalankan</p>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">
            Autentikasi Anda sudah aktif, tetapi tabel relasional (profiles, majors, classes,
            students, employee_attendance, student_attendance) belum dibuat di Supabase. Jalankan
            file <code className="font-mono font-semibold">supabase/schema.sql</code> dan{' '}
            <code className="font-mono font-semibold">supabase/seed.sql</code> pada{' '}
            <strong>Supabase Dashboard → SQL Editor</strong> agar fitur absensi dan data siswa dapat
            digunakan sepenuhnya.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Role-Specific Summary KPIs */}
      {!loading && data && (user.role === 'admin' || user.role === 'guru') && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {user.role === 'admin' && (
            <>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">Total Karyawan &amp; Guru</p>
                <p className="mt-2 font-mono text-3xl font-bold text-slate-950 tabular-nums">
                  {data.stats.totalEmployees}
                </p>
                <p className="mt-1 text-xs text-slate-500">Akun aktif terdaftar</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-medium text-slate-500">Karyawan Hadir Hari Ini</p>
                <p className="mt-2 font-mono text-3xl font-bold text-red-700 tabular-nums">
                  {data.stats.employeesPresentToday}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Izin/Sakit/Dinas: {data.stats.employeesAbsentToday}
                </p>
              </div>
            </>
          )}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Total Siswa Terdaftar</p>
            <p className="mt-2 font-mono text-3xl font-bold text-slate-950 tabular-nums">
              {data.stats.totalStudents}
            </p>
            <p className="mt-1 text-xs text-slate-500">6 Jurusan Aktif</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-medium text-slate-500">Siswa Hadir Hari Ini</p>
            <p className="mt-2 font-mono text-3xl font-bold text-emerald-700 tabular-nums">
              {data.stats.studentsPresentToday}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Tercatat hari ini: {data.stats.studentsRecordedToday} siswa
            </p>
          </div>
        </section>
      )}

      {/* Recent Personal Attendance Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h3 className="text-base font-bold text-slate-950">Riwayat Absensi Pribadi Terbaru</h3>
            <p className="text-xs text-slate-500">7 catatan kehadiran terakhir Anda</p>
          </div>
          <Link
            to="/app/absensi-karyawan"
            className="text-xs font-semibold text-red-700 hover:underline whitespace-nowrap"
          >
            Buka Absensi Karyawan
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
          </div>
        ) : !data || data.myRecentAttendance.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-medium text-slate-700">Belum ada riwayat absensi pribadi.</p>
            <p className="mt-1 text-xs text-slate-500">
              Catat kehadiran masuk Anda pada menu Absensi Karyawan.
            </p>
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
                {data.myRecentAttendance.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-900 tabular-nums">
                      {row.date}
                    </td>
                    <td className="px-6 py-3 font-medium text-slate-900">
                      {EMPLOYEE_STATUS_LABELS[row.status]}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTime(row.checkInTime)}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTime(row.checkOutTime)}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-600">
                      {row.notes || '—'}
                    </td>
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
