import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { MAJOR_INFO, type MajorCode, type Student } from '../../types/app';

export default function StudentsDataPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [majorFilter, setMajorFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nis, setNis] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [major, setMajor] = useState<MajorCode>('TKJ');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ students: Student[] }>('/api/students');
      setStudents(res.students);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat data siswa.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      if (majorFilter !== 'all' && s.major !== majorFilter) return false;
      if (
        q &&
        !s.name.toLowerCase().includes(q) &&
        !s.nis.toLowerCase().includes(q) &&
        !s.className.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [students, search, majorFilter]);

  function openCreateModal() {
    setEditingStudent(null);
    setNis('');
    setName('');
    setClassName('');
    setMajor('TKJ');
    setModalOpen(true);
  }

  function openEditModal(stu: Student) {
    setEditingStudent(stu);
    setNis(stu.nis);
    setName(stu.name);
    setClassName(stu.className);
    setMajor(stu.major);
    setModalOpen(true);
  }

  async function handleSaveStudent(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (editingStudent) {
        await apiRequest(`/api/students/${editingStudent.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ nis, name, className, major }),
        });
        setFeedback({ type: 'success', text: `Data siswa ${name} berhasil diperbarui.` });
      } else {
        await apiRequest('/api/students', {
          method: 'POST',
          body: JSON.stringify({ nis, name, className, major }),
        });
        setFeedback({ type: 'success', text: `Siswa ${name} berhasil ditambahkan.` });
      }
      setModalOpen(false);
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data siswa.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await apiRequest(`/api/students/${deleteTarget.id}`, { method: 'DELETE' });
      setFeedback({
        type: 'success',
        text: `Data siswa ${deleteTarget.name} berhasil dihapus.`,
      });
      setDeleteTarget(null);
      await loadStudents();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus data siswa.',
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Master Data Siswa</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Kelola daftar NIS, nama siswa, kelas, dan jurusan untuk absensi guru.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-800 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Tambah Siswa
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="searchStudent" className="block text-xs font-semibold text-slate-700">
              Cari NIS / Nama / Kelas
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="searchStudent"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik NIS, nama, atau kelas..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="filterStuMajor" className="block text-xs font-semibold text-slate-700">
              Filter Jurusan
            </label>
            <select
              id="filterStuMajor"
              value={majorFilter}
              onChange={(e) => setMajorFilter(e.target.value)}
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

      <section className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-3 p-6">
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
            <div className="h-9 animate-pulse rounded bg-slate-100" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Tidak ada data siswa ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">NIS</th>
                  <th className="px-6 py-3">Nama Siswa</th>
                  <th className="px-6 py-3">Kelas</th>
                  <th className="px-6 py-3">Jurusan</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((stu) => (
                  <tr key={stu.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs font-medium text-slate-800 tabular-nums">
                      {stu.nis}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-950">{stu.name}</td>
                    <td className="px-6 py-3 text-slate-700">{stu.className}</td>
                    <td className="px-6 py-3 text-xs text-slate-600">
                      <span className="font-mono font-bold text-red-700">{stu.major}</span>
                      <span aria-hidden="true" className="mx-1.5 text-slate-300">·</span>
                      <span>{MAJOR_INFO[stu.major]?.name}</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(stu)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(stu)}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-700 hover:text-white"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add / Edit Student Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-base font-bold text-slate-950">
                {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded p-1 text-slate-400 hover:text-slate-700"
                aria-label="Tutup modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="mt-5 space-y-4">
              <div>
                <label htmlFor="stuNis" className="block text-xs font-semibold text-slate-700">
                  Nomor Induk Siswa (NIS)
                </label>
                <input
                  id="stuNis"
                  type="text"
                  required
                  value={nis}
                  onChange={(e) => setNis(e.target.value)}
                  placeholder="20261004"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="stuName" className="block text-xs font-semibold text-slate-700">
                  Nama Lengkap Siswa
                </label>
                <input
                  id="stuName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Bima Sakti"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="stuMajorInput" className="block text-xs font-semibold text-slate-700">
                    Jurusan
                  </label>
                  <select
                    id="stuMajorInput"
                    value={major}
                    onChange={(e) => setMajor(e.target.value as MajorCode)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                  >
                    {(Object.keys(MAJOR_INFO) as MajorCode[]).map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="stuClassInput" className="block text-xs font-semibold text-slate-700">
                    Kelas
                  </label>
                  <input
                    id="stuClassInput"
                    type="text"
                    required
                    value={className}
                    onChange={(e) => setClassName(e.target.value)}
                    placeholder="Contoh: XI TKJ 1"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                >
                  {saving ? 'Menyimpan...' : editingStudent ? 'Simpan Perubahan' : 'Simpan Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Student Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-bold text-slate-950">Hapus Data Siswa?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Anda akan menghapus siswa <strong>{deleteTarget.name}</strong> (NIS{' '}
              <span className="font-mono">{deleteTarget.nis}</span>) beserta riwayat absensinya.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Siswa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
