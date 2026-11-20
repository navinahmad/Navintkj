-- ============================================================================
-- SMK Prima Unggul — Data Awal Siswa (Jalankan setelah schema.sql)
-- Mengisi data siswa awal yang berelasi langsung ke tabel public.classes
-- ============================================================================

INSERT INTO public.students (nis, name, class_id)
SELECT seed.nis, seed.name, c.id
FROM (VALUES
  ('20261001', 'Aditya Pratama', 'XI TKJ 1'),
  ('20261002', 'Nabila Putri Rahayu', 'XI TKJ 1'),
  ('20261003', 'Rizky Maulana', 'XI TKJ 1'),
  ('20262001', 'Siti Aisyah', 'XI DKV 1'),
  ('20262002', 'Bagas Darmawan', 'XI DKV 1'),
  ('20262003', 'Keisha Maharani', 'XI DKV 1'),
  ('20263001', 'Dina Febrianti', 'XI AK 1'),
  ('20263002', 'Hendra Wijaya', 'XI AK 1'),
  ('20263003', 'Rani Puspitasari', 'XI AK 1'),
  ('20264001', 'Fajar Nugroho', 'XI BC 1'),
  ('20264002', 'Tara Melati', 'XI BC 1'),
  ('20264003', 'Galih Santoso', 'XI BC 1'),
  ('20265001', 'Intan Permatasari', 'XI MPLB 1'),
  ('20265002', 'Yusuf Ramadhan', 'XI MPLB 1'),
  ('20265003', 'Dewi Lestari', 'XI MPLB 1'),
  ('20266001', 'Alvin Kurniawan', 'XI BD 1'),
  ('20266002', 'Shinta Anggraini', 'XI BD 1'),
  ('20266003', 'Farhan Hidayat', 'XI BD 1')
) AS seed(nis, name, class_name)
JOIN public.classes c ON c.name = seed.class_name
ON CONFLICT (nis) DO NOTHING;
