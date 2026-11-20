import 'dotenv/config';
import express, { type Request, type Response, type NextFunction } from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServer as createViteServer } from 'vite';

type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';
type MajorCode = 'TKJ' | 'DKV' | 'AK' | 'BC' | 'MPLB' | 'BD';
type EmployeeStatus = 'hadir' | 'izin' | 'sakit' | 'dinas_luar';
type StudentStatus = 'hadir' | 'izin' | 'sakit' | 'alpha';

interface UserRecord {
  id: string;
  email: string;
  passwordHash?: string;
  fullName: string;
  nip: string;
  jabatan: string;
  role: UserRole;
  createdAt: string;
}

interface StudentRecord {
  id: string;
  nis: string;
  name: string;
  className: string;
  major: MajorCode;
  createdAt: string;
}

interface EmployeeAttendanceRecord {
  id: string;
  userId: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: EmployeeStatus;
  notes: string;
  createdAt: string;
}

interface StudentAttendanceRecord {
  id: string;
  studentId: string;
  recordedBy: string;
  date: string;
  status: StudentStatus;
  notes: string;
  createdAt: string;
}

interface LocalDatabase {
  users: UserRecord[];
  students: StudentRecord[];
  employeeAttendance: EmployeeAttendanceRecord[];
  studentAttendance: StudentAttendanceRecord[];
}

interface AuthedRequest extends Request {
  user?: UserRecord;
}

const PORT = 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);

const supabaseAdmin: SupabaseClient | null = useSupabase
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

const supabasePublic: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'smk_db.json');
const TOKEN_SECRET = process.env.SESSION_SECRET || 'smk-prima-unggul-local-secret-key';

const VALID_ROLES: UserRole[] = ['admin', 'guru', 'tenaga_kependidikan'];
const VALID_MAJORS: MajorCode[] = ['TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD'];
const VALID_EMP_STATUS: EmployeeStatus[] = ['hadir', 'izin', 'sakit', 'dinas_luar'];
const VALID_STU_STATUS: StudentStatus[] = ['hadir', 'izin', 'sakit', 'alpha'];

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function seedInitialStudents(): StudentRecord[] {
  const now = new Date().toISOString();
  const seeds: Array<{ nis: string; name: string; className: string; major: MajorCode }> = [
    { nis: '20261001', name: 'Aditya Pratama', className: 'XI TKJ 1', major: 'TKJ' },
    { nis: '20261002', name: 'Nabila Putri Rahayu', className: 'XI TKJ 1', major: 'TKJ' },
    { nis: '20261003', name: 'Rizky Maulana', className: 'XI TKJ 1', major: 'TKJ' },
    { nis: '20262001', name: 'Siti Aisyah', className: 'XI DKV 1', major: 'DKV' },
    { nis: '20262002', name: 'Bagas Darmawan', className: 'XI DKV 1', major: 'DKV' },
    { nis: '20262003', name: 'Keisha Maharani', className: 'XI DKV 1', major: 'DKV' },
    { nis: '20263001', name: 'Dina Febrianti', className: 'XI AK 1', major: 'AK' },
    { nis: '20263002', name: 'Hendra Wijaya', className: 'XI AK 1', major: 'AK' },
    { nis: '20263003', name: 'Rani Puspitasari', className: 'XI AK 1', major: 'AK' },
    { nis: '20264001', name: 'Fajar Nugroho', className: 'XI BC 1', major: 'BC' },
    { nis: '20264002', name: 'Tara Melati', className: 'XI BC 1', major: 'BC' },
    { nis: '20264003', name: 'Galih Santoso', className: 'XI BC 1', major: 'BC' },
    { nis: '20265001', name: 'Intan Permatasari', className: 'XI MPLB 1', major: 'MPLB' },
    { nis: '20265002', name: 'Yusuf Ramadhan', className: 'XI MPLB 1', major: 'MPLB' },
    { nis: '20265003', name: 'Dewi Lestari', className: 'XI MPLB 1', major: 'MPLB' },
    { nis: '20266001', name: 'Alvin Kurniawan', className: 'XI BD 1', major: 'BD' },
    { nis: '20266002', name: 'Shinta Anggraini', className: 'XI BD 1', major: 'BD' },
    { nis: '20266003', name: 'Farhan Hidayat', className: 'XI BD 1', major: 'BD' },
  ];

  return seeds.map((s) => ({
    id: crypto.randomUUID(),
    ...s,
    createdAt: now,
  }));
}

function readLocalDb(): LocalDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const initial: LocalDatabase = {
      users: [],
      students: seedInitialStudents(),
      employeeAttendance: [],
      studentAttendance: [],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(raw) as LocalDatabase;
}

function writeLocalDb(db: LocalDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derived, 'hex'));
}

function signLocalToken(userId: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp })).toString('base64url');
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

function verifyLocalToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('base64url');
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8')) as {
      sub: string;
      exp: number;
    };
    if (decoded.exp < Date.now()) return null;
    return decoded.sub;
  } catch {
    return null;
  }
}

function sanitizeUser(u: UserRecord): Omit<UserRecord, 'passwordHash'> {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    nip: u.nip || '',
    jabatan: u.jabatan || '',
    role: u.role,
    createdAt: u.createdAt,
  };
}

function mapSupabaseProfile(row: Record<string, unknown>): UserRecord {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: String(row.full_name || ''),
    nip: String(row.nip || ''),
    jabatan: String(row.jabatan || ''),
    role: (VALID_ROLES.includes(row.role as UserRole) ? row.role : 'tenaga_kependidikan') as UserRole,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

async function resolveAuthedUser(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token) {
      res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan login kembali.' });
      return;
    }

    if (useSupabase && supabaseAdmin) {
      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
      if (userErr || !userData?.user) {
        res.status(401).json({ error: 'Token sesi tidak valid atau sudah kedaluwarsa.' });
        return;
      }

      const authUser = userData.user;
      let { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!profile) {
        const { count } = await supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        const assignedRole: UserRole =
          (count ?? 0) === 0
            ? 'admin'
            : ((authUser.user_metadata?.role as UserRole) || 'tenaga_kependidikan');

        const { data: inserted, error: insErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: authUser.id,
            email: authUser.email,
            full_name:
              (authUser.user_metadata?.full_name as string) ||
              authUser.email?.split('@')[0] ||
              'Pengguna',
            nip: (authUser.user_metadata?.nip as string) || '',
            jabatan: (authUser.user_metadata?.jabatan as string) || '',
            role: VALID_ROLES.includes(assignedRole) ? assignedRole : 'tenaga_kependidikan',
          })
          .select('*')
          .single();

        if (insErr) {
          res.status(500).json({ error: insErr.message });
          return;
        }
        profile = inserted;
      }

      req.user = mapSupabaseProfile(profile as Record<string, unknown>);
      next();
      return;
    }

    const userId = verifyLocalToken(token);
    if (!userId) {
      res.status(401).json({ error: 'Token sesi tidak valid atau sudah kedaluwarsa.' });
      return;
    }
    const db = readLocalDb();
    const found = db.users.find((u) => u.id === userId);
    if (!found) {
      res.status(401).json({ error: 'Akun tidak ditemukan atau telah dihapus.' });
      return;
    }
    req.user = found;
    next();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Kesalahan autentikasi.' });
  }
}

function requireRole(roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki hak akses untuk fitur ini.' });
      return;
    }
    next();
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // =========================================================================
  // AUTHENTICATION & BOOTSTRAP ROUTES
  // =========================================================================
  app.get('/api/auth/bootstrap-status', async (_req, res) => {
    try {
      if (useSupabase && supabaseAdmin) {
        const { count, error } = await supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.json({
          hasUsers: (count ?? 0) > 0,
          provider: 'supabase',
          supabaseConfigured: true,
        });
        return;
      }

      const db = readLocalDb();
      res.json({
        hasUsers: db.users.length > 0,
        provider: 'local',
        supabaseConfigured: false,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memeriksa status sistem.' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, fullName, nip, jabatan } = req.body as {
        email?: string;
        password?: string;
        fullName?: string;
        nip?: string;
        jabatan?: string;
      };

      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (fullName || '').trim();
      if (!cleanEmail || !password || !cleanName) {
        res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        return;
      }

      if (useSupabase && supabaseAdmin) {
        const { count } = await supabaseAdmin
          .from('profiles')
          .select('id', { count: 'exact', head: true });
        const isFirstUser = (count ?? 0) === 0;
        const assignedRole: UserRole = isFirstUser ? 'admin' : 'tenaga_kependidikan';

        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            nip: (nip || '').trim(),
            jabatan: (jabatan || '').trim(),
            role: assignedRole,
          },
        });

        if (createErr || !created.user) {
          res.status(400).json({ error: createErr?.message || 'Gagal membuat akun di Supabase Auth.' });
          return;
        }

        const { data: profileRow, error: profErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: created.user.id,
            email: cleanEmail,
            full_name: cleanName,
            nip: (nip || '').trim(),
            jabatan: (jabatan || '').trim(),
            role: assignedRole,
          })
          .select('*')
          .single();

        if (profErr) {
          res.status(500).json({ error: profErr.message });
          return;
        }

        let accessToken: string | null = null;
        if (supabasePublic) {
          const { data: signInData } = await supabasePublic.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });
          accessToken = signInData.session?.access_token || null;
        }

        res.status(201).json({
          user: mapSupabaseProfile(profileRow as Record<string, unknown>),
          token: accessToken,
          isFirstAdmin: isFirstUser,
        });
        return;
      }

      const db = readLocalDb();
      if (db.users.some((u) => u.email === cleanEmail)) {
        res.status(409).json({ error: 'Email sudah terdaftar dalam sistem.' });
        return;
      }

      const isFirstUser = db.users.length === 0;
      const newUser: UserRecord = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        passwordHash: hashPassword(password),
        fullName: cleanName,
        nip: (nip || '').trim(),
        jabatan: (jabatan || '').trim() || (isFirstUser ? 'Administrator Sistem' : 'Staf Sekolah'),
        role: isFirstUser ? 'admin' : 'tenaga_kependidikan',
        createdAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      writeLocalDb(db);

      const token = signLocalToken(newUser.id);
      res.status(201).json({
        user: sanitizeUser(newUser),
        token,
        isFirstAdmin: isFirstUser,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal mendaftarkan akun.' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string };
      const cleanEmail = (email || '').trim().toLowerCase();
      if (!cleanEmail || !password) {
        res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
        return;
      }

      if (useSupabase && supabasePublic && supabaseAdmin) {
        const { data, error } = await supabasePublic.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error || !data.session || !data.user) {
          res.status(401).json({ error: 'Email atau kata sandi tidak valid.' });
          return;
        }

        let { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        if (!profile) {
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true });
          const assignedRole: UserRole = (count ?? 0) === 0 ? 'admin' : 'tenaga_kependidikan';
          const { data: upserted } = await supabaseAdmin
            .from('profiles')
            .upsert({
              id: data.user.id,
              email: cleanEmail,
              full_name: (data.user.user_metadata?.full_name as string) || cleanEmail.split('@')[0],
              nip: (data.user.user_metadata?.nip as string) || '',
              jabatan: (data.user.user_metadata?.jabatan as string) || '',
              role: assignedRole,
            })
            .select('*')
            .single();
          profile = upserted;
        }

        res.json({
          user: mapSupabaseProfile(profile as Record<string, unknown>),
          token: data.session.access_token,
        });
        return;
      }

      const db = readLocalDb();
      const found = db.users.find((u) => u.email === cleanEmail);
      if (!found || !found.passwordHash || !verifyPassword(password, found.passwordHash)) {
        res.status(401).json({ error: 'Email atau kata sandi tidak valid.' });
        return;
      }

      const token = signLocalToken(found.id);
      res.json({
        user: sanitizeUser(found),
        token,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal masuk ke sistem.' });
    }
  });

  app.get('/api/auth/me', resolveAuthedUser, (req: AuthedRequest, res) => {
    res.json({ user: sanitizeUser(req.user!) });
  });

  // =========================================================================
  // DASHBOARD SUMMARY
  // =========================================================================
  app.get('/api/dashboard', resolveAuthedUser, async (req: AuthedRequest, res) => {
    try {
      const today = getTodayDateString();
      const currentUser = req.user!;

      if (useSupabase && supabaseAdmin) {
        const [{ data: myToday }, { data: myHistory }, { count: studentCount }, { count: userCount }, { data: todayEmp }, { data: todayStu }] =
          await Promise.all([
            supabaseAdmin
              .from('employee_attendance')
              .select('*')
              .eq('user_id', currentUser.id)
              .eq('date', today)
              .maybeSingle(),
            supabaseAdmin
              .from('employee_attendance')
              .select('*')
              .eq('user_id', currentUser.id)
              .order('date', { ascending: false })
              .limit(7),
            supabaseAdmin.from('students').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('profiles').select('id', { count: 'exact', head: true }),
            supabaseAdmin.from('employee_attendance').select('status').eq('date', today),
            supabaseAdmin.from('student_attendance').select('status').eq('date', today),
          ]);

        res.json({
          today,
          myTodayAttendance: myToday
            ? {
                id: myToday.id,
                userId: myToday.user_id,
                date: myToday.date,
                checkInTime: myToday.check_in_time,
                checkOutTime: myToday.check_out_time,
                status: myToday.status,
                notes: myToday.notes || '',
                createdAt: myToday.created_at,
              }
            : null,
          myRecentAttendance: (myHistory || []).map((row) => ({
            id: row.id,
            userId: row.user_id,
            date: row.date,
            checkInTime: row.check_in_time,
            checkOutTime: row.check_out_time,
            status: row.status,
            notes: row.notes || '',
            createdAt: row.created_at,
          })),
          stats: {
            totalEmployees: userCount ?? 0,
            employeesPresentToday: (todayEmp || []).filter((r) => r.status === 'hadir').length,
            employeesAbsentToday: (todayEmp || []).filter((r) => r.status !== 'hadir').length,
            totalStudents: studentCount ?? 0,
            studentsPresentToday: (todayStu || []).filter((r) => r.status === 'hadir').length,
            studentsRecordedToday: (todayStu || []).length,
          },
        });
        return;
      }

      const db = readLocalDb();
      const myToday = db.employeeAttendance.find(
        (a) => a.userId === currentUser.id && a.date === today
      );
      const myHistory = db.employeeAttendance
        .filter((a) => a.userId === currentUser.id)
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 7);

      const todayEmp = db.employeeAttendance.filter((a) => a.date === today);
      const todayStu = db.studentAttendance.filter((a) => a.date === today);

      res.json({
        today,
        myTodayAttendance: myToday || null,
        myRecentAttendance: myHistory,
        stats: {
          totalEmployees: db.users.length,
          employeesPresentToday: todayEmp.filter((r) => r.status === 'hadir').length,
          employeesAbsentToday: todayEmp.filter((r) => r.status !== 'hadir').length,
          totalStudents: db.students.length,
          studentsPresentToday: todayStu.filter((r) => r.status === 'hadir').length,
          studentsRecordedToday: todayStu.length,
        },
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat dashboard.' });
    }
  });

  // =========================================================================
  // SELF-SERVICE EMPLOYEE ATTENDANCE (ALL ROLES)
  // =========================================================================
  app.get('/api/attendance/employee/me', resolveAuthedUser, async (req: AuthedRequest, res) => {
    try {
      const currentUser = req.user!;
      const today = getTodayDateString();

      if (useSupabase && supabaseAdmin) {
        const { data, error } = await supabaseAdmin
          .from('employee_attendance')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: false })
          .limit(30);
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        const records = (data || []).map((r) => ({
          id: r.id,
          userId: r.user_id,
          date: r.date,
          checkInTime: r.check_in_time,
          checkOutTime: r.check_out_time,
          status: r.status,
          notes: r.notes || '',
          createdAt: r.created_at,
        }));
        res.json({
          today,
          todayRecord: records.find((r) => r.date === today) || null,
          records,
        });
        return;
      }

      const db = readLocalDb();
      const records = db.employeeAttendance
        .filter((a) => a.userId === currentUser.id)
        .sort((a, b) => b.date.localeCompare(a.date));

      res.json({
        today,
        todayRecord: records.find((r) => r.date === today) || null,
        records,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat absensi karyawan.' });
    }
  });

  app.post('/api/attendance/employee/check-in', resolveAuthedUser, async (req: AuthedRequest, res) => {
    try {
      const currentUser = req.user!;
      const today = getTodayDateString();
      const nowIso = new Date().toISOString();
      const { status, notes } = req.body as { status?: EmployeeStatus; notes?: string };
      const cleanStatus: EmployeeStatus = VALID_EMP_STATUS.includes(status as EmployeeStatus)
        ? (status as EmployeeStatus)
        : 'hadir';
      const cleanNotes = (notes || '').trim();

      if (useSupabase && supabaseAdmin) {
        const { data: existing } = await supabaseAdmin
          .from('employee_attendance')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('date', today)
          .maybeSingle();

        if (existing) {
          res.status(409).json({ error: 'Anda sudah mencatat kehadiran masuk hari ini.' });
          return;
        }

        const { data, error } = await supabaseAdmin
          .from('employee_attendance')
          .insert({
            user_id: currentUser.id,
            date: today,
            check_in_time: nowIso,
            status: cleanStatus,
            notes: cleanNotes,
          })
          .select('*')
          .single();

        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        res.status(201).json({
          record: {
            id: data.id,
            userId: data.user_id,
            date: data.date,
            checkInTime: data.check_in_time,
            checkOutTime: data.check_out_time,
            status: data.status,
            notes: data.notes || '',
            createdAt: data.created_at,
          },
        });
        return;
      }

      const db = readLocalDb();
      const existing = db.employeeAttendance.find(
        (a) => a.userId === currentUser.id && a.date === today
      );
      if (existing) {
        res.status(409).json({ error: 'Anda sudah mencatat kehadiran masuk hari ini.' });
        return;
      }

      const record: EmployeeAttendanceRecord = {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        date: today,
        checkInTime: nowIso,
        checkOutTime: null,
        status: cleanStatus,
        notes: cleanNotes,
        createdAt: nowIso,
      };

      db.employeeAttendance.push(record);
      writeLocalDb(db);
      res.status(201).json({ record });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan absen masuk.' });
    }
  });

  app.post('/api/attendance/employee/check-out', resolveAuthedUser, async (req: AuthedRequest, res) => {
    try {
      const currentUser = req.user!;
      const today = getTodayDateString();
      const nowIso = new Date().toISOString();
      const { notes } = req.body as { notes?: string };

      if (useSupabase && supabaseAdmin) {
        const { data: existing, error: findErr } = await supabaseAdmin
          .from('employee_attendance')
          .select('*')
          .eq('user_id', currentUser.id)
          .eq('date', today)
          .maybeSingle();

        if (findErr || !existing) {
          res.status(404).json({ error: 'Belum ada absensi masuk hari ini.' });
          return;
        }
        if (existing.check_out_time) {
          res.status(409).json({ error: 'Anda sudah melakukan check-out hari ini.' });
          return;
        }

        const updatedNotes = (notes || '').trim() || existing.notes || '';
        const { data, error } = await supabaseAdmin
          .from('employee_attendance')
          .update({ check_out_time: nowIso, notes: updatedNotes })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        res.json({
          record: {
            id: data.id,
            userId: data.user_id,
            date: data.date,
            checkInTime: data.check_in_time,
            checkOutTime: data.check_out_time,
            status: data.status,
            notes: data.notes || '',
            createdAt: data.created_at,
          },
        });
        return;
      }

      const db = readLocalDb();
      const record = db.employeeAttendance.find(
        (a) => a.userId === currentUser.id && a.date === today
      );
      if (!record) {
        res.status(404).json({ error: 'Belum ada absensi masuk hari ini.' });
        return;
      }
      if (record.checkOutTime) {
        res.status(409).json({ error: 'Anda sudah melakukan check-out hari ini.' });
        return;
      }

      record.checkOutTime = nowIso;
      if ((notes || '').trim()) {
        record.notes = notes!.trim();
      }
      writeLocalDb(db);
      res.json({ record });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan check-out.' });
    }
  });

  // =========================================================================
  // STUDENTS MASTER DATA (READ: ADMIN & GURU, WRITE: ADMIN ONLY)
  // =========================================================================
  app.get('/api/students', resolveAuthedUser, requireRole(['admin', 'guru']), async (_req, res) => {
    try {
      if (useSupabase && supabaseAdmin) {
        const { data, error } = await supabaseAdmin
          .from('students')
          .select('id, nis, name, class_id, created_at, classes!inner(id, name, major_code)')
          .order('name', { ascending: true });
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        const mapped = (data || [])
          .map((s) => {
            const cls = (Array.isArray(s.classes) ? s.classes[0] : s.classes) as
              | { id?: string; name?: string; major_code?: MajorCode }
              | null;
            return {
              id: s.id,
              nis: s.nis,
              name: s.name,
              className: String(cls?.name || '-'),
              major: (cls?.major_code || 'TKJ') as MajorCode,
              createdAt: s.created_at,
            };
          })
          .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

        res.json({ students: mapped });
        return;
      }

      const db = readLocalDb();
      const sorted = [...db.students].sort((a, b) =>
        a.className.localeCompare(b.className) || a.name.localeCompare(b.name)
      );
      res.json({ students: sorted });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat data siswa.' });
    }
  });

  app.post('/api/students', resolveAuthedUser, requireRole(['admin']), async (req, res) => {
    try {
      const { nis, name, className, major } = req.body as {
        nis?: string;
        name?: string;
        className?: string;
        major?: MajorCode;
      };
      const cleanNis = (nis || '').trim();
      const cleanName = (name || '').trim();
      const cleanClass = (className || '').trim();
      const cleanMajor = VALID_MAJORS.includes(major as MajorCode) ? (major as MajorCode) : null;

      if (!cleanNis || !cleanName || !cleanClass || !cleanMajor) {
        res.status(400).json({ error: 'NIS, nama siswa, kelas, dan jurusan wajib diisi.' });
        return;
      }

      if (useSupabase && supabaseAdmin) {
        const { data: existingClass } = await supabaseAdmin
          .from('classes')
          .select('id')
          .eq('name', cleanClass)
          .maybeSingle();

        let classId = existingClass?.id as string | undefined;
        if (!classId) {
          const gradeLevel = cleanClass.split(' ')[0] || 'XI';
          const { data: createdClass, error: clsErr } = await supabaseAdmin
            .from('classes')
            .insert({ name: cleanClass, major_code: cleanMajor, grade_level: gradeLevel })
            .select('id')
            .single();
          if (clsErr || !createdClass) {
            res.status(400).json({ error: clsErr?.message || 'Gagal menyiapkan relasi kelas.' });
            return;
          }
          classId = createdClass.id;
        }

        const { data, error } = await supabaseAdmin
          .from('students')
          .insert({
            nis: cleanNis,
            name: cleanName,
            class_id: classId,
          })
          .select('id, nis, name, created_at, classes!inner(name, major_code)')
          .single();

        if (error || !data) {
          res.status(400).json({ error: error?.message || 'Gagal menambah siswa.' });
          return;
        }

        const cls = (Array.isArray(data.classes) ? data.classes[0] : data.classes) as
          | { name?: string; major_code?: MajorCode }
          | null;

        res.status(201).json({
          student: {
            id: data.id,
            nis: data.nis,
            name: data.name,
            className: String(cls?.name || cleanClass),
            major: (cls?.major_code || cleanMajor) as MajorCode,
            createdAt: data.created_at,
          },
        });
        return;
      }

      const db = readLocalDb();
      if (db.students.some((s) => s.nis === cleanNis)) {
        res.status(409).json({ error: `Siswa dengan NIS ${cleanNis} sudah terdaftar.` });
        return;
      }

      const student: StudentRecord = {
        id: crypto.randomUUID(),
        nis: cleanNis,
        name: cleanName,
        className: cleanClass,
        major: cleanMajor,
        createdAt: new Date().toISOString(),
      };
      db.students.push(student);
      writeLocalDb(db);
      res.status(201).json({ student });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menambah siswa.' });
    }
  });

  app.patch('/api/students/:id', resolveAuthedUser, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const { nis, name, className, major } = req.body as {
        nis?: string;
        name?: string;
        className?: string;
        major?: MajorCode;
      };

      const cleanNis = (nis || '').trim();
      const cleanName = (name || '').trim();
      const cleanClass = (className || '').trim();
      const cleanMajor = VALID_MAJORS.includes(major as MajorCode) ? (major as MajorCode) : null;

      if (!cleanNis || !cleanName || !cleanClass || !cleanMajor) {
        res.status(400).json({ error: 'NIS, nama siswa, kelas, dan jurusan wajib diisi.' });
        return;
      }

      if (useSupabase && supabaseAdmin) {
        const { data: existingClass } = await supabaseAdmin
          .from('classes')
          .select('id')
          .eq('name', cleanClass)
          .maybeSingle();

        let classId = existingClass?.id as string | undefined;
        if (!classId) {
          const gradeLevel = cleanClass.split(' ')[0] || 'XI';
          const { data: createdClass, error: clsErr } = await supabaseAdmin
            .from('classes')
            .insert({ name: cleanClass, major_code: cleanMajor, grade_level: gradeLevel })
            .select('id')
            .single();
          if (clsErr || !createdClass) {
            res.status(400).json({ error: clsErr?.message || 'Gagal memperbarui relasi kelas.' });
            return;
          }
          classId = createdClass.id;
        } else {
          await supabaseAdmin
            .from('classes')
            .update({ major_code: cleanMajor })
            .eq('id', classId);
        }

        const { data, error } = await supabaseAdmin
          .from('students')
          .update({
            nis: cleanNis,
            name: cleanName,
            class_id: classId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('id, nis, name, created_at, classes!inner(name, major_code)')
          .single();

        if (error || !data) {
          res.status(400).json({ error: error?.message || 'Gagal memperbarui siswa.' });
          return;
        }

        const cls = (Array.isArray(data.classes) ? data.classes[0] : data.classes) as
          | { name?: string; major_code?: MajorCode }
          | null;

        res.json({
          student: {
            id: data.id,
            nis: data.nis,
            name: data.name,
            className: String(cls?.name || cleanClass),
            major: (cls?.major_code || cleanMajor) as MajorCode,
            createdAt: data.created_at,
          },
        });
        return;
      }

      const db = readLocalDb();
      const idx = db.students.findIndex((s) => s.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
        return;
      }
      if (db.students.some((s) => s.nis === cleanNis && s.id !== id)) {
        res.status(409).json({ error: `NIS ${cleanNis} sudah digunakan siswa lain.` });
        return;
      }

      db.students[idx] = {
        ...db.students[idx],
        nis: cleanNis,
        name: cleanName,
        className: cleanClass,
        major: cleanMajor,
      };
      writeLocalDb(db);
      res.json({ student: db.students[idx] });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui siswa.' });
    }
  });

  app.delete('/api/students/:id', resolveAuthedUser, requireRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      if (useSupabase && supabaseAdmin) {
        const { error } = await supabaseAdmin.from('students').delete().eq('id', id);
        if (error) {
          res.status(400).json({ error: error.message });
          return;
        }
        res.json({ success: true });
        return;
      }

      const db = readLocalDb();
      const exists = db.students.some((s) => s.id === id);
      if (!exists) {
        res.status(404).json({ error: 'Data siswa tidak ditemukan.' });
        return;
      }
      db.students = db.students.filter((s) => s.id !== id);
      db.studentAttendance = db.studentAttendance.filter((a) => a.studentId !== id);
      writeLocalDb(db);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghapus siswa.' });
    }
  });

  // =========================================================================
  // STUDENT ATTENDANCE (GURU & ADMIN)
  // =========================================================================
  app.get('/api/attendance/student', resolveAuthedUser, requireRole(['admin', 'guru']), async (req, res) => {
    try {
      const date = String(req.query.date || getTodayDateString());

      if (useSupabase && supabaseAdmin) {
        const [{ data: students, error: stuErr }, { data: records, error: recErr }] =
          await Promise.all([
            supabaseAdmin
              .from('students')
              .select('id, nis, name, created_at, classes!inner(name, major_code)')
              .order('name', { ascending: true }),
            supabaseAdmin.from('student_attendance').select('*').eq('date', date),
          ]);

        if (stuErr || recErr) {
          res.status(500).json({ error: stuErr?.message || recErr?.message });
          return;
        }

        const mappedStudents = (students || [])
          .map((s) => {
            const cls = (Array.isArray(s.classes) ? s.classes[0] : s.classes) as
              | { name?: string; major_code?: MajorCode }
              | null;
            return {
              id: s.id,
              nis: s.nis,
              name: s.name,
              className: String(cls?.name || '-'),
              major: (cls?.major_code || 'TKJ') as MajorCode,
              createdAt: s.created_at,
            };
          })
          .sort((a, b) => a.className.localeCompare(b.className) || a.name.localeCompare(b.name));

        res.json({
          date,
          students: mappedStudents,
          records: (records || []).map((r) => ({
            id: r.id,
            studentId: r.student_id,
            recordedBy: r.recorded_by,
            date: r.date,
            status: r.status,
            notes: r.notes || '',
            createdAt: r.created_at,
          })),
        });
        return;
      }

      const db = readLocalDb();
      const students = [...db.students].sort((a, b) =>
        a.className.localeCompare(b.className) || a.name.localeCompare(b.name)
      );
      const records = db.studentAttendance.filter((r) => r.date === date);
      res.json({ date, students, records });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat absensi siswa.' });
    }
  });

  app.post('/api/attendance/student/bulk', resolveAuthedUser, requireRole(['admin', 'guru']), async (req: AuthedRequest, res) => {
    try {
      const currentUser = req.user!;
      const { date, entries } = req.body as {
        date?: string;
        entries?: Array<{ studentId: string; status: StudentStatus; notes?: string }>;
      };

      const targetDate = date || getTodayDateString();
      if (!Array.isArray(entries) || entries.length === 0) {
        res.status(400).json({ error: 'Daftar absensi siswa tidak boleh kosong.' });
        return;
      }

      const sanitizedEntries = entries.map((e) => ({
        studentId: e.studentId,
        status: VALID_STU_STATUS.includes(e.status) ? e.status : 'hadir',
        notes: (e.notes || '').trim(),
      }));

      if (useSupabase && supabaseAdmin) {
        const rows = sanitizedEntries.map((e) => ({
          student_id: e.studentId,
          recorded_by: currentUser.id,
          date: targetDate,
          status: e.status,
          notes: e.notes,
        }));

        const { error } = await supabaseAdmin
          .from('student_attendance')
          .upsert(rows, { onConflict: 'student_id,date' });

        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }
        res.json({ success: true, count: rows.length, date: targetDate });
        return;
      }

      const db = readLocalDb();
      const nowIso = new Date().toISOString();

      for (const entry of sanitizedEntries) {
        const existingIdx = db.studentAttendance.findIndex(
          (r) => r.studentId === entry.studentId && r.date === targetDate
        );
        if (existingIdx >= 0) {
          db.studentAttendance[existingIdx] = {
            ...db.studentAttendance[existingIdx],
            status: entry.status,
            notes: entry.notes,
            recordedBy: currentUser.id,
          };
        } else {
          db.studentAttendance.push({
            id: crypto.randomUUID(),
            studentId: entry.studentId,
            recordedBy: currentUser.id,
            date: targetDate,
            status: entry.status,
            notes: entry.notes,
            createdAt: nowIso,
          });
        }
      }

      writeLocalDb(db);
      res.json({ success: true, count: sanitizedEntries.length, date: targetDate });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menyimpan absensi siswa.' });
    }
  });

  // =========================================================================
  // ATTENDANCE RECAP ROUTES
  // =========================================================================
  app.get('/api/recap/employee', resolveAuthedUser, requireRole(['admin']), async (req, res) => {
    try {
      const startDate = String(req.query.startDate || '');
      const endDate = String(req.query.endDate || '');
      const roleFilter = String(req.query.role || 'all');

      if (useSupabase && supabaseAdmin) {
        let query = supabaseAdmin
          .from('employee_attendance')
          .select('*, profiles(full_name, nip, role, jabatan)')
          .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query;
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        const mapped = (data || [])
          .map((row) => {
            const prof = (row.profiles || {}) as Record<string, unknown>;
            return {
              id: row.id,
              userId: row.user_id,
              userName: String(prof.full_name || 'Pengguna'),
              userNip: String(prof.nip || '-'),
              userRole: String(prof.role || 'tenaga_kependidikan') as UserRole,
              userJabatan: String(prof.jabatan || '-'),
              date: row.date,
              checkInTime: row.check_in_time,
              checkOutTime: row.check_out_time,
              status: row.status,
              notes: row.notes || '',
              createdAt: row.created_at,
            };
          })
          .filter((r) => roleFilter === 'all' || r.userRole === roleFilter);

        res.json({ records: mapped });
        return;
      }

      const db = readLocalDb();
      const userMap = new Map(db.users.map((u) => [u.id, u]));
      const records = db.employeeAttendance
        .filter((r) => {
          if (startDate && r.date < startDate) return false;
          if (endDate && r.date > endDate) return false;
          const u = userMap.get(r.userId);
          if (roleFilter !== 'all' && u?.role !== roleFilter) return false;
          return true;
        })
        .map((r) => {
          const u = userMap.get(r.userId);
          return {
            ...r,
            userName: u?.fullName || 'Pengguna Dihapus',
            userNip: u?.nip || '-',
            userRole: u?.role || 'tenaga_kependidikan',
            userJabatan: u?.jabatan || '-',
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date));

      res.json({ records });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat rekap karyawan.' });
    }
  });

  app.get('/api/recap/student', resolveAuthedUser, requireRole(['admin', 'guru']), async (req, res) => {
    try {
      const startDate = String(req.query.startDate || '');
      const endDate = String(req.query.endDate || '');
      const classFilter = String(req.query.className || 'all');
      const majorFilter = String(req.query.major || 'all');

      if (useSupabase && supabaseAdmin) {
        let query = supabaseAdmin
          .from('student_attendance')
          .select('*, students!inner(nis, name, classes!inner(name, major_code)), profiles(full_name)')
          .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query;
        if (error) {
          res.status(500).json({ error: error.message });
          return;
        }

        const mapped = (data || [])
          .map((row) => {
            const stu = (Array.isArray(row.students) ? row.students[0] : row.students) as Record<string, unknown> | null;
            const clsRaw = stu?.classes;
            const cls = (Array.isArray(clsRaw) ? clsRaw[0] : clsRaw) as Record<string, unknown> | null;
            const rec = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as Record<string, unknown> | null;
            return {
              id: row.id,
              studentId: row.student_id,
              studentNis: String(stu?.nis || '-'),
              studentName: String(stu?.name || 'Siswa'),
              studentClassName: String(cls?.name || '-'),
              studentMajor: String(cls?.major_code || 'TKJ') as MajorCode,
              recordedBy: row.recorded_by,
              recordedByName: String(rec?.full_name || 'Guru/Admin'),
              date: row.date,
              status: row.status,
              notes: row.notes || '',
              createdAt: row.created_at,
            };
          })
          .filter((r) => {
            if (classFilter !== 'all' && r.studentClassName !== classFilter) return false;
            if (majorFilter !== 'all' && r.studentMajor !== majorFilter) return false;
            return true;
          });

        res.json({ records: mapped });
        return;
      }

      const db = readLocalDb();
      const stuMap = new Map(db.students.map((s) => [s.id, s]));
      const userMap = new Map(db.users.map((u) => [u.id, u]));

      const records = db.studentAttendance
        .filter((r) => {
          if (startDate && r.date < startDate) return false;
          if (endDate && r.date > endDate) return false;
          const stu = stuMap.get(r.studentId);
          if (!stu) return false;
          if (classFilter !== 'all' && stu.className !== classFilter) return false;
          if (majorFilter !== 'all' && stu.major !== majorFilter) return false;
          return true;
        })
        .map((r) => {
          const stu = stuMap.get(r.studentId)!;
          const recorder = userMap.get(r.recordedBy);
          return {
            ...r,
            studentNis: stu.nis,
            studentName: stu.name,
            studentClassName: stu.className,
            studentMajor: stu.major,
            recordedByName: recorder?.fullName || 'Guru/Admin',
          };
        })
        .sort((a, b) => b.date.localeCompare(a.date) || a.studentName.localeCompare(b.studentName));

      res.json({ records });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat rekap siswa.' });
    }
  });

  // =========================================================================
  // USER MANAGEMENT (ADMIN ONLY — SYNCED WITH SUPABASE AUTHENTICATION)
  // =========================================================================
  app.get('/api/admin/users', resolveAuthedUser, requireRole(['admin']), async (_req, res) => {
    try {
      if (useSupabase && supabaseAdmin) {
        const [{ data: authList, error: authErr }, { data: profileList, error: profErr }] =
          await Promise.all([
            supabaseAdmin.auth.admin.listUsers({ perPage: 500 }),
            supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: true }),
          ]);

        if (authErr || profErr) {
          res.status(500).json({ error: authErr?.message || profErr?.message });
          return;
        }

        const profileMap = new Map(
          (profileList || []).map((p) => [p.id, mapSupabaseProfile(p as Record<string, unknown>)])
        );

        const syncedUsers = (authList?.users || []).map((authUser) => {
          const prof = profileMap.get(authUser.id);
          if (prof) return prof;
          return {
            id: authUser.id,
            email: authUser.email || '',
            fullName:
              (authUser.user_metadata?.full_name as string) ||
              authUser.email?.split('@')[0] ||
              'Pengguna',
            nip: (authUser.user_metadata?.nip as string) || '',
            jabatan: (authUser.user_metadata?.jabatan as string) || '',
            role: ((authUser.user_metadata?.role as UserRole) || 'tenaga_kependidikan'),
            createdAt: authUser.created_at,
          };
        });

        res.json({ users: syncedUsers });
        return;
      }

      const db = readLocalDb();
      res.json({ users: db.users.map(sanitizeUser) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat daftar user.' });
    }
  });

  app.post('/api/admin/users', resolveAuthedUser, requireRole(['admin']), async (req, res) => {
    try {
      const { email, password, fullName, nip, jabatan, role } = req.body as {
        email?: string;
        password?: string;
        fullName?: string;
        nip?: string;
        jabatan?: string;
        role?: UserRole;
      };

      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (fullName || '').trim();
      const cleanRole: UserRole = VALID_ROLES.includes(role as UserRole)
        ? (role as UserRole)
        : 'tenaga_kependidikan';

      if (!cleanEmail || !password || !cleanName) {
        res.status(400).json({ error: 'Nama lengkap, email, dan kata sandi wajib diisi.' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
        return;
      }

      if (useSupabase && supabaseAdmin) {
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            nip: (nip || '').trim(),
            jabatan: (jabatan || '').trim(),
            role: cleanRole,
          },
        });

        if (createErr || !created.user) {
          res.status(400).json({ error: createErr?.message || 'Gagal menambah user di Supabase Auth.' });
          return;
        }

        const { data: prof, error: profErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id: created.user.id,
            email: cleanEmail,
            full_name: cleanName,
            nip: (nip || '').trim(),
            jabatan: (jabatan || '').trim(),
            role: cleanRole,
          })
          .select('*')
          .single();

        if (profErr) {
          res.status(500).json({ error: profErr.message });
          return;
        }

        res.status(201).json({ user: mapSupabaseProfile(prof as Record<string, unknown>) });
        return;
      }

      const db = readLocalDb();
      if (db.users.some((u) => u.email === cleanEmail)) {
        res.status(409).json({ error: 'Email sudah digunakan oleh pengguna lain.' });
        return;
      }

      const newUser: UserRecord = {
        id: crypto.randomUUID(),
        email: cleanEmail,
        passwordHash: hashPassword(password),
        fullName: cleanName,
        nip: (nip || '').trim(),
        jabatan: (jabatan || '').trim(),
        role: cleanRole,
        createdAt: new Date().toISOString(),
      };
      db.users.push(newUser);
      writeLocalDb(db);
      res.status(201).json({ user: sanitizeUser(newUser) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menambah user.' });
    }
  });

  app.patch('/api/admin/users/:id', resolveAuthedUser, requireRole(['admin']), async (req: AuthedRequest, res) => {
    try {
      const { id } = req.params;
      const { email, password, fullName, nip, jabatan, role } = req.body as {
        email?: string;
        password?: string;
        fullName?: string;
        nip?: string;
        jabatan?: string;
        role?: UserRole;
      };

      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanName = (fullName || '').trim();
      const cleanRole: UserRole = VALID_ROLES.includes(role as UserRole)
        ? (role as UserRole)
        : 'tenaga_kependidikan';

      if (!cleanEmail || !cleanName) {
        res.status(400).json({ error: 'Nama lengkap dan email wajib diisi.' });
        return;
      }
      if (password && password.length < 6) {
        res.status(400).json({ error: 'Kata sandi baru minimal 6 karakter.' });
        return;
      }

      if (useSupabase && supabaseAdmin) {
        const authPayload: {
          email: string;
          password?: string;
          email_confirm: boolean;
          user_metadata: Record<string, string>;
        } = {
          email: cleanEmail,
          email_confirm: true,
          user_metadata: {
            full_name: cleanName,
            nip: (nip || '').trim(),
            jabatan: (jabatan || '').trim(),
            role: cleanRole,
          },
        };
        if (password) {
          authPayload.password = password;
        }

        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, authPayload);
        if (authErr) {
          res.status(400).json({ error: authErr.message });
          return;
        }

        const { data: prof, error: profErr } = await supabaseAdmin
          .from('profiles')
          .upsert({
            id,
            email: cleanEmail,
            full_name: cleanName,
            nip: (nip || '').trim(),
            jabatan: (jabatan || '').trim(),
            role: cleanRole,
            updated_at: new Date().toISOString(),
          })
          .select('*')
          .single();

        if (profErr) {
          res.status(500).json({ error: profErr.message });
          return;
        }

        res.json({ user: mapSupabaseProfile(prof as Record<string, unknown>) });
        return;
      }

      const db = readLocalDb();
      const idx = db.users.findIndex((u) => u.id === id);
      if (idx === -1) {
        res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        return;
      }
      if (db.users.some((u) => u.email === cleanEmail && u.id !== id)) {
        res.status(409).json({ error: 'Email sudah digunakan oleh pengguna lain.' });
        return;
      }

      db.users[idx] = {
        ...db.users[idx],
        email: cleanEmail,
        fullName: cleanName,
        nip: (nip || '').trim(),
        jabatan: (jabatan || '').trim(),
        role: cleanRole,
        passwordHash: password ? hashPassword(password) : db.users[idx].passwordHash,
      };
      writeLocalDb(db);
      res.json({ user: sanitizeUser(db.users[idx]) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memperbarui user.' });
    }
  });

  app.delete('/api/admin/users/:id', resolveAuthedUser, requireRole(['admin']), async (req: AuthedRequest, res) => {
    try {
      const { id } = req.params;
      if (req.user?.id === id) {
        res.status(400).json({ error: 'Tidak dapat menghapus akun Anda sendiri yang sedang aktif.' });
        return;
      }

      if (useSupabase && supabaseAdmin) {
        // Hard delete di Supabase Authentication (shouldSoftDelete = false)
        const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(id, false);
        if (delAuthErr) {
          res.status(400).json({ error: delAuthErr.message });
          return;
        }
        await supabaseAdmin.from('profiles').delete().eq('id', id);
        res.json({ success: true, hardDeleted: true });
        return;
      }

      const db = readLocalDb();
      const exists = db.users.some((u) => u.id === id);
      if (!exists) {
        res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
        return;
      }
      db.users = db.users.filter((u) => u.id !== id);
      db.employeeAttendance = db.employeeAttendance.filter((a) => a.userId !== id);
      writeLocalDb(db);
      res.json({ success: true, hardDeleted: true });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal menghapus user.' });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', mode: useSupabase ? 'supabase' : 'local' });
  });

  // =========================================================================
  // VITE MIDDLEWARE OR PRODUCTION STATIC SERVING
  // =========================================================================
  if (process.env.NODE_ENV !== 'production') {
    const vitePromise = createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });

    app.use(async (req, res, next) => {
      try {
        const vite = await vitePromise;
        vite.middlewares(req, res, next);
      } catch (err) {
        next(err);
      }
    });
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SMK Prima Unggul server running on http://0.0.0.0:${PORT} (mode: ${useSupabase ? 'supabase' : 'local'})`);
  });
}

startServer();
