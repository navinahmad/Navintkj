import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  EmployeeAttendanceStatus,
  MajorCode,
  StudentAttendanceStatus,
  UserRole,
} from '../types/app';

const VALID_ROLES: UserRole[] = ['admin', 'guru', 'tenaga_kependidikan'];
const VALID_MAJORS: MajorCode[] = ['TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD'];
const VALID_EMP_STATUS: EmployeeAttendanceStatus[] = ['hadir', 'izin', 'sakit', 'dinas_luar'];
const VALID_STU_STATUS: StudentAttendanceStatus[] = ['hadir', 'izin', 'sakit', 'alpha'];

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mapProfileRow(row: Record<string, unknown>) {
  const rawRole = String(row.role || 'tenaga_kependidikan');
  return {
    id: String(row.id),
    email: String(row.email || ''),
    fullName: String(row.full_name || ''),
    nip: String(row.nip || ''),
    jabatan: String(row.jabatan || ''),
    role: (VALID_ROLES.includes(rawRole as UserRole) ? rawRole : 'tenaga_kependidikan') as UserRole,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapStudentRow(row: Record<string, unknown>) {
  const clsRaw = row.classes;
  const cls = (Array.isArray(clsRaw) ? clsRaw[0] : clsRaw) as Record<string, unknown> | null;
  const rawMajor = String(cls?.major_code || 'TKJ');
  return {
    id: String(row.id),
    nis: String(row.nis || ''),
    name: String(row.name || ''),
    className: String(cls?.name || '-'),
    major: (VALID_MAJORS.includes(rawMajor as MajorCode) ? rawMajor : 'TKJ') as MajorCode,
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

function mapEmployeeAttendanceRow(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    date: String(row.date),
    checkInTime: row.check_in_time ? String(row.check_in_time) : null,
    checkOutTime: row.check_out_time ? String(row.check_out_time) : null,
    status: String(row.status || 'hadir') as EmployeeAttendanceStatus,
    notes: String(row.notes || ''),
    createdAt: String(row.created_at || new Date().toISOString()),
  };
}

async function resolveCurrentUser(client: SupabaseClient) {
  const { data: ensured, error: ensureErr } = await client.rpc('ensure_my_profile');
  if (!ensureErr && ensured) {
    return mapProfileRow(ensured as Record<string, unknown>);
  }
  const { data: authData } = await client.auth.getUser();
  if (!authData?.user) {
    throw new Error('Sesi tidak ditemukan. Silakan login kembali.');
  }
  const { data: prof, error: profErr } = await client
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();
  if (profErr || !prof) {
    throw new Error(profErr?.message || 'Gagal membaca profil pengguna di Supabase.');
  }
  return mapProfileRow(prof as Record<string, unknown>);
}

async function ensureClassId(client: SupabaseClient, className: string, major: MajorCode): Promise<string> {
  const cleanClass = className.trim();
  const { data: existing } = await client
    .from('classes')
    .select('id, major_code')
    .eq('name', cleanClass)
    .maybeSingle();

  if (existing?.id) {
    if (existing.major_code !== major) {
      await client.from('classes').update({ major_code: major }).eq('id', existing.id);
    }
    return String(existing.id);
  }

  const gradeLevel = cleanClass.split(' ')[0] || 'XI';
  const { data: created, error } = await client
    .from('classes')
    .insert({ name: cleanClass, major_code: major, grade_level: gradeLevel })
    .select('id')
    .single();

  if (error || !created?.id) {
    throw new Error(error?.message || 'Gagal membuat data kelas di Supabase.');
  }
  return String(created.id);
}

function parseBody(options: RequestInit): Record<string, unknown> {
  if (!options.body || typeof options.body !== 'string') return {};
  try {
    return JSON.parse(options.body) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export async function handleSupabaseFallback(
  client: SupabaseClient,
  rawPath: string,
  options: RequestInit = {}
): Promise<unknown> {
  const method = (options.method || 'GET').toUpperCase();
  const url = new URL(rawPath, 'http://localhost');
  const pathname = url.pathname;
  const body = parseBody(options);

  if (pathname === '/api/auth/bootstrap-status' && method === 'GET') {
    const { data: hasUsers, error } = await client.rpc('has_registered_users');
    return {
      hasUsers: Boolean(hasUsers),
      provider: 'supabase',
      supabaseConfigured: true,
      schemaReady: !error,
      adminSyncAvailable: false,
    };
  }

  if (pathname === '/api/auth/me' && method === 'GET') {
    const user = await resolveCurrentUser(client);
    return { user };
  }

  if (pathname === '/api/dashboard' && method === 'GET') {
    const currentUser = await resolveCurrentUser(client);
    const today = getTodayDateString();
    const [
      { data: myToday },
      { data: myHistory },
      { count: studentCount },
      { count: userCount },
      { data: todayEmp },
      { data: todayStu },
    ] = await Promise.all([
      client
        .from('employee_attendance')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .maybeSingle(),
      client
        .from('employee_attendance')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('date', { ascending: false })
        .limit(7),
      client.from('students').select('id', { count: 'exact' }).limit(1),
      client.from('profiles').select('id', { count: 'exact' }).limit(1),
      client.from('employee_attendance').select('status').eq('date', today),
      client.from('student_attendance').select('status').eq('date', today),
    ]);

    return {
      today,
      schemaReady: true,
      myTodayAttendance: myToday ? mapEmployeeAttendanceRow(myToday as Record<string, unknown>) : null,
      myRecentAttendance: (myHistory || []).map((r) =>
        mapEmployeeAttendanceRow(r as Record<string, unknown>)
      ),
      stats: {
        totalEmployees: userCount ?? 0,
        employeesPresentToday: (todayEmp || []).filter((r) => r.status === 'hadir').length,
        employeesAbsentToday: (todayEmp || []).filter((r) => r.status !== 'hadir').length,
        totalStudents: studentCount ?? 0,
        studentsPresentToday: (todayStu || []).filter((r) => r.status === 'hadir').length,
        studentsRecordedToday: (todayStu || []).length,
      },
    };
  }

  if (pathname === '/api/attendance/employee/me' && method === 'GET') {
    const currentUser = await resolveCurrentUser(client);
    const today = getTodayDateString();
    const { data, error } = await client
      .from('employee_attendance')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('date', { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const records = (data || []).map((r) => mapEmployeeAttendanceRow(r as Record<string, unknown>));
    return {
      today,
      todayRecord: records.find((r) => r.date === today) || null,
      records,
    };
  }

  if (pathname === '/api/attendance/employee/check-in' && method === 'POST') {
    const currentUser = await resolveCurrentUser(client);
    const today = getTodayDateString();
    const nowIso = new Date().toISOString();
    const rawStatus = String(body.status || 'hadir') as EmployeeAttendanceStatus;
    const cleanStatus = VALID_EMP_STATUS.includes(rawStatus) ? rawStatus : 'hadir';
    const cleanNotes = String(body.notes || '').trim();

    const { data: existing } = await client
      .from('employee_attendance')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('date', today)
      .maybeSingle();

    if (existing) {
      throw new Error('Anda sudah mencatat kehadiran masuk hari ini.');
    }

    const { data, error } = await client
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

    if (error) throw new Error(error.message);
    return { record: mapEmployeeAttendanceRow(data as Record<string, unknown>) };
  }

  if (pathname === '/api/attendance/employee/check-out' && method === 'POST') {
    const currentUser = await resolveCurrentUser(client);
    const today = getTodayDateString();
    const nowIso = new Date().toISOString();
    const cleanNotes = String(body.notes || '').trim();

    const { data: existing, error: findErr } = await client
      .from('employee_attendance')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('date', today)
      .maybeSingle();

    if (findErr || !existing) {
      throw new Error('Belum ada absensi masuk hari ini.');
    }
    if (existing.check_out_time) {
      throw new Error('Anda sudah melakukan check-out hari ini.');
    }

    const { data, error } = await client
      .from('employee_attendance')
      .update({
        check_out_time: nowIso,
        notes: cleanNotes || existing.notes || '',
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw new Error(error.message);
    return { record: mapEmployeeAttendanceRow(data as Record<string, unknown>) };
  }

  if (pathname === '/api/students' && method === 'GET') {
    const { data, error } = await client
      .from('students')
      .select('id, nis, name, created_at, classes(name, major_code)')
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return {
      students: (data || []).map((r) => mapStudentRow(r as Record<string, unknown>)),
    };
  }

  if (pathname === '/api/students' && method === 'POST') {
    const nis = String(body.nis || '').trim();
    const name = String(body.name || '').trim();
    const className = String(body.className || '').trim();
    const rawMajor = String(body.major || '') as MajorCode;
    if (!nis || !name || !className || !VALID_MAJORS.includes(rawMajor)) {
      throw new Error('NIS, nama siswa, kelas, dan jurusan wajib diisi.');
    }
    const classId = await ensureClassId(client, className, rawMajor);
    const { data, error } = await client
      .from('students')
      .insert({ nis, name, class_id: classId })
      .select('id, nis, name, created_at, classes(name, major_code)')
      .single();
    if (error) throw new Error(error.message);
    return { student: mapStudentRow(data as Record<string, unknown>) };
  }

  if (pathname.startsWith('/api/students/') && method === 'PATCH') {
    const id = pathname.slice('/api/students/'.length);
    const nis = String(body.nis || '').trim();
    const name = String(body.name || '').trim();
    const className = String(body.className || '').trim();
    const rawMajor = String(body.major || '') as MajorCode;
    if (!nis || !name || !className || !VALID_MAJORS.includes(rawMajor)) {
      throw new Error('NIS, nama siswa, kelas, dan jurusan wajib diisi.');
    }
    const classId = await ensureClassId(client, className, rawMajor);
    const { data, error } = await client
      .from('students')
      .update({
        nis,
        name,
        class_id: classId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, nis, name, created_at, classes(name, major_code)')
      .single();
    if (error) throw new Error(error.message);
    return { student: mapStudentRow(data as Record<string, unknown>) };
  }

  if (pathname.startsWith('/api/students/') && method === 'DELETE') {
    const id = pathname.slice('/api/students/'.length);
    const { error } = await client.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  }

  if (pathname === '/api/attendance/student' && method === 'GET') {
    const targetDate = url.searchParams.get('date') || getTodayDateString();
    const classFilter = url.searchParams.get('className') || 'all';
    const [{ data: stuData, error: stuErr }, { data: recData, error: recErr }] = await Promise.all([
      client
        .from('students')
        .select('id, nis, name, created_at, classes(name, major_code)')
        .order('name', { ascending: true }),
      client.from('student_attendance').select('*').eq('date', targetDate),
    ]);
    if (stuErr || recErr) throw new Error((stuErr || recErr)!.message);

    const students = (stuData || [])
      .map((r) => mapStudentRow(r as Record<string, unknown>))
      .filter((s) => classFilter === 'all' || s.className === classFilter);
    const records = (recData || []).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      recordedBy: r.recorded_by || '',
      date: r.date,
      status: r.status as StudentAttendanceStatus,
      notes: r.notes || '',
      createdAt: r.created_at,
    }));
    return { date: targetDate, students, records };
  }

  if (pathname === '/api/attendance/student/bulk' && method === 'POST') {
    const currentUser = await resolveCurrentUser(client);
    const targetDate = String(body.date || getTodayDateString());
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const rows = entries
      .map((e) => e as { studentId?: string; status?: StudentAttendanceStatus; notes?: string })
      .filter((e) => Boolean(e.studentId))
      .map((e) => ({
        student_id: String(e.studentId),
        recorded_by: currentUser.id,
        date: targetDate,
        status: VALID_STU_STATUS.includes(e.status as StudentAttendanceStatus)
          ? (e.status as StudentAttendanceStatus)
          : 'hadir',
        notes: String(e.notes || '').trim(),
      }));

    const { error } = await client
      .from('student_attendance')
      .upsert(rows, { onConflict: 'student_id,date' });
    if (error) throw new Error(error.message);
    return { success: true, count: rows.length, date: targetDate };
  }

  if (pathname === '/api/recap/employee' && method === 'GET') {
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    const roleFilter = url.searchParams.get('role') || 'all';
    let query = client
      .from('employee_attendance')
      .select('*, profiles(full_name, nip, role, jabatan)')
      .order('date', { ascending: false });
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const records = (data || [])
      .map((row) => {
        const prof = (row.profiles || {}) as Record<string, unknown>;
        return {
          ...mapEmployeeAttendanceRow(row as Record<string, unknown>),
          userName: String(prof.full_name || 'Pengguna'),
          userNip: String(prof.nip || '-'),
          userRole: String(prof.role || 'tenaga_kependidikan') as UserRole,
          userJabatan: String(prof.jabatan || '-'),
        };
      })
      .filter((r) => roleFilter === 'all' || r.userRole === roleFilter);
    return { records };
  }

  if (pathname === '/api/recap/student' && method === 'GET') {
    const startDate = url.searchParams.get('startDate') || '';
    const endDate = url.searchParams.get('endDate') || '';
    const classFilter = url.searchParams.get('className') || 'all';
    const majorFilter = url.searchParams.get('major') || 'all';

    let query = client
      .from('student_attendance')
      .select('*, students!inner(nis, name, classes!inner(name, major_code)), profiles(full_name)')
      .order('date', { ascending: false });
    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);
    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const records = (data || [])
      .map((row) => {
        const stu = (Array.isArray(row.students) ? row.students[0] : row.students) as Record<
          string,
          unknown
        > | null;
        const clsRaw = stu?.classes;
        const cls = (Array.isArray(clsRaw) ? clsRaw[0] : clsRaw) as Record<string, unknown> | null;
        const rec = (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as Record<
          string,
          unknown
        > | null;
        return {
          id: row.id,
          studentId: row.student_id,
          studentNis: String(stu?.nis || '-'),
          studentName: String(stu?.name || 'Siswa'),
          studentClassName: String(cls?.name || '-'),
          studentMajor: String(cls?.major_code || 'TKJ') as MajorCode,
          recordedBy: row.recorded_by || '',
          recordedByName: String(rec?.full_name || 'Guru/Admin'),
          date: row.date,
          status: row.status as StudentAttendanceStatus,
          notes: row.notes || '',
          createdAt: row.created_at,
        };
      })
      .filter((r) => {
        if (classFilter !== 'all' && r.studentClassName !== classFilter) return false;
        if (majorFilter !== 'all' && r.studentMajor !== majorFilter) return false;
        return true;
      });
    return { records };
  }

  if (pathname === '/api/admin/users' && method === 'GET') {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return { users: (data || []).map((p) => mapProfileRow(p as Record<string, unknown>)) };
  }

  if (pathname === '/api/admin/users' && method === 'POST') {
    const cleanEmail = String(body.email || '').trim().toLowerCase();
    const cleanName = String(body.fullName || '').trim();
    const password = String(body.password || '');
    const cleanRole = VALID_ROLES.includes(body.role as UserRole)
      ? (body.role as UserRole)
      : 'tenaga_kependidikan';

    const supabaseUrl =
      (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
    const supabaseAnonKey =
      (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
      (import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string | undefined) ||
      '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Konfigurasi Supabase belum tersedia untuk membuat akun baru.');
    }

    const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: signUpData, error: signUpErr } = await tempClient.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          nip: String(body.nip || '').trim(),
          jabatan: String(body.jabatan || '').trim(),
          role: cleanRole,
        },
      },
    });
    if (signUpErr || !signUpData.user) {
      throw new Error(signUpErr?.message || 'Gagal menambah user di Supabase Auth.');
    }

    const { data: prof } = await client
      .from('profiles')
      .upsert({
        id: signUpData.user.id,
        email: cleanEmail,
        full_name: cleanName,
        nip: String(body.nip || '').trim(),
        jabatan: String(body.jabatan || '').trim(),
        role: cleanRole,
      })
      .select('*')
      .maybeSingle();

    return {
      user: prof
        ? mapProfileRow(prof as Record<string, unknown>)
        : {
            id: signUpData.user.id,
            email: cleanEmail,
            fullName: cleanName,
            nip: String(body.nip || '').trim(),
            jabatan: String(body.jabatan || '').trim(),
            role: cleanRole,
            createdAt: new Date().toISOString(),
          },
    };
  }

  if (pathname.startsWith('/api/admin/users/') && method === 'PATCH') {
    const id = pathname.slice('/api/admin/users/'.length);
    if (body.password) {
      throw new Error(
        'Mengubah kata sandi pengguna lain memerlukan server Node dengan Secret Key (SUPABASE_SERVICE_ROLE_KEY).'
      );
    }
    const cleanRole = VALID_ROLES.includes(body.role as UserRole)
      ? (body.role as UserRole)
      : 'tenaga_kependidikan';
    const { data, error } = await client
      .from('profiles')
      .update({
        full_name: String(body.fullName || '').trim(),
        nip: String(body.nip || '').trim(),
        jabatan: String(body.jabatan || '').trim(),
        role: cleanRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return { user: mapProfileRow(data as Record<string, unknown>) };
  }

  if (pathname.startsWith('/api/admin/users/') && method === 'DELETE') {
    throw new Error(
      'Hard delete sampai ke Supabase Authentication memerlukan backend Node (npm start) dengan SUPABASE_SERVICE_ROLE_KEY.'
    );
  }

  throw new Error(`Endpoint ${pathname} tidak tersedia pada mode statis.`);
}
