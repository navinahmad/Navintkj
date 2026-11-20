import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, GraduationCap, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MAJOR_INFO, type MajorCode } from '../types/app';

const HERO_CAMPUS_IMAGE = '/src/assets/images/hero_campus_clean_1795061537214.jpg';
const TECH_MEDIA_IMAGE = '/src/assets/images/jurusan_tech_media_1795061522313.jpg';
const BUSINESS_OFFICE_IMAGE = '/src/assets/images/jurusan_business_office_1795061522172.jpg';

const TECH_MAJORS: MajorCode[] = ['TKJ', 'DKV', 'BC'];
const BUSINESS_MAJORS: MajorCode[] = ['AK', 'MPLB', 'BD'];

export default function LandingPage() {
  const { user } = useAuth();
  const [heroImgError, setHeroImgError] = useState(false);
  const [techImgError, setTechImgError] = useState(false);
  const [bizImgError, setBizImgError] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar Contract: Brand wordmark — 4 concise links — 1 primary CTA */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-red-700 whitespace-nowrap shrink-0"
          >
            SMK Prima Unggul
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#profil"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              Profil
            </a>
            <a
              href="#jurusan"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              Program Keahlian
            </a>
            <a
              href="#alur"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              Alur Sistem
            </a>
            <a
              href="#kontak"
              className="hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              Kontak
            </a>
          </nav>

          <div className="shrink-0">
            <Link
              to={user ? '/app/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Buka Aplikasi' : 'Masuk Portal'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section id="profil" className="border-b border-slate-200 bg-slate-50/70">
          <div className="mx-auto max-w-7xl px-6 py-16 lg:py-24">
            <div className="grid items-stretch gap-10 lg:grid-cols-12">
              <div className="flex flex-col justify-center lg:col-span-6">
                <p className="text-sm font-semibold text-red-700">
                  Sekolah Menengah Kejuruan Terakreditasi Unggul · Jakarta &amp; Sekitarnya
                </p>
                <h1
                  className="mt-4 font-extrabold tracking-tight text-slate-950"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)', lineHeight: 1.1, textWrap: 'balance' }}
                >
                  Pendidikan Vokasi Modern dengan Tata Kelola Kehadiran Terintegrasi
                </h1>
                <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-600">
                  SMK Prima Unggul mempersiapkan lulusan siap kerja dan berdaya saing global melalui
                  tiga bidang keahlian utama yang mencakup enam program jurusan strategis: TKJ, DKV,
                  AK, BC, MPLB, dan BD. Didukung sistem absensi siswa dan karyawan berbasis web secara
                  real-time.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <Link
                    to={user ? '/app/dashboard' : '/login'}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-6 py-3 text-sm font-semibold text-white hover:bg-red-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    {user ? 'Masuk ke Dashboard' : 'Masuk ke Portal Absensi'}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <a
                    href="#jurusan"
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:border-red-300 hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    Lihat Program Jurusan
                  </a>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="h-full min-h-[320px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {!heroImgError ? (
                    <img
                      src={HERO_CAMPUS_IMAGE}
                      alt="Kampus SMK Prima Unggul dengan arsitektur modern bernuansa merah dan ruang terbuka hijau"
                      referrerPolicy="no-referrer"
                      onError={() => setHeroImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-slate-100 p-8 text-center">
                      <Building2 className="h-12 w-12 text-red-700" />
                      <p className="mt-3 text-base font-bold text-slate-900">Kampus SMK Prima Unggul</p>
                      <p className="mt-1 text-sm text-slate-500">Lingkungan Belajar Vokasi Terpadu</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 4-column school proof strip */}
            <div className="mt-12 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white p-6">
                <p className="font-mono text-2xl font-bold text-red-700 tabular-nums">3 Bidang</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Rumpun Keahlian Vokasi</p>
                <p className="mt-1 text-xs text-slate-500">TI &amp; Jaringan, Desain &amp; Media, Bisnis &amp; Manajemen</p>
              </div>
              <div className="bg-white p-6">
                <p className="font-mono text-2xl font-bold text-slate-950 tabular-nums">6 Jurusan</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Kompetensi Keahlian</p>
                <p className="mt-1 text-xs text-slate-500">TKJ · DKV · AK · BC · MPLB · BD</p>
              </div>
              <div className="bg-white p-6">
                <p className="font-mono text-2xl font-bold text-slate-950 tabular-nums">3 Peran</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Akses Portal Terkontrol</p>
                <p className="mt-1 text-xs text-slate-500">Admin · Guru · Tenaga Kependidikan</p>
              </div>
              <div className="bg-white p-6">
                <p className="font-mono text-2xl font-bold text-slate-950 tabular-nums">100%</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">Rekap Kehadiran Digital</p>
                <p className="mt-1 text-xs text-slate-500">Tersinkronisasi langsung dengan basis data</p>
              </div>
            </div>
          </div>
        </section>

        {/* Program Keahlian Section */}
        <section id="jurusan" className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-red-700">Kurikulum Berbasis Industri</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                Tiga Bidang Keahlian &amp; Enam Jurusan Unggulan
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Setiap jurusan di SMK Prima Unggul dirancang bersama mitra industri untuk memadukan
                praktik laboratorium intensif, sertifikasi kompetensi, dan kedisiplinan kerja.
              </p>
            </div>

            {/* Rumpun Teknologi & Media Kreatif */}
            <div className="mt-14 grid items-stretch gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {!techImgError ? (
                    <img
                      src={TECH_MEDIA_IMAGE}
                      alt="Laboratorium Teknologi Jaringan, DKV, dan Studio Broadcasting SMK Prima Unggul"
                      referrerPolicy="no-referrer"
                      onError={() => setTechImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center bg-slate-100 p-8 text-center">
                      <GraduationCap className="h-10 w-10 text-red-700" />
                      <p className="mt-2 text-sm font-semibold text-slate-800">Laboratorium Teknologi &amp; Media</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between lg:col-span-7">
                <div>
                  <p className="text-xs font-semibold text-red-700">
                    Bidang Teknologi Informasi &amp; Desain Media
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-950">
                    Teknik Komputer, Desain Visual &amp; Penyiaran
                  </h3>
                </div>

                <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {TECH_MAJORS.map((code) => {
                    const info = MAJOR_INFO[code];
                    return (
                      <div key={code} className="p-5">
                        <div className="flex flex-wrap items-baseline gap-2 text-sm">
                          <span className="font-mono font-bold text-red-700">{info.code}</span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-bold text-slate-950">{info.name}</span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{info.cluster}</span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                          {info.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Rumpun Bisnis & Manajemen */}
            <div className="mt-14 grid items-stretch gap-8 lg:grid-cols-12">
              <div className="order-2 flex flex-col justify-between lg:order-1 lg:col-span-7">
                <div>
                  <p className="text-xs font-semibold text-red-700">
                    Bidang Bisnis, Keuangan &amp; Tata Kelola Perkantoran
                  </p>
                  <h3 className="mt-1 text-2xl font-bold text-slate-950">
                    Akuntansi, Layanan Bisnis &amp; Niaga Digital
                  </h3>
                </div>

                <div className="mt-6 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  {BUSINESS_MAJORS.map((code) => {
                    const info = MAJOR_INFO[code];
                    return (
                      <div key={code} className="p-5">
                        <div className="flex flex-wrap items-baseline gap-2 text-sm">
                          <span className="font-mono font-bold text-red-700">{info.code}</span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="font-bold text-slate-950">{info.name}</span>
                          <span aria-hidden="true" className="text-slate-300">·</span>
                          <span className="text-xs text-slate-500">{info.cluster}</span>
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                          {info.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="order-1 lg:order-2 lg:col-span-5">
                <div className="h-full min-h-[280px] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  {!bizImgError ? (
                    <img
                      src={BUSINESS_OFFICE_IMAGE}
                      alt="Laboratorium Akuntansi, Perkantoran Modern, dan Bisnis Digital SMK Prima Unggul"
                      referrerPolicy="no-referrer"
                      onError={() => setBizImgError(true)}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center bg-slate-100 p-8 text-center">
                      <Users className="h-10 w-10 text-red-700" />
                      <p className="mt-2 text-sm font-semibold text-slate-800">Laboratorium Bisnis &amp; Akuntansi</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Alur Sistem & Peran */}
        <section id="alur" className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-6 py-20">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-red-700">Alur Sistem Informasi Kehadiran</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Satu Portal untuk Tiga Peran Sekolah
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Hak akses menu disesuaikan otomatis berdasarkan peran pengguna pada sistem autentikasi.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-7">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-red-700">01. Administrator</span>
                  <ShieldCheck className="h-5 w-5 text-red-700" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-950">
                  Kendali Penuh Data &amp; Akun
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Akun pertama yang dibuat di sistem otomatis menjadi Administrator. Mengelola
                  master data siswa, memantau rekap absensi karyawan dan siswa, serta mengelola user
                  tersinkronisasi penuh dengan autentikasi termasuk penghapusan permanen.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-7">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-red-700">02. Guru</span>
                  <GraduationCap className="h-5 w-5 text-red-700" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-950">
                  Absensi Mandiri &amp; Kelas
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Guru mencatat kehadiran pribadi pada menu Absensi Karyawan, menginput kehadiran
                  siswa per kelas setiap hari di menu Absensi Siswa, serta meninjau rekapitulasi
                  kehadiran siswa untuk evaluasi akademik.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-7">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-red-700">03. Tenaga Kependidikan</span>
                  <CheckCircle2 className="h-5 w-5 text-red-700" />
                </div>
                <h3 className="mt-3 text-lg font-bold text-slate-950">
                  Presensi Staf Harian
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Staf tata usaha, pustakawan, teknisi laboratorium, dan tenaga kependidikan lainnya
                  melakukan absensi masuk dan pulang secara mandiri serta melihat riwayat presensi
                  pribadi melalui dashboard.
                </p>
              </div>
            </div>

            <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-xl border border-red-200 bg-red-700 p-8 text-white sm:flex-row sm:items-center">
              <div>
                <h3 className="text-xl font-bold">Siap Mencatat Kehadiran Hari Ini?</h3>
                <p className="mt-1 text-sm text-red-100">
                  Masuk menggunakan akun sekolah Anda atau daftarkan akun Administrator pertama.
                </p>
              </div>
              <Link
                to={user ? '/app/dashboard' : '/login'}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
              >
                {user ? 'Ke Portal /app' : 'Masuk Sekarang'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer id="kontak" className="bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-extrabold text-red-700">SMK Prima Unggul</p>
            <p className="mt-1 text-xs text-slate-500">
              Jl. Pendidikan Vokasi No. 45 · Program Keahlian TKJ, DKV, AK, BC, MPLB &amp; BD
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs text-slate-500">
            <a href="#profil" className="hover:text-slate-900">Profil Sekolah</a>
            <a href="#jurusan" className="hover:text-slate-900">Jurusan</a>
            <Link to="/login" className="hover:text-red-700 font-semibold text-slate-700">
              Portal Login
            </Link>
            <span>© {new Date().getFullYear()} SMK Prima Unggul</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
