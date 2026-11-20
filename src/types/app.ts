export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type MajorCode = 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';

export type EmployeeAttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'dinas_luar';

export type StudentAttendanceStatus = 'hadir' | 'izin' | 'sakit' | 'alpha';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  nip: string;
  jabatan: string;
  role: UserRole;
  createdAt: string;
}

export interface Student {
  id: string;
  nis: string;
  name: string;
  className: string;
  major: MajorCode;
  createdAt: string;
}

export interface EmployeeAttendanceRecord {
  id: string;
  userId: string;
  userName?: string;
  userNip?: string;
  userRole?: UserRole;
  userJabatan?: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: EmployeeAttendanceStatus;
  notes: string;
  createdAt: string;
}

export interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  studentNis?: string;
  studentName?: string;
  studentClassName?: string;
  studentMajor?: MajorCode;
  recordedBy: string;
  recordedByName?: string;
  date: string;
  status: StudentAttendanceStatus;
  notes: string;
  createdAt: string;
}

export interface BootstrapStatus {
  hasUsers: boolean;
  provider: 'supabase' | 'local';
  supabaseConfigured: boolean;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrator',
  guru: 'Guru',
  tenaga_kependidikan: 'Tenaga Kependidikan',
};

export const MAJOR_INFO: Record<
  MajorCode,
  { code: MajorCode; name: string; cluster: string; summary: string }
> = {
  TKJ: {
    code: 'TKJ',
    name: 'Teknik Komputer dan Jaringan',
    cluster: 'Teknologi Informasi & Jaringan',
    summary: 'Infrastruktur jaringan fiber optik, administrasi server Linux/Windows, keamanan siber, dan komputasi awan.',
  },
  DKV: {
    code: 'DKV',
    name: 'Desain Komunikasi Visual',
    cluster: 'Desain & Penyiaran Media',
    summary: 'Identitas merek, tipografi, ilustrasi digital, desain antarmuka, serta produksi grafis cetak dan interaktif.',
  },
  BC: {
    code: 'BC',
    name: 'Broadcasting dan Perfilman',
    cluster: 'Desain & Penyiaran Media',
    summary: 'Tata kamera studio, penyutradaraan, tata suara, penyiaran televisi/radio, serta penyuntingan video sinematik.',
  },
  AK: {
    code: 'AK',
    name: 'Akuntansi dan Keuangan Lembaga',
    cluster: 'Bisnis & Manajemen',
    summary: 'Pembukuan keuangan standar PSAK, perpajakan, audit internal, dan perangkat lunak akuntansi terkomputerisasi.',
  },
  MPLB: {
    code: 'MPLB',
    name: 'Manajemen Perkantoran dan Layanan Bisnis',
    cluster: 'Bisnis & Manajemen',
    summary: 'Tata kelola administrasi modern, korespondensi korporat, kearsipan digital, dan pelayanan pelanggan prima.',
  },
  BD: {
    code: 'BD',
    name: 'Bisnis Digital',
    cluster: 'Bisnis & Manajemen',
    summary: 'Pemasaran digital, manajemen niaga elektronik, analitik penjualan daring, dan pengembangan usaha rintisan.',
  },
};

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeAttendanceStatus, string> = {
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  dinas_luar: 'Dinas Luar',
};

export const STUDENT_STATUS_LABELS: Record<StudentAttendanceStatus, string> = {
  hadir: 'Hadir',
  izin: 'Izin',
  sakit: 'Sakit',
  alpha: 'Alpha',
};
