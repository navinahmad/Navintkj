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
  supabase?: SupabaseClient;
}

const PORT = 3000;
const RAW_SUPABASE_URL = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const RAW_SUPABASE_ANON_KEY = (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const RAW_SUPABASE_SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

const SUPABASE_URL =
  /^https?:\/\/.+/.test(RAW_SUPABASE_URL) && !RAW_SUPABASE_URL.includes('MY_SUPABASE')
    ? RAW_SUPABASE_URL
    : '';
const SUPABASE_ANON_KEY =
  RAW_SUPABASE_ANON_KEY && !RAW_SUPABASE_ANON_KEY.startsWith('MY_')
    ? RAW_SUPABASE_ANON_KEY
    : '';
const SUPABASE_SERVICE_ROLE_KEY =
  RAW_SUPABASE_SERVICE_ROLE_KEY && !RAW_SUPABASE_SERVICE_ROLE_KEY.startsWith('MY_')
    ? RAW_SUPABASE_SERVICE_ROLE_KEY
    : '';

function classifySupabaseKey(k: string): string {
  if (!k) return 'none';
  if (k.startsWith('sb_secret_')) return 'sb_secret';
  if (k.startsWith('sb_publishable_')) return 'sb_publishable';
  if (k.startsWith('eyJ')) {
    try {
      const payload = JSON.parse(Buffer.from(k.split('.')[1] || '', 'base64url').toString('utf8')) as { role?: string };
      return `jwt:${payload.role || 'unknown'}`;
    } catch {
      return 'jwt:malformed';
    }
  }
  return 'other';
}

const serviceKeyType = classifySupabaseKey(SUPABASE_SERVICE_ROLE_KEY);
const hasRealServiceRole = serviceKeyType === 'sb_secret' || serviceKeyType === 'jwt:service_role';
const publicClientKey = SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY;
const useSupabase = Boolean(SUPABASE_URL && publicClientKey);

const supabaseAdmin: SupabaseClient | null =
  useSupabase && hasRealServiceRole
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

const supabasePublic: SupabaseClient | null =
  SUPABASE_URL && publicClientKey
    ? createClient(SUPABASE_URL, publicClientKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

function createAuthedSupabaseClient(token: string): SupabaseClient {
  return createClient(SUPABASE_URL, publicClientKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

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

function formatSupabaseError(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string') return err || fallback;
  if (typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const msg = [e.message, e.details, e.hint].filter(Boolean).join(' — ');
    if (msg) return msg;
    if (e.code) return `Kode error database: ${e.code}`;
  }
  return fallback;
}

function isMissingTableError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; message?: string; details?: string; hint?: string };
  const combined = `${e.code || ''} ${e.message || ''} ${e.details || ''} ${e.hint || ''}`.toLowerCase();
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    combined.includes('does not exist') ||
    combined.includes('could not find the table') ||
    combined.includes('schema cache') ||
    (!e.message && !e.details && !e.hint && !e.code)
  );
}

const SCHEMA_MISSING_MSG =
  'Tabel database Supabase belum dibuat. Jalankan isi file supabase/schema.sql di SQL Editor Supabase terlebih dahulu.';

interface MinimalAuthUser {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: Record<string, unknown>;
}

function mapAuthUserFallback(authUser: MinimalAuthUser, isEarliestUser: boolean): UserRecord {
  const metaRole = authUser.user_metadata?.role as UserRole | undefined;
  let role: UserRole =
    metaRole && VALID_ROLES.includes(metaRole)
      ? metaRole
      : isEarliestUser
        ? 'admin'
        : 'tenaga_kependidikan';
  if (isEarliestUser && !metaRole) {
    role = 'admin';
  }
  return {
    id: authUser.id,
    email: authUser.email || '',
    fullName:
      (authUser.user_metadata?.full_name as string) ||
      authUser.email?.split('@')[0] ||
      'Pengguna',
    nip: (authUser.user_metadata?.nip as string) || '',
    jabatan: (authUser.user_metadata?.jabatan as string) || (role === 'admin' ? 'Administrator Sistem' : ''),
    role,
    createdAt: authUser.created_at || new Date().toISOString(),
  };
}

async function getEarliestAuthUserId(): Promise<{ totalUsers: number; earliestUserId: string | null }> {
  if (!supabaseAdmin) return { totalUsers: 0, earliestUserId: null };
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error || !data?.users) {
    return { totalUsers: 0, earliestUserId: null };
  }
  const users = [...data.users].sort((a, b) =>
    String(a.created_at || '').localeCompare(String(b.created_at || ''))
  );
  return {
    totalUsers: users.length,
    earliestUserId: users[0]?.id || null,
  };
}

async function resolveOrSyncSupabaseProfile(
  authUser: MinimalAuthUser,
  authedClient: SupabaseClient
): Promise<UserRecord> {
  const dbClient = supabaseAdmin || authedClient;

  const { data: profile, error: profErr } = await dbClient
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (profErr && isMissingTableError(profErr)) {
    const { earliestUserId } = await getEarliestAuthUserId();
    return mapAuthUserFallback(authUser, earliestUserId === authUser.id);
  }

  if (profErr) {
    throw new Error(formatSupabaseError(profErr, 'Gagal membaca profil pengguna di Supabase.'));
  }

  if (profile) {
    return mapSupabaseProfile(profile as Record<string, unknown>);
  }

  // Jika belum ada row di public.profiles, panggil RPC SECURITY DEFINER ensure_my_profile()
  const { data: ensured, error: ensureErr } = await authedClient.rpc('ensure_my_profile');
  if (!ensureErr && ensured) {
    return mapSupabaseProfile(ensured as Record<string, unknown>);
  }

  if (supabaseAdmin) {
    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact' })
      .limit(1);
    const { earliestUserId } = await getEarliestAuthUserId();
    const isFirstAdmin = (count ?? 0) === 0 || earliestUserId === authUser.id;
    const metaRole = authUser.user_metadata?.role as UserRole | undefined;
    const assignedRole: UserRole = isFirstAdmin
      ? 'admin'
      : metaRole && VALID_ROLES.includes(metaRole)
        ? metaRole
        : 'tenaga_kependidikan';

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
        role: assignedRole,
      })
      .select('*')
      .single();

    if (insErr) {
      if (isMissingTableError(insErr)) {
        return mapAuthUserFallback(authUser, isFirstAdmin);
      }
      throw new Error(formatSupabaseError(insErr, 'Gagal menyinkronkan profil pengguna.'));
    }

    return mapSupabaseProfile(inserted as Record<string, unknown>);
  }

  // Fallback terakhir menggunakan client authenticated (RLS mengizinkan insert profil sendiri)
  const { count } = await authedClient
    .from('profiles')
    .select('id', { count: 'exact' })
    .limit(1);
  const isFirstAdmin = (count ?? 0) === 0;
  const metaRole = authUser.user_metadata?.role as UserRole | undefined;
  const assignedRole: UserRole = isFirstAdmin
    ? 'admin'
    : metaRole && VALID_ROLES.includes(metaRole)
      ? metaRole
      : 'tenaga_kependidikan';

  const { data: selfInserted, error: selfErr } = await authedClient
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
      role: assignedRole,
    })
    .select('*')
    .single();

  if (selfErr) {
    throw new Error(formatSupabaseError(selfErr, 'Gagal menyinkronkan profil pengguna.'));
  }

  return mapSupabaseProfile(selfInserted as Record<string, unknown>);
}

async function signInWithSupabasePassword(
  email: string,
  password: string
): Promise<{ accessToken: string | null; user: MinimalAuthUser | null; errorMessage: string | null }> {
  if (supabasePublic) {
    const { data, error } = await supabasePublic.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('invalid login credentials')) {
        return { accessToken: null, user: null, errorMessage: 'Email atau kata sandi tidak valid.' };
      }
      if (msg.includes('email not confirmed')) {
        return {
          accessToken: null,
          user: null,
          errorMessage: 'Email belum dikonfirmasi di Supabase Authentication.',
        };
      }
      return {
        accessToken: null,
        user: null,
        errorMessage: error?.message || 'Email atau kata sandi tidak valid.',
      };
    }
    return {
      accessToken: data.session.access_token,
      user: data.user as MinimalAuthUser,
      errorMessage: null,
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { accessToken: null, user: null, errorMessage: 'Konfigurasi Supabase belum lengkap.' };
  }

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY || SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = (await resp.json().catch(() => ({}))) as {
    access_token?: string;
    user?: MinimalAuthUser;
    error_description?: string;
    msg?: string;
    message?: string;
  };

  if (!resp.ok || !payload.access_token || !payload.user) {
    const rawMsg = (payload.error_description || payload.msg || payload.message || '').toLowerCase();
    if (rawMsg.includes('invalid login credentials')) {
      return { accessToken: null, user: null, errorMessage: 'Email atau kata sandi tidak valid.' };
    }
    if (rawMsg.includes('email not confirmed')) {
      return {
        accessToken: null,
        user: null,
        errorMessage: 'Email belum dikonfirmasi di Supabase Authentication.',
      };
    }
    return {
      accessToken: null,
      user: null,
      errorMessage: payload.error_description || payload.msg || payload.message || 'Email atau kata sandi tidak valid.',
    };
  }

  return {
    accessToken: payload.access_token,
    user: payload.user,
    errorMessage: null,
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

    if (useSupabase && (supabaseAdmin || supabasePublic)) {
      const authVerifier = supabaseAdmin || supabasePublic!;
      const { data: userData, error: userErr } = await authVerifier.auth.getUser(token);
      if (userErr || !userData?.user) {
        res.status(401).json({ error: 'Token sesi tidak valid atau sudah kedaluwarsa.' });
        return;
      }

      const authedClient = createAuthedSupabaseClient(token);
      req.supabase = authedClient;
      req.user = await resolveOrSyncSupabaseProfile(userData.user as MinimalAuthUser, authedClient);
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
      if (useSupabase && supabasePublic) {
        if (supabaseAdmin) {
          const [{ data: authList, error: authErr }, { count: profileCount, error: profErr }] =
            await Promise.all([
              supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }),
              supabaseAdmin.from('profiles').select('id', { count: 'exact' }).limit(1),
            ]);

          if (!authErr) {
            const schemaReady = !profErr || !isMissingTableError(profErr);
            const hasAuthUsers = (authList?.users?.length ?? 0) > 0;
            const hasProfileUsers = !profErr && (profileCount ?? 0) > 0;

            res.json({
              hasUsers: hasAuthUsers || hasProfileUsers,
              provider: 'supabase',
              supabaseConfigured: true,
              schemaReady,
              adminSyncAvailable: true,
            });
            return;
          }
        }

        // Jalur standar berbasis RPC has_registered_users() (aman untuk publishable/anon key)
        const { data: rpcHasUsers, error: rpcErr } = await supabasePublic.rpc('has_registered_users');
        if (!rpcErr) {
          res.json({
            hasUsers: Boolean(rpcHasUsers),
            provider: 'supabase',
            supabaseConfigured: true,
            schemaReady: true,
            adminSyncAvailable: hasRealServiceRole,
          });
          return;
        }

        res.json({
          hasUsers: false,
          provider: 'supabase',
          supabaseConfigured: true,
          schemaReady: false,
          adminSyncAvailable: hasRealServiceRole,
        });
        return;
      }

      const db = readLocalDb();
      res.json({
        hasUsers: db.users.length > 0,
        provider: 'local',
        supabaseConfigured: false,
        schemaReady: true,
        adminSyncAvailable: true,
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

      if (useSupabase && supabasePublic) {
        if (supabaseAdmin) {
          const { totalUsers } = await getEarliestAuthUserId();
          const isFirstUser = totalUsers === 0;
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
            const msg = (createErr?.message || '').toLowerCase();
            if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
              res.status(409).json({
                error: 'Email sudah terdaftar di Supabase Auth. Silakan masuk melalui tab Masuk.',
              });
              return;
            }
            res.status(400).json({
              error: formatSupabaseError(createErr, 'Gagal membuat akun di Supabase Auth.'),
            });
            return;
          }

          const signInResult = await signInWithSupabasePassword(cleanEmail, password);
          const authedClient = signInResult.accessToken
            ? createAuthedSupabaseClient(signInResult.accessToken)
            : supabaseAdmin;
          const userProfile = await resolveOrSyncSupabaseProfile(
            created.user as MinimalAuthUser,
            authedClient
          );

          res.status(201).json({
            user: userProfile,
            token: signInResult.accessToken,
            isFirstAdmin: isFirstUser,
          });
          return;
        }

        // Pendaftaran via Supabase signUp jika belum memakai service_role secret key
        const { data: rpcHasUsers } = await supabasePublic.rpc('has_registered_users');
        const isFirstUser = !Boolean(rpcHasUsers);
        const assignedRole: UserRole = isFirstUser ? 'admin' : 'tenaga_kependidikan';

        const originHeader = String(req.headers.origin || '').trim();
        const forwardedHost = String(req.headers['x-forwarded-host'] || '').trim();
        const forwardedProto = String(req.headers['x-forwarded-proto'] || 'https').trim();
        const appUrlEnv = (process.env.APP_URL || '').trim();
        const resolvedOrigin =
          originHeader ||
          (forwardedHost ? `${forwardedProto}://${forwardedHost}` : '') ||
          (/^https?:\/\/.+/.test(appUrlEnv) && !appUrlEnv.includes('MY_APP_URL') ? appUrlEnv : '');

        const { data: signUpData, error: signUpErr } = await supabasePublic.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            ...(resolvedOrigin ? { emailRedirectTo: `${resolvedOrigin.replace(/\/$/, '')}/login` } : {}),
            data: {
              full_name: cleanName,
              nip: (nip || '').trim(),
              jabatan: (jabatan || '').trim(),
              role: assignedRole,
            },
          },
        });

        if (signUpErr || !signUpData.user) {
          const msg = (signUpErr?.message || '').toLowerCase();
          if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
            res.status(409).json({
              error: 'Email sudah terdaftar di Supabase Auth. Silakan masuk melalui tab Masuk.',
            });
            return;
          }
          res.status(400).json({
            error: formatSupabaseError(signUpErr, 'Gagal mendaftarkan akun di Supabase Auth.'),
          });
          return;
        }

        let accessToken = signUpData.session?.access_token || null;
        if (!accessToken) {
          const loginTry = await signInWithSupabasePassword(cleanEmail, password);
          accessToken = loginTry.accessToken;
        }

        if (!accessToken) {
          res.status(400).json({
            error:
              'Akun berhasil dibuat, namun Supabase meminta konfirmasi email terlebih dahulu. Periksa email Anda atau nonaktifkan "Confirm email" di Supabase Authentication → Providers → Email.',
          });
          return;
        }

        const authedClient = createAuthedSupabaseClient(accessToken);
        const userProfile = await resolveOrSyncSupabaseProfile(
          signUpData.user as MinimalAuthUser,
          authedClient
        );

        res.status(201).json({
          user: userProfile,
          token: accessToken,
          isFirstAdmin: isFirstUser || userProfile.role === 'admin',
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

      if (useSupabase && supabasePublic) {
        const signIn = await signInWithSupabasePassword(cleanEmail, password);
        if (signIn.errorMessage || !signIn.accessToken || !signIn.user) {
          res.status(401).json({ error: signIn.errorMessage || 'Email atau kata sandi tidak valid.' });
          return;
        }

        const authedClient = createAuthedSupabaseClient(signIn.accessToken);
        const userProfile = await resolveOrSyncSupabaseProfile(signIn.user, authedClient);
        res.json({
          user: userProfile,
          token: signIn.accessToken,
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

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const [
          { data: myToday, error: myTodayErr },
          { data: myHistory, error: myHistoryErr },
          { count: studentCount, error: stuCountErr },
          { count: userCount, error: profCountErr },
          { data: todayEmp, error: todayEmpErr },
          { data: todayStu, error: todayStuErr },
        ] = await Promise.all([
          dbClient
            .from('employee_attendance')
            .select('*')
            .eq('user_id', currentUser.id)
            .eq('date', today)
            .maybeSingle(),
          dbClient
            .from('employee_attendance')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('date', { ascending: false })
            .limit(7),
          dbClient.from('students').select('id', { count: 'exact' }).limit(1),
          dbClient.from('profiles').select('id', { count: 'exact' }).limit(1),
          dbClient.from('employee_attendance').select('status').eq('date', today),
          dbClient.from('student_attendance').select('status').eq('date', today),
        ]);

        const anyMissingTable = [
          myTodayErr,
          myHistoryErr,
          stuCountErr,
          profCountErr,
          todayEmpErr,
          todayStuErr,
        ].some((e) => e && isMissingTableError(e));

        if (anyMissingTable) {
          const { totalUsers } = await getEarliestAuthUserId();
          res.json({
            today,
            schemaReady: false,
            myTodayAttendance: null,
            myRecentAttendance: [],
            stats: {
              totalEmployees: totalUsers,
              employeesPresentToday: 0,
              employeesAbsentToday: 0,
              totalStudents: 0,
              studentsPresentToday: 0,
              studentsRecordedToday: 0,
            },
          });
          return;
        }

        res.json({
          today,
          schemaReady: true,
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
        schemaReady: true,
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

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const { data, error } = await dbClient
          .from('employee_attendance')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('date', { ascending: false })
          .limit(30);
        if (error) {
          res.status(isMissingTableError(error) ? 503 : 500).json({
            error: isMissingTableError(error) ? SCHEMA_MISSING_MSG : formatSupabaseError(error, 'Gagal memuat absensi karyawan.'),
          });
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

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const { data: existing } = await dbClient
          .from('employee_attendance')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('date', today)
          .maybeSingle();

        if (existing) {
          res.status(409).json({ error: 'Anda sudah mencatat kehadiran masuk hari ini.' });
          return;
        }

        const { data, error } = await dbClient
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
          res.status(isMissingTableError(error) ? 503 : 500).json({
            error: isMissingTableError(error)
              ? SCHEMA_MISSING_MSG
              : formatSupabaseError(error, 'Gagal menyimpan absen masuk.'),
          });
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

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const { data: existing, error: findErr } = await dbClient
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
        const { data, error } = await dbClient
          .from('employee_attendance')
          .update({ check_out_time: nowIso, notes: updatedNotes })
          .eq('id', existing.id)
          .select('*')
          .single();

        if (error) {
          res.status(isMissingTableError(error) ? 503 : 500).json({
            error: isMissingTableError(error)
              ? SCHEMA_MISSING_MSG
              : formatSupabaseError(error, 'Gagal menyimpan check-out.'),
          });
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
  app.get('/api/students', resolveAuthedUser, requireRole(['admin', 'guru']), async (req: AuthedRequest, res) => {
    try {
      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const { data, error } = await dbClient
          .from('students')
          .select('id, nis, name, class_id, created_at, classes!inner(id, name, major_code)')
          .order('name', { ascending: true });
        if (error) {
          res.status(isMissingTableError(error) ? 503 : 500).json({
            error: isMissingTableError(error) ? SCHEMA_MISSING_MSG : formatSupabaseError(error, 'Gagal memuat data siswa.'),
          });
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

  app.post('/api/students', resolveAuthedUser, requireRole(['admin']), async (req: AuthedRequest, res) => {
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

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const { data: existingClass } = await dbClient
          .from('classes')
          .select('id')
          .eq('name', cleanClass)
          .maybeSingle();

        let classId = existingClass?.id as string | undefined;
        if (!classId) {
          const gradeLevel = cleanClass.split(' ')[0] || 'XI';
          const { data: createdClass, error: clsErr } = await dbClient
            .from('classes')
            .insert({ name: cleanClass, major_code: cleanMajor, grade_level: gradeLevel })
            .select('id')
            .single();
          if (clsErr || !createdClass) {
            res.status(isMissingTableError(clsErr) ? 503 : 400).json({
              error: isMissingTableError(clsErr)
                ? SCHEMA_MISSING_MSG
                : formatSupabaseError(clsErr, 'Gagal menyiapkan relasi kelas.'),
            });
            return;
          }
          classId = createdClass.id;
        }

        const { data, error } = await dbClient
          .from('students')
          .insert({
            nis: cleanNis,
            name: cleanName,
            class_id: classId,
          })
          .select('id, nis, name, created_at, classes!inner(name, major_code)')
          .single();

        if (error || !data) {
          res.status(isMissingTableError(error) ? 503 : 400).json({
            error: isMissingTableError(error)
              ? SCHEMA_MISSING_MSG
              : formatSupabaseError(error, 'Gagal menambah siswa.'),
          });
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

  app.patch('/api/students/:id', resolveAuthedUser, requireRole(['admin']), async (req: AuthedRequest, res) => {
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

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const { data: existingClass } = await dbClient
          .from('classes')
          .select('id')
          .eq('name', cleanClass)
          .maybeSingle();

        let classId = existingClass?.id as string | undefined;
        if (!classId) {
          const gradeLevel = cleanClass.split(' ')[0] || 'XI';
          const { data: createdClass, error: clsErr } = await dbClient
            .from('classes')
            .insert({ name: cleanClass, major_code: cleanMajor, grade_level: gradeLevel })
            .select('id')
            .single();
          if (clsErr || !createdClass) {
            res.status(400).json({ error: formatSupabaseError(clsErr, 'Gagal memperbarui relasi kelas.') });
            return;
          }
          classId = createdClass.id;
        } else {
          await dbClient
            .from('classes')
            .update({ major_code: cleanMajor })
            .eq('id', classId);
        }

        const { data, error } = await dbClient
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

  app.delete('/api/students/:id', resolveAuthedUser, requireRole(['admin']), async (req: AuthedRequest, res) => {
    try {
      const { id } = req.params;
      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const { error } = await dbClient.from('students').delete().eq('id', id);
        if (error) {
          res.status(400).json({ error: formatSupabaseError(error, 'Gagal menghapus siswa.') });
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
  app.get('/api/attendance/student', resolveAuthedUser, requireRole(['admin', 'guru']), async (req: AuthedRequest, res) => {
    try {
      const date = String(req.query.date || getTodayDateString());

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const [{ data: students, error: stuErr }, { data: records, error: recErr }] =
          await Promise.all([
            dbClient
              .from('students')
              .select('id, nis, name, created_at, classes!inner(name, major_code)')
              .order('name', { ascending: true }),
            dbClient.from('student_attendance').select('*').eq('date', date),
          ]);

        if (stuErr || recErr) {
          const firstErr = stuErr || recErr;
          res.status(isMissingTableError(firstErr) ? 503 : 500).json({
            error: isMissingTableError(firstErr)
              ? SCHEMA_MISSING_MSG
              : formatSupabaseError(firstErr, 'Gagal memuat absensi siswa.'),
          });
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

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        const rows = sanitizedEntries.map((e) => ({
          student_id: e.studentId,
          recorded_by: currentUser.id,
          date: targetDate,
          status: e.status,
          notes: e.notes,
        }));

        const { error } = await dbClient
          .from('student_attendance')
          .upsert(rows, { onConflict: 'student_id,date' });

        if (error) {
          res.status(isMissingTableError(error) ? 503 : 500).json({
            error: isMissingTableError(error)
              ? SCHEMA_MISSING_MSG
              : formatSupabaseError(error, 'Gagal menyimpan absensi siswa.'),
          });
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
  app.get('/api/recap/employee', resolveAuthedUser, requireRole(['admin']), async (req: AuthedRequest, res) => {
    try {
      const startDate = String(req.query.startDate || '');
      const endDate = String(req.query.endDate || '');
      const roleFilter = String(req.query.role || 'all');

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        let query = dbClient
          .from('employee_attendance')
          .select('*, profiles(full_name, nip, role, jabatan)')
          .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query;
        if (error) {
          res.status(isMissingTableError(error) ? 503 : 500).json({
            error: isMissingTableError(error)
              ? SCHEMA_MISSING_MSG
              : formatSupabaseError(error, 'Gagal memuat rekap karyawan.'),
          });
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

  app.get('/api/recap/student', resolveAuthedUser, requireRole(['admin', 'guru']), async (req: AuthedRequest, res) => {
    try {
      const startDate = String(req.query.startDate || '');
      const endDate = String(req.query.endDate || '');
      const classFilter = String(req.query.className || 'all');
      const majorFilter = String(req.query.major || 'all');

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        const dbClient = (supabaseAdmin || req.supabase)!;
        let query = dbClient
          .from('student_attendance')
          .select('*, students!inner(nis, name, classes!inner(name, major_code)), profiles(full_name)')
          .order('date', { ascending: false });

        if (startDate) query = query.gte('date', startDate);
        if (endDate) query = query.lte('date', endDate);

        const { data, error } = await query;
        if (error) {
          res.status(isMissingTableError(error) ? 503 : 500).json({
            error: isMissingTableError(error)
              ? SCHEMA_MISSING_MSG
              : formatSupabaseError(error, 'Gagal memuat rekap siswa.'),
          });
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
  app.get('/api/admin/users', resolveAuthedUser, requireRole(['admin']), async (req: AuthedRequest, res) => {
    try {
      if (useSupabase && (supabaseAdmin || req.supabase)) {
        if (supabaseAdmin) {
          const [{ data: authList, error: authErr }, { data: profileList, error: profErr }] =
            await Promise.all([
              supabaseAdmin.auth.admin.listUsers({ perPage: 500 }),
              supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: true }),
            ]);

          if (authErr || (profErr && !isMissingTableError(profErr))) {
            res.status(500).json({
              error: formatSupabaseError(authErr || profErr, 'Gagal memuat daftar user dari Supabase.'),
            });
            return;
          }

          const profileMap = new Map(
            (profileList || []).map((p) => [p.id, mapSupabaseProfile(p as Record<string, unknown>)])
          );

          const sortedAuthUsers = [...(authList?.users || [])].sort((a, b) =>
            String(a.created_at || '').localeCompare(String(b.created_at || ''))
          );
          const earliestId = sortedAuthUsers[0]?.id || null;

          const syncedUsers = sortedAuthUsers.map((authUser) => {
            const prof = profileMap.get(authUser.id);
            if (prof) return prof;
            return mapAuthUserFallback(authUser as MinimalAuthUser, authUser.id === earliestId);
          });

          res.json({ users: syncedUsers });
          return;
        }

        const { data: profileList, error: profErr } = await req.supabase!
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: true });
        if (profErr) {
          res.status(500).json({
            error: formatSupabaseError(profErr, 'Gagal memuat daftar user dari Supabase.'),
          });
          return;
        }
        res.json({
          users: (profileList || []).map((p) => mapSupabaseProfile(p as Record<string, unknown>)),
        });
        return;
      }

      const db = readLocalDb();
      res.json({ users: db.users.map(sanitizeUser) });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Gagal memuat daftar user.' });
    }
  });

  app.post('/api/admin/users', resolveAuthedUser, requireRole(['admin']), async (req: AuthedRequest, res) => {
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

      if (useSupabase && supabasePublic) {
        if (supabaseAdmin) {
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
            res.status(400).json({
              error: formatSupabaseError(createErr, 'Gagal menambah user di Supabase Auth.'),
            });
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

          if (profErr && !isMissingTableError(profErr)) {
            res.status(500).json({ error: formatSupabaseError(profErr, 'Gagal menyimpan profil user.') });
            return;
          }

          const userOut =
            prof && !profErr
              ? mapSupabaseProfile(prof as Record<string, unknown>)
              : mapAuthUserFallback(created.user as MinimalAuthUser, false);

          res.status(201).json({ user: userOut });
          return;
        }

        // Fallback jika SUPABASE_SERVICE_ROLE_KEY masih berisi Publishable Key:
        const { data: signUpData, error: signUpErr } = await supabasePublic.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: cleanName,
              nip: (nip || '').trim(),
              jabatan: (jabatan || '').trim(),
              role: cleanRole,
            },
          },
        });

        if (signUpErr || !signUpData.user) {
          res.status(400).json({
            error: formatSupabaseError(signUpErr, 'Gagal menambah user di Supabase Auth.'),
          });
          return;
        }

        const { data: prof } = await req.supabase!
          .from('profiles')
          .upsert({
            id: signUpData.user.id,
            email: cleanEmail,
            full_name: cleanName,
            nip: (nip || '').trim(),
            jabatan: (jabatan || '').trim(),
            role: cleanRole,
          })
          .select('*')
          .maybeSingle();

        res.status(201).json({
          user: prof
            ? mapSupabaseProfile(prof as Record<string, unknown>)
            : mapAuthUserFallback(signUpData.user as MinimalAuthUser, false),
        });
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

      if (useSupabase && (supabaseAdmin || req.supabase)) {
        if (supabaseAdmin) {
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

          const { data: updatedAuth, error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
            id,
            authPayload
          );
          if (authErr) {
            res.status(400).json({ error: formatSupabaseError(authErr, 'Gagal memperbarui user di Supabase Auth.') });
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

          if (profErr && !isMissingTableError(profErr)) {
            res.status(500).json({ error: formatSupabaseError(profErr, 'Gagal memperbarui profil user.') });
            return;
          }

          const userOut =
            prof && !profErr
              ? mapSupabaseProfile(prof as Record<string, unknown>)
              : mapAuthUserFallback(
                  (updatedAuth?.user || {
                    id,
                    email: cleanEmail,
                    user_metadata: authPayload.user_metadata,
                  }) as MinimalAuthUser,
                  false
                );

          res.json({ user: userOut });
          return;
        }

        if (password) {
          res.status(400).json({
            error:
              'Mengubah kata sandi pengguna lain memerlukan Secret Key (service_role / sb_secret_...) pada secret SUPABASE_SERVICE_ROLE_KEY.',
          });
          return;
        }

        const { data: prof, error: profErr } = await req.supabase!
          .from('profiles')
          .update({
            full_name: cleanName,
            nip: (nip || '').trim(),
            jabatan: (jabatan || '').trim(),
            role: cleanRole,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select('*')
          .single();

        if (profErr) {
          res.status(500).json({ error: formatSupabaseError(profErr, 'Gagal memperbarui profil user.') });
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

      if (useSupabase) {
        if (!supabaseAdmin) {
          res.status(400).json({
            error:
              'Hard delete sampai ke Supabase Authentication membutuhkan Secret Key (service_role / sb_secret_...). Saat ini SUPABASE_SERVICE_ROLE_KEY masih berisi Publishable Key.',
          });
          return;
        }

        // Hard delete di Supabase Authentication (shouldSoftDelete = false)
        const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(id, false);
        if (delAuthErr) {
          res.status(400).json({ error: formatSupabaseError(delAuthErr, 'Gagal menghapus user dari Supabase Auth.') });
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

  app.get('/api/public-config', (_req, res) => {
    const safePublicKey = SUPABASE_ANON_KEY || (!hasRealServiceRole ? SUPABASE_SERVICE_ROLE_KEY : '');
    res.json({
      supabaseUrl: SUPABASE_URL || null,
      supabaseAnonKey: safePublicKey || null,
    });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      mode: useSupabase ? 'supabase' : 'local',
      adminKeyConfigured: hasRealServiceRole,
    });
  });

  app.get('/favicon.ico', (_req, res) => {
    res
      .status(200)
      .setHeader('Content-Type', 'image/svg+xml')
      .setHeader('Cache-Control', 'public, max-age=86400')
      .send(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#B91C1C"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="800" font-size="26" fill="white">PU</text></svg>`
      );
  });

  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'Endpoint API tidak ditemukan.' });
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
    const localDist = path.resolve(import.meta.dirname, 'dist');
    const distDir = fs.existsSync(localDist) ? localDist : path.resolve(process.cwd(), 'dist');
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
