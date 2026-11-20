import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ROLE_LABELS } from '../types/app';

const ROUTE_TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/absensi-karyawan': 'Absensi Karyawan',
  '/app/absensi-siswa': 'Absensi Siswa',
  '/app/rekap/karyawan': 'Rekap Absensi Karyawan',
  '/app/rekap/siswa': 'Rekap Absensi Siswa',
  '/app/data-siswa': 'Data Siswa',
  '/app/user-management': 'User Management',
};

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(true);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isGuru = user.role === 'guru';
  const showStudentAttendance = isAdmin || isGuru;
  const showRecapMenu = isAdmin || isGuru;

  const currentTitle = ROUTE_TITLES[location.pathname] || 'Portal Absensi';

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-700 text-white font-semibold'
        : 'text-slate-700 hover:bg-red-50 hover:text-red-800'
    }`;

  const subNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 rounded-lg py-2 pl-10 pr-3 text-sm transition-colors whitespace-nowrap ${
      isActive
        ? 'bg-red-50 font-semibold text-red-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <Link to="/app/dashboard" className="flex items-center gap-2.5 whitespace-nowrap">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-700 text-sm font-extrabold text-white">
            PU
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-950">
            SMK Prima Unggul
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Tutup menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3.5 py-5" aria-label="Menu Utama">
        <NavLink
          to="/app/dashboard"
          className={navLinkClass}
          onClick={() => setSidebarOpen(false)}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/app/absensi-karyawan"
          className={navLinkClass}
          onClick={() => setSidebarOpen(false)}
        >
          <UserCheck className="h-4 w-4 shrink-0" />
          <span>Absensi Karyawan</span>
        </NavLink>

        {showStudentAttendance && (
          <NavLink
            to="/app/absensi-siswa"
            className={navLinkClass}
            onClick={() => setSidebarOpen(false)}
          >
            <ClipboardCheck className="h-4 w-4 shrink-0" />
            <span>Absensi Siswa</span>
          </NavLink>
        )}

        {showRecapMenu && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setRecapOpen((prev) => !prev)}
              className="flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium text-slate-700 hover:bg-red-50 hover:text-red-800 transition-colors"
            >
              <span className="flex items-center gap-3 whitespace-nowrap">
                <FileSpreadsheet className="h-4 w-4 shrink-0" />
                <span>Rekap Absensi</span>
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                  recapOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {recapOpen && (
              <div className="mt-1 space-y-1">
                {isAdmin && (
                  <NavLink
                    to="/app/rekap/karyawan"
                    className={subNavLinkClass}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <span>Absensi Karyawan</span>
                  </NavLink>
                )}
                <NavLink
                  to="/app/rekap/siswa"
                  className={subNavLinkClass}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span>Absensi Siswa</span>
                </NavLink>
              </div>
            )}
          </div>
        )}

        {isAdmin && (
          <>
            <NavLink
              to="/app/data-siswa"
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span>Data Siswa</span>
            </NavLink>

            <NavLink
              to="/app/user-management"
              className={navLinkClass}
              onClick={() => setSidebarOpen(false)}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>User Management</span>
            </NavLink>
          </>
        )}
      </nav>

      <div className="border-t border-slate-200 px-4 py-4">
        <p className="truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
        <p className="mt-0.5 truncate text-xs text-slate-500">
          {ROLE_LABELS[user.role]}
          {user.nip ? ` · ${user.nip}` : ''}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Left Sidebar */}
      <aside className="hidden w-[260px] shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 w-[260px] max-w-[85vw] border-r border-slate-200 bg-white">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar with Page Title on Left and Logout Button on Top-Right */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-200 p-2 text-slate-700 hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu samping"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">Portal</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <h1 className="truncate font-bold text-slate-950">{currentTitle}</h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-semibold text-slate-900">{user.fullName}</p>
              <p className="text-xs text-slate-500">{ROLE_LABELS[user.role]}</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-700 hover:bg-red-700 hover:text-white transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
