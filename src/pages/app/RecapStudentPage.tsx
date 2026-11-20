import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Search } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import {
  MAJOR_INFO,
  STUDENT_STATUS_LABELS,
  type MajorCode,
  type Student,
  type StudentAttendanceRecord,
} from '../../types/app';

function escapeCsv(val: string): string {
  const safe = val.replace(/"/g, '""');
  return `"${safe}"`;
}

export default function RecapStudentPage() {
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [majorFilter, setMajorFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<{ students: Student[] }>('/api/students')
      .then((res) => setStudents(res.students))
      .catch(() => {});
  }, []);

  const loadRecap = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (majorFilter !== 'all') params.set('major', majorFilter);
      if (classFilter !== 'all') params.set('className', classFilter);

      const res = await apiRequest<{ records: StudentAttendanceRecord[] }>(
        `/api/recap/student?${params.toString()}`
      );
      setRecords(res.records);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat rekap absensi siswa.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, majorFilter, classFilter]);

  useEffect(() => {
    loadRecap();
  }, [loadRecap]);

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.className));
    return Array.from(set).sort();
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter(
      (r) =>
        (r.studentName || '').toLowerCase().includes(q) ||
        (r.studentNis || '').toLowerCase().includes(q)
    );
  }, [records, search]);

  const stats = useMemo(() => {
    return {
      total: filtered.length,
      hadir: filtered.filter((r) => r.status === 'hadir').length,
      izin: filtered.filter((r) => r.status === 'izin').length,
      sakit: filtered.filter((r) => r.status === 'sakit').length,
      alpha: filtered.filter((r) => r.status === 'alpha').length,
    };
  }, [filtered]);

  function handleExportCsv() {
    const header = ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Jurusan', 'Status', 'Dicatat Oleh', 'Catatan'];
    const lines = filtered.map((r) =>
      [
        r.date,
        r.studentNis || '-',
        r.studentName || '-',
        r.studentClassName || '-',
        r.studentMajor || '-',
        STUDENT_STATUS_LABELS[r.status],
        r.recordedByName || '-',
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
    a.download = `rekap-absensi-siswa-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Rekap Absensi Siswa</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Riwayat kehadiran siswa per kelas dan jurusan untuk pemantauan guru dan admin.
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

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="stuStart" className="block text-xs font-semibold text-slate-700">
              Dari Tanggal
            </label>
            <input
              id="stuStart"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="stuEnd" className="block text-xs font-semibold text-slate-700">
              Sampai Tanggal
            </label>
            <input
              id="stuEnd"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="stuMajor" className="block text-xs font-semibold text-slate-700">
              Jurusan
            </label>
            <select
              id="stuMajor"
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            >
              <option value="all">Semua Jurusan</option>
              {(Object.keys(MAJOR_INFO) as MajorCode[]).map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stuClass" className="block text-xs font-semibold text-slate-700">
              Kelas
            </label>
            <select
              id="stuClass"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            >
              <option value="all">Semua Kelas</option>
              {classOptions.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="stuSearch" className="block text-xs font-semibold text-slate-700">
              Cari NIS / Nama
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="stuSearch"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nama / NIS..."
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
            <p className="text-xs text-slate-500">Alpha</p>
            <p className="mt-1 font-mono text-xl font-bold text-red-700 tabular-nums">{stats.alpha}</p>
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
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Belum ada catatan absensi siswa. Input absensi di menu Absensi Siswa terlebih dahulu.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">NIS</th>
                  <th className="px-5 py-3">Nama Siswa</th>
                  <th className="px-5 py-3">Kelas</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Pencatat</th>
                  <th className="px-5 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3 font-mono text-xs text-slate-900 tabular-nums">
                      {rec.date}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {rec.studentNis}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-950">{rec.studentName}</td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {rec.studentClassName} · {rec.studentMajor}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900">
                      {STUDENT_STATUS_LABELS[rec.status]}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">{rec.recordedByName}</td>
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
