-- =====================================================================
-- TIS LKS · pembaruan database untuk menu PENILAIAN HARIAN (v2027.9)
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel > Run
-- Aman dijalankan ulang. Data lama tidak berubah.
-- =====================================================================
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('mark','lock','done','gate','journal','log','photo','harian'));

-- Penyimpanan file: foto hasil + gambar/file soal (PDF), maks 10 MB per file
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tis-foto', 'tis-foto', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "tis foto read" on storage.objects;
create policy "tis foto read" on storage.objects for select to authenticated
  using (bucket_id = 'tis-foto');
drop policy if exists "tis foto insert" on storage.objects;
create policy "tis foto insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'tis-foto' and public.my_role() in ('admin','juri'));
drop policy if exists "tis foto delete" on storage.objects;
create policy "tis foto delete" on storage.objects for delete to authenticated
  using (bucket_id = 'tis-foto' and public.my_role() in ('admin','juri'));
