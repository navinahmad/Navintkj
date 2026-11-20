import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Search, Trash2, UserPlus, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../lib/api';
import { ROLE_LABELS, type UserProfile, type UserRole } from '../../types/app';

export default function UserManagementPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ users: UserProfile[] }>('/api/admin/users');
      setUsers(res.users);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memuat daftar pengguna.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (
        q &&
        !u.fullName.toLowerCase().includes(q) &&
        !u.email.toLowerCase().includes(q) &&
        !(u.nip || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [users, search, roleFilter]);

  function openCreateModal() {
    setEditingUser(null);
    setFullName('');
    setEmail('');
    setNip('');
    setJabatan('');
    setRole('guru');
    setPassword('');
    setModalOpen(true);
  }

  function openEditModal(target: UserProfile) {
    setEditingUser(target);
    setFullName(target.fullName);
    setEmail(target.email);
    setNip(target.nip || '');
    setJabatan(target.jabatan || '');
    setRole(target.role);
    setPassword('');
    setModalOpen(true);
  }

  async function handleSaveUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      if (editingUser) {
        await apiRequest(`/api/admin/users/${editingUser.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            fullName,
            email,
            nip,
            jabatan,
            role,
            password: password.trim() ? password : undefined,
          }),
        });
        setFeedback({
          type: 'success',
          text: `Akun ${fullName} berhasil diperbarui dan disinkronkan dengan autentikasi.`,
        });
      } else {
        await apiRequest('/api/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            fullName,
            email,
            nip,
            jabatan,
            role,
            password,
          }),
        });
        setFeedback({
          type: 'success',
          text: `Pengguna ${fullName} berhasil dibuat dan disinkronkan dengan autentikasi.`,
        });
      }
      setModalOpen(false);
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menyimpan data pengguna.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleHardDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await apiRequest(`/api/admin/users/${deleteTarget.id}`, { method: 'DELETE' });
      setFeedback({
        type: 'success',
        text: `Akun ${deleteTarget.fullName} telah dihapus permanen (hard delete) hingga sistem autentikasi.`,
      });
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal menghapus pengguna.',
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
            <h2 className="text-lg font-bold text-slate-950">User Management</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Tambah, ubah, dan hapus permanen (hard delete) akun yang tersinkronisasi penuh dengan
              Supabase Authentication.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-xs font-semibold text-white hover:bg-red-800 transition-colors whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            Tambah User Baru
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="searchUser" className="block text-xs font-semibold text-slate-700">
              Cari Nama / Email / NIP
            </label>
            <div className="relative mt-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="searchUser"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Ketik nama, email, atau NIP..."
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="filterUserRole" className="block text-xs font-semibold text-slate-700">
              Filter Peran
            </label>
            <select
              id="filterUserRole"
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
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            Tidak ada pengguna ditemukan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-6 py-3">Nama Lengkap</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">NIP</th>
                  <th className="px-6 py-3">Peran &amp; Jabatan</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-semibold text-slate-950">
                        {u.fullName}
                        {isSelf && (
                          <span className="ml-2 text-xs font-medium text-red-700">(Anda)</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-700">{u.email}</td>
                      <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                        {u.nip || '—'}
                      </td>
                      <td className="px-6 py-3 text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">{ROLE_LABELS[u.role]}</span>
                        {u.jabatan ? (
                          <>
                            <span aria-hidden="true" className="mx-1.5 text-slate-300">·</span>
                            <span className="text-slate-500">{u.jabatan}</span>
                          </>
                        ) : null}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isSelf}
                            onClick={() => setDeleteTarget(u)}
                            title={
                              isSelf
                                ? 'Akun yang sedang aktif tidak dapat dihapus'
                                : 'Hapus permanen user hingga Supabase Auth'
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Create / Edit User Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <h3 className="text-base font-bold text-slate-950">
                {editingUser ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
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

            <form onSubmit={handleSaveUser} className="mt-5 space-y-4">
              <div>
                <label htmlFor="uName" className="block text-xs font-semibold text-slate-700">
                  Nama Lengkap
                </label>
                <input
                  id="uName"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Contoh: Sri Wahyuni, S.Pd."
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="uEmail" className="block text-xs font-semibold text-slate-700">
                    Email Autentikasi
                  </label>
                  <input
                    id="uEmail"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="guru@smkprimaunggul.sch.id"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="uRole" className="block text-xs font-semibold text-slate-700">
                    Peran (Role)
                  </label>
                  <select
                    id="uRole"
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                  >
                    <option value="admin">Administrator</option>
                    <option value="guru">Guru</option>
                    <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="uNip" className="block text-xs font-semibold text-slate-700">
                    NIP / NUPTK
                  </label>
                  <input
                    id="uNip"
                    type="text"
                    value={nip}
                    onChange={(e) => setNip(e.target.value)}
                    placeholder="19870202201501"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 font-mono text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="uJabatan" className="block text-xs font-semibold text-slate-700">
                    Jabatan / Mata Pelajaran
                  </label>
                  <input
                    id="uJabatan"
                    type="text"
                    value={jabatan}
                    onChange={(e) => setJabatan(e.target.value)}
                    placeholder="Guru Produktif TKJ"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="uPassword" className="block text-xs font-semibold text-slate-700">
                  {editingUser
                    ? 'Kata Sandi Baru (Kosongkan jika tidak diubah)'
                    : 'Kata Sandi Awal'}
                </label>
                <input
                  id="uPassword"
                  type="password"
                  required={!editingUser}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-red-600 focus:outline-none"
                />
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
                  {saving
                    ? 'Menyimpan...'
                    : editingUser
                      ? 'Simpan Perubahan'
                      : 'Buat Akun User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Hard Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-base font-bold text-slate-950">
              Hapus Permanen Akun Pengguna?
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Tindakan ini akan melakukan <strong>hard delete</strong> terhadap akun{' '}
              <strong>{deleteTarget.fullName}</strong> ({deleteTarget.email}) sampai ke sistem
              Supabase Authentication dan seluruh riwayat presensi terkait. Data tidak dapat
              dipulihkan.
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
                onClick={handleHardDelete}
                className="rounded-lg bg-red-700 px-4 py-2 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deleting ? 'Menghapus...' : 'Ya, Hard Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
