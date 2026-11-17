-- =====================================================================
-- TIS LKS · pembaruan database untuk menu LOG HARIAN
-- Jalankan SEKALI di Supabase: SQL Editor > New query > tempel > Run
-- Aman dijalankan ulang. Data lama tidak berubah.
-- =====================================================================

-- 1. Izinkan jenis data baru 'log' (log kegiatan harian asisten)
alter table public.records drop constraint if exists records_kind_check;
alter table public.records add constraint records_kind_check
  check (kind in ('mark','lock','done','gate','journal','log'));

-- 2. Tabel aktivitas otomatis: siapa melakukan apa, kapan
create table if not exists public.activity (
  id bigserial primary key,
  season_id uuid references public.seasons(id) on delete cascade,
  rec_id text,
  kind text,
  ref text,
  competitor_id uuid,
  action text,
  n int not null default 1,
  user_id uuid,
  first_at timestamptz not null default now(),
  at timestamptz not null default now()
);
create index if not exists activity_season_at_idx on public.activity(season_id, at desc);
alter table public.activity enable row level security;
drop policy if exists "activity read" on public.activity;
create policy "activity read" on public.activity for select to authenticated using (true);

-- 3. Catat otomatis setiap kali data latihan disimpan atau dihapus.
--    Simpan berulang pada data yang sama dalam 15 menit digabung jadi satu baris.
create or replace function public.log_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; u uuid := auth.uid(); act text; last_id bigint;
begin
  if u is null then return null; end if;
  if tg_op = 'DELETE' then
    r := old; act := 'hapus';
    if not exists (select 1 from public.seasons where id = old.season_id) then return null; end if;
    if old.competitor_id is not null and not exists (select 1 from public.competitors where id = old.competitor_id) then return null; end if;
  else
    r := new; act := case when tg_op = 'INSERT' then 'buat' else 'ubah' end;
  end if;
  if act <> 'hapus' then
    select id into last_id from public.activity
      where rec_id = r.id and user_id = u and action <> 'hapus' and at > now() - interval '15 minutes'
      order by at desc limit 1;
  end if;
  if last_id is not null then
    update public.activity set at = now(), n = n + 1 where id = last_id;
  else
    insert into public.activity (season_id, rec_id, kind, ref, competitor_id, action, user_id)
    values (r.season_id, r.id, r.kind, r.ref, r.competitor_id, act, u);
  end if;
  return null;
end $$;
drop trigger if exists records_activity on public.records;
create trigger records_activity after insert or update or delete on public.records
  for each row execute function public.log_activity();

-- 4. Kolom updated_by selalu berisi orang yang terakhir menyimpan
create or replace function public.stamp_record() returns trigger
language plpgsql as $$
begin new.updated_by := coalesce(auth.uid(), new.updated_by); return new; end $$;
drop trigger if exists records_stamp on public.records;
create trigger records_stamp before insert or update on public.records
  for each row execute function public.stamp_record();
