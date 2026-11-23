import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const HERO_CAMPUS_IMAGE = '/src/assets/images/hero_campus_clean_1795061537214.jpg';

export default function LoginPage() {
  const { user, bootstrapStatus, login, register } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [nip, setNip] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    if (bootstrapStatus && !bootstrapStatus.hasUsers) {
      setMode('register');
    }
  }, [bootstrapStatus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email, password);
        navigate('/app/dashboard', { replace: true });
      } else {
        await register({
          email,
          password,
          fullName,
          nip,
          jabatan,
        });
        navigate('/app/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses akun.');
    } finally {
      setSubmitting(false);
    }
  }

  const isFirstBoot = bootstrapStatus ? !bootstrapStatus.hasUsers : false;

  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-12">
      {/* Left Brand Showcase */}
      <div className="relative hidden overflow-hidden bg-red-900 lg:col-span-6 lg:flex lg:flex-col lg:justify-between">
        {!imgError && (
          <img
            src={HERO_CAMPUS_IMAGE}
            alt="Kampus SMK Prima Unggul"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
        )}
        <div className="relative z-10 flex h-full flex-col justify-between bg-gradient-to-t from-red-950 via-red-900/75 to-red-950/70 p-12 text-white">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-red-100 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
            <h1 className="mt-10 text-3xl font-extrabold tracking-tight">SMK Prima Unggul</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-red-100">
              Portal terintegrasi untuk pencatatan kehadiran harian guru, tenaga kependidikan, dan
              siswa pada kompetensi keahlian TKJ, DKV, AK, BC, MPLB, dan BD.
            </p>
          </div>

          <div className="border-t border-red-800/80 pt-6">
            <p className="text-xs font-semibold text-red-200">Ketentuan Akses Sistem</p>
            <p className="mt-1.5 text-sm text-white">
              Pengguna pertama yang dibuat pada autentikasi otomatis memperoleh peran Administrator
              untuk mengelola seluruh akun guru, staf, dan data siswa.
            </p>
          </div>
        </div>
      </div>

      {/* Right Login / Register Form */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:col-span-6 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Link to="/" className="text-base font-extrabold text-red-700">
              SMK Prima Unggul
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-700"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Beranda
            </Link>
          </div>

          <h2 className="text-2xl font-extrabold tracking-tight text-slate-950">
            {mode === 'login' ? 'Masuk ke Portal Absensi' : 'Buat Akun Pengguna'}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {mode === 'login'
              ? 'Gunakan email dan kata sandi yang terdaftar di sistem autentikasi sekolah.'
              : isFirstBoot
                ? 'Belum ada pengguna terdaftar. Akun pertama ini otomatis menjadi Administrator.'
                : 'Daftarkan akun baru ke portal absensi SMK Prima Unggul.'}
          </p>

          {isFirstBoot && (
            <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-relaxed text-red-900">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
                <div>
                  <p className="font-bold">Inisialisasi Akun Administrator Pertama</p>
                  <p className="mt-0.5 text-red-800">
                    Karena belum ada pengguna di basis data, pendaftaran pertama ini akan otomatis
                    diberikan hak akses <strong>Admin</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {bootstrapStatus && bootstrapStatus.schemaReady === false && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-900">
              <p className="font-bold">Catatan Skema Database Supabase</p>
              <p className="mt-0.5 text-amber-800">
                Anda tetap dapat mendaftar atau masuk sekarang. Setelah login, jalankan{' '}
                <code className="font-mono font-semibold">supabase/schema.sql</code> di SQL Editor
                Supabase untuk mengaktifkan tabel absensi dan siswa.
              </p>
            </div>
          )}

          {/* Segmented Tab Switcher */}
          <div className="mt-6 grid grid-cols-2 gap-1 rounded-lg bg-slate-200/70 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`rounded-md py-2 text-xs font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isFirstBoot ? 'Daftar Admin Pertama' : 'Daftar Akun'}
            </button>
          </div>

          {error && (
            <div className="mt-5 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700">
                    Nama Lengkap
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Drs. Ahmad Suryana"
                    className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="nip" className="block text-xs font-semibold text-slate-700">
                      NIP / NUPTK
                    </label>
                    <input
                      id="nip"
                      type="text"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      placeholder="19850101201001"
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
                    />
                  </div>
                  <div>
                    <label htmlFor="jabatan" className="block text-xs font-semibold text-slate-700">
                      Jabatan / Unit
                    </label>
                    <input
                      id="jabatan"
                      type="text"
                      value={jabatan}
                      onChange={(e) => setJabatan(e.target.value)}
                      placeholder={isFirstBoot ? 'Kepala Tata Usaha / Admin' : 'Staf Sekolah'}
                      className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                Email Sekolah
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@smkprimaunggul.sch.id"
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700">
                Kata Sandi
              </label>
              <div className="relative mt-1.5">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-3.5 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-600/15"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-700 px-5 py-3 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60 transition-colors"
            >
              {submitting
                ? 'Memproses...'
                : mode === 'login'
                  ? 'Masuk ke Aplikasi'
                  : isFirstBoot
                    ? 'Buat Akun Admin Pertama'
                    : 'Daftar Sekarang'}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
