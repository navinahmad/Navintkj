import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCheck, Save, Search } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import {
  MAJOR_INFO,
  STUDENT_STATUS_LABELS,
  type MajorCode,
  type Student,
  type StudentAttendanceRecord,
  type StudentAttendanceStatus,
} from '../../types/app';

interface StudentAttendancePayload {
  date: string;
  students: Student[];
  records: StudentAttendanceRecord[];
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function StudentAttendancePage() {
  const [date, setDate] = useState(todayStr);
  const [students, setStudents] = useState<Student[]>([]);
  const [entries, setEntries] = useState<
    Record<string, { status: StudentAttendanceStatus; notes: string }>
  >({});
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedMajor, setSelectedMajor] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAttendance = useCallback(async (targetDate: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await apiRequest<StudentAttendancePayload>(
        `/api/attendance/student?date=${encodeURIComponent(targetDate)}`
      );
      setStudents(res.students);
      const recordMap = new Map(res.records.map((r) => [r.studentId, r]));
      const nextEntries: Record<string, { status: StudentAttendanceStatus; notes: string }> = {};
      for (const stu of res.students) {
        const rec = recordMap.get(stu.id);
        nextEntries[stu.id] = {
          status: rec?.status || 'hadir',
          notes: rec?.notes || '',
        };
      }
      setEntries(nextEntries);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat daftar siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAttendance(date);
  }, [date, loadAttendance]);

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.className));
    return Array.from(set).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (selectedClass !== 'all' && s.className !== selectedClass) return false;
      if (selectedMajor !== 'all' && s.major !== selectedMajor) return false;
      if (q && !s.name.toLowerCase().includes(q) && !s.nis.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [students, selectedClass, selectedMajor, search]);

  function updateStatus(studentId: string, status: StudentAttendanceStatus) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { notes: '' }), status },
    }));
  }

  function updateNotes(studentId: string, notes: string) {
    setEntries((prev) => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { status: 'hadir' }), notes },
    }));
  }

  function markVisiblePresent() {
    setEntries((prev) => {
      const next = { ...prev };
      for (const stu of filteredStudents) {
        next[stu.id] = { ...(next[stu.id] || { notes: '' }), status: 'hadir' };
      }
      return next;
    });
  }

  async function handleSave() {
    if (filteredStudents.length === 0) return;
    setSaving(true);
    setFeedback(null);
    try {
      const payload = filteredStudents.map((stu) => ({
        studentId: stu.id,
        status: entries[stu.id]?.status || 'hadir',
        notes: entries[stu.id]?.notes || '',
      }));

      await apiRequest('/api/attendance/student/bulk', {
        method: 'POST',
        body: JSON.stringify({ date, entries: payload }),
      });

      setFeedback({
        type: 'success',
        text: `Absensi ${payload.length} siswa pada tanggal ${date} berhasil disimpan.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.',
      });
    } finally {
      setSaving(false);
    }
  }

  const summary = useMemo(() => {
    const counts: Record<StudentAttendanceStatus, number> = {
      hadir: 0,
      izin: 0,
      sakit: 0,
      alpha: 0,
    };
    for (const stu of filteredStudents) {
      const st = entries[stu.id]?.status || 'hadir';
      counts[st] += 1;
    }
    return counts;
  }, [filteredStudents, entries]);

  return (
    <div className="space-y-6">
      {/* Toolbar Controls */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Pencatatan Absensi Siswa</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Pilih tanggal dan kelas, tentukan status kehadiran, lalu simpan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={markVisiblePresent}
              disabled={filteredStudents.length === 0}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-red-300 hover:text-red-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <CheckCheck className="h-4 w-4" />
              Tandai Semua Hadir
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || filteredStudents.length === 0}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Menyimpan...' : 'Simpan Absensi Siswa'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="attDate" className="block text-xs font-semibold text-slate-700">
              Tanggal Absensi
            </label>
            <input
              id="attDate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="filterMajor" className="block text-xs font-semibold text-slate-700">
              Jurusan
            </label>
            <select
              id="filterMajor"
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
            >
              <option value="all">Semua Jurusan</option>
              {(Object.keys(MAJOR_INFO) as MajorCode[]).map((code) => (
                <option key={code} value={code}>
                  {code} — {MAJOR_INFO[code].name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="filterClass" className="block text-xs font-semibold text-slate-700">
              Kelas
            </label>
            <select
              id="filterClass"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
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
            <label htmlFor="searchStu" className="block text-xs font-semibold text-slate-700">
              Cari NIS / Nama
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="searchStu"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama atau NIS..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Summary Line */}
        <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-4 text-xs text-slate-600">
          <span>
            Ditampilkan: <strong className="font-mono text-slate-950 tabular-nums">{filteredStudents.length}</strong> siswa
          </span>
          <span aria-hidden="true" className="text-slate-300">·</span>
          <span>
            Hadir: <strong className="font-mono text-emerald-700 tabular-nums">{summary.hadir}</strong>
          </span>
          <span>
            Izin: <strong className="font-mono text-amber-700 tabular-nums">{summary.izin}</strong>
          </span>
          <span>
            Sakit: <strong className="font-mono text-sky-700 tabular-nums">{summary.sakit}</strong>
          </span>
          <span>
            Alpha: <strong className="font-mono text-red-700 tabular-nums">{summary.alpha}</strong>
          </span>
        </div>

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
      </section>

      {/* Student Attendance Table */}
      <section className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
            <div className="h-10 animate-pulse rounded bg-slate-100" />
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-semibold text-slate-800">Tidak ada data siswa yang cocok.</p>
            <p className="mt-1 text-xs text-slate-500">
              Ubah filter pencarian atau minta Administrator menambahkan data siswa.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-5 py-3">NIS</th>
                  <th className="px-5 py-3">Nama Siswa</th>
                  <th className="px-5 py-3">Kelas / Jurusan</th>
                  <th className="px-5 py-3">Status Kehadiran</th>
                  <th className="px-5 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStudents.map((stu) => {
                  const currentStatus = entries[stu.id]?.status || 'hadir';
                  const currentNotes = entries[stu.id]?.notes || '';

                  return (
                    <tr key={stu.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                        {stu.nis}
                      </td>
                      <td className="px-5 py-3 font-semibold text-slate-950">{stu.name}</td>
                      <td className="px-5 py-3 text-xs text-slate-600">
                        {stu.className} · {stu.major}
                      </td>
                      <td className="px-5 py-3">
                        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                          {(Object.keys(STUDENT_STATUS_LABELS) as StudentAttendanceStatus[]).map(
                            (st) => {
                              const active = currentStatus === st;
                              let activeCls = 'bg-slate-900 text-white';
                              if (st === 'hadir') activeCls = 'bg-emerald-700 text-white';
                              if (st === 'izin') activeCls = 'bg-amber-600 text-white';
                              if (st === 'sakit') activeCls = 'bg-sky-700 text-white';
                              if (st === 'alpha') activeCls = 'bg-red-700 text-white';

                              return (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => updateStatus(stu.id, st)}
                                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                                    active
                                      ? activeCls
                                      : 'text-slate-600 hover:text-slate-950'
                                  }`}
                                >
                                  {STUDENT_STATUS_LABELS[st]}
                                </button>
                              );
                            }
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <input
                          type="text"
                          value={currentNotes}
                          onChange={(e) => updateNotes(stu.id, e.target.value)}
                          placeholder="Keterangan opsional..."
                          className="w-full min-w-[160px] rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-red-600 focus:outline-none"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
