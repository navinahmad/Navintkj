import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import {
  EMPLOYEE_STATUS_LABELS,
  ROLE_LABELS,
  type EmployeeAttendanceRecord,
  type UserRole,
} from '../../types/app';

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeCsv(val: string): string {
  const safe = val.replace(/"/g, '""');
  return `"${safe}"`;
}

export default function RecapEmployeePage() {
  const [records, setRecords] = useState<EmployeeAttendanceRecord[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRecap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const res = await apiRequest<{ records: EmployeeAttendanceRecord[] }>(
        `/api/recap/employee?${params.toString()}`
      );
      setRecords(res.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap karyawan.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, roleFilter]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        (r.userName || '').toLowerCase().includes(q) ||
        (r.userNip || '').toLowerCase().includes(q)
    );
  }, [records, search]);

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      hadir: filtered.filter((r) => r.status === 'hadir').length,
      izin: filtered.filter((r) => r.status === 'izin').length,
      sakit: filtered.filter((r) => r.status === 'sakit').length,
      dinas: filtered.filter((r) => r.status === 'dinas_luar').length,
    };
  }, [filtered]);

  function handleExportCsv() {
    const header = ['Tanggal', 'NIP', 'Nama', 'Peran', 'Jabatan', 'Status', 'Jam Masuk', 'Jam Pulang', 'Catatan'];
    const lines = filtered.map((r) =>
      [
        r.date,
        r.userNip || '-',
        r.userName || '-',
        ROLE_LABELS[(r.userRole || 'tenaga_kependidikan') as UserRole],
        r.userJabatan || '-',
        EMPLOYEE_STATUS_LABELS[r.status],
        formatTime(r.checkInTime),
        formatTime(r.checkOutTime),
        r.notes || '',
      ]
        .map((c) => escapeCsv(String(c)))
        .join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rekap-absensi-karyawan-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Rekap Absensi Karyawan</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Laporan kehadiran seluruh Admin, Guru, dan Tenaga Kependidikan.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            Download CSV
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="empStart" className="block text-xs font-semibold text-slate-700">
              Dari Tanggal
            </label>
            <input
              id="empStart"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="empEnd" className="block text-xs font-semibold text-slate-700">
              Sampai Tanggal
            </label>
            <input
              id="empEnd"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="empRole" className="block text-xs font-semibold text-slate-700">
              Peran Karyawan
            </label>
            <select
              id="empRole"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            >
              <option value="all">Semua Peran</option>
              <option value="admin">Administrator</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>
          <div>
            <label htmlFor="empSearch" className="block text-xs font-semibold text-slate-700">
              Cari Nama / NIP
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="empSearch"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama atau NIP..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 sm:grid-cols-5">
          <div>
            <p className="text-xs text-slate-500">Total Catatan</p>
            <p className="mt-1 font-mono text-xl font-bold text-slate-950 tabular-nums">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Hadir</p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-700 tabular-nums">{stats.hadir}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Izin</p>
            <p className="mt-1 font-mono text-xl font-bold text-amber-700 tabular-nums">{stats.izin}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Sakit</p>
            <p className="mt-1 font-mono text-xl font-bold text-sky-700 tabular-nums">{stats.sakit}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Dinas Luar</p>
            <p className="mt-1 font-mono text-xl font-bold text-red-700 tabular-nums">{stats.dinas}</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada catatan absensi karyawan pada rentang filter ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Nama Karyawan</th>
                  <th className="px-5 py-3">NIP</th>
                  <th className="px-5 py-3">Peran</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Masuk</th>
                  <th className="px-5 py-3">Pulang</th>
                  <th className="px-5 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs text-slate-900 tabular-nums">
                      {rec.date}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-950">{rec.userName}</td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {rec.userNip || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {ROLE_LABELS[(rec.userRole || 'tenaga_kependidikan') as UserRole]}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {EMPLOYEE_STATUS_LABELS[rec.status]}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTime(rec.checkInTime)}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-700 tabular-nums">
                      {formatTime(rec.checkOutTime)}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{rec.notes || '—'}</td>
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
