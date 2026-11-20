-- ============================================================================
-- SMK Prima Unggul — Relational Supabase PostgreSQL Schema
-- Relasi Utama:
--   auth.users (1) ── (1) public.profiles
--   public.profiles (1) ── (N) public.employee_attendance
--   public.profiles (1) ── (N) public.student_attendance (recorded_by)
--   public.majors (1) ── (N) public.classes
--   public.classes (1) ── (N) public.students
--   public.students (1) ── (N) public.student_attendance
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Tabel Profiles (Relasi 1:1 ke auth.users di Supabase Authentication)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  nip text DEFAULT '',
  jabatan text DEFAULT '',
  role text NOT NULL CHECK (role IN ('admin', 'guru', 'tenaga_kependidikan')) DEFAULT 'tenaga_kependidikan',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger otomatis: User PERTAMA yang mendaftar di Supabase Auth otomatis jadi 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count integer;
  assigned_role text;
BEGIN
  SELECT count(*) INTO user_count FROM public.profiles;

  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := COALESCE(new.raw_user_meta_data->>'role', 'tenaga_kependidikan');
    IF assigned_role NOT IN ('admin', 'guru', 'tenaga_kependidikan') THEN
      assigned_role := 'tenaga_kependidikan';
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, nip, jabatan, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'nip', ''),
    COALESCE(new.raw_user_meta_data->>'jabatan', ''),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    nip = COALESCE(NULLIF(EXCLUDED.nip, ''), public.profiles.nip),
    jabatan = COALESCE(NULLIF(EXCLUDED.jabatan, ''), public.profiles.jabatan),
    updated_at = now();

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Tabel Jurusan / Kompetensi Keahlian (Master Relasi 1:N ke Classes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.majors (
  code text PRIMARY KEY CHECK (code IN ('TKJ', 'DKV', 'AK', 'BC', 'MPLB', 'BD')),
  name text NOT NULL,
  cluster text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.majors (code, name, cluster) VALUES
  ('TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi & Jaringan'),
  ('DKV', 'Desain Komunikasi Visual', 'Desain & Penyiaran Media'),
  ('BC', 'Broadcasting dan Perfilman', 'Desain & Penyiaran Media'),
  ('AK', 'Akuntansi dan Keuangan Lembaga', 'Bisnis & Manajemen'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis & Manajemen'),
  ('BD', 'Bisnis Digital', 'Bisnis & Manajemen')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  cluster = EXCLUDED.cluster;

-- ----------------------------------------------------------------------------
-- 3. Tabel Kelas (Relasi N:1 ke Majors & Opsional Wali Kelas ke Profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  major_code text NOT NULL REFERENCES public.majors(code) ON UPDATE CASCADE ON DELETE RESTRICT,
  grade_level text NOT NULL DEFAULT 'XI',
  homeroom_teacher_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classes_major_code ON public.classes(major_code);

INSERT INTO public.classes (name, major_code, grade_level) VALUES
  ('XI TKJ 1', 'TKJ', 'XI'),
  ('XI DKV 1', 'DKV', 'XI'),
  ('XI AK 1', 'AK', 'XI'),
  ('XI BC 1', 'BC', 'XI'),
  ('XI MPLB 1', 'MPLB', 'XI'),
  ('XI BD 1', 'BD', 'XI')
ON CONFLICT (name) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Tabel Data Siswa (Relasi N:1 ke Classes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nis text UNIQUE NOT NULL,
  name text NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);

-- ----------------------------------------------------------------------------
-- 5. Tabel Absensi Karyawan (Relasi N:1 ke Profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT current_date,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text NOT NULL CHECK (status IN ('hadir', 'izin', 'sakit', 'dinas_luar')) DEFAULT 'hadir',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_emp_att_user_date ON public.employee_attendance(user_id, date DESC);

-- ----------------------------------------------------------------------------
-- 6. Tabel Absensi Siswa (Relasi N:1 ke Students & Profiles pencatat)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  recorded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  date date NOT NULL DEFAULT current_date,
  status text NOT NULL CHECK (status IN ('hadir', 'izin', 'sakit', 'alpha')) DEFAULT 'hadir',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_stu_att_student_date ON public.student_attendance(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_stu_att_date ON public.student_attendance(date DESC);

-- ----------------------------------------------------------------------------
-- 7. Relational Views untuk Pelaporan & Rekap Cepat
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_students_detail AS
SELECT
  s.id,
  s.nis,
  s.name,
  s.class_id,
  c.name AS class_name,
  c.major_code AS major,
  m.name AS major_name,
  m.cluster AS major_cluster,
  s.created_at
FROM public.students s
JOIN public.classes c ON c.id = s.class_id
JOIN public.majors m ON m.code = c.major_code;

CREATE OR REPLACE VIEW public.v_student_attendance_recap AS
SELECT
  sa.id,
  sa.date,
  sa.status,
  sa.notes,
  sa.created_at,
  sa.student_id,
  s.nis AS student_nis,
  s.name AS student_name,
  c.name AS student_class_name,
  c.major_code AS student_major,
  sa.recorded_by,
  COALESCE(p.full_name, 'Guru/Admin') AS recorded_by_name
FROM public.student_attendance sa
JOIN public.students s ON s.id = sa.student_id
JOIN public.classes c ON c.id = s.class_id
LEFT JOIN public.profiles p ON p.id = sa.recorded_by;

-- ----------------------------------------------------------------------------
-- 8. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Profiles policies
DROP POLICY IF EXISTS "Profiles dapat dibaca oleh pemilik atau admin" ON public.profiles;
CREATE POLICY "Profiles dapat dibaca oleh pemilik atau admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Admin dapat mengelola semua profiles" ON public.profiles;
CREATE POLICY "Admin dapat mengelola semua profiles"
  ON public.profiles FOR ALL
  USING (public.current_user_role() = 'admin');

-- Majors & Classes policies
DROP POLICY IF EXISTS "Majors dapat dibaca semua user terautentikasi" ON public.majors;
CREATE POLICY "Majors dapat dibaca semua user terautentikasi"
  ON public.majors FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Classes dapat dibaca semua user terautentikasi" ON public.classes;
CREATE POLICY "Classes dapat dibaca semua user terautentikasi"
  ON public.classes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin dapat mengelola classes" ON public.classes;
CREATE POLICY "Admin dapat mengelola classes"
  ON public.classes FOR ALL
  USING (public.current_user_role() = 'admin');

-- Students policies
DROP POLICY IF EXISTS "Data siswa dapat dibaca oleh user terautentikasi" ON public.students;
CREATE POLICY "Data siswa dapat dibaca oleh user terautentikasi"
  ON public.students FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin dapat mengelola data siswa" ON public.students;
CREATE POLICY "Admin dapat mengelola data siswa"
  ON public.students FOR ALL
  USING (public.current_user_role() = 'admin');

-- Employee attendance policies
DROP POLICY IF EXISTS "Karyawan dapat membaca absensi pribadi atau admin membaca semua" ON public.employee_attendance;
CREATE POLICY "Karyawan dapat membaca absensi pribadi atau admin membaca semua"
  ON public.employee_attendance FOR SELECT
  USING (auth.uid() = user_id OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Karyawan dapat mengisi absensi pribadi" ON public.employee_attendance;
CREATE POLICY "Karyawan dapat mengisi absensi pribadi"
  ON public.employee_attendance FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Karyawan dapat memperbarui absensi pribadi (check-out)" ON public.employee_attendance;
CREATE POLICY "Karyawan dapat memperbarui absensi pribadi (check-out)"
  ON public.employee_attendance FOR UPDATE
  USING (auth.uid() = user_id OR public.current_user_role() = 'admin');

-- Student attendance policies
DROP POLICY IF EXISTS "Guru dan Admin dapat membaca absensi siswa" ON public.student_attendance;
CREATE POLICY "Guru dan Admin dapat membaca absensi siswa"
  ON public.student_attendance FOR SELECT
  USING (public.current_user_role() IN ('admin', 'guru'));

DROP POLICY IF EXISTS "Guru dan Admin dapat mencatat dan mengubah absensi siswa" ON public.student_attendance;
CREATE POLICY "Guru dan Admin dapat mencatat dan mengubah absensi siswa"
  ON public.student_attendance FOR ALL
  USING (public.current_user_role() IN ('admin', 'guru'));
