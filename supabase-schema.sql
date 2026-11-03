-- Run in Supabase SQL Editor after creating the project.
-- SECURITY: authenticated accounts can currently read/write ALL schedules.
-- Restrict invitations to approved hospital users; implement roles before production use.
create extension if not exists pgcrypto;
create table if not exists public.surgery_cases (
 id uuid primary key default gen_random_uuid(),
 date date not null,
 ptv text not null check (ptv in ('Dũng A','Minh','Việt','Nhật Anh','Dũng B','Thanh','Quyết','Khánh','Túc','Hải','Khương','Trường')),
 patient text not null, age text, diagnosis text, equipment text, request text,
 "table" text, assistant text, anesthesia text, time text,
 notes jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.surgery_archives (
 id uuid primary key default gen_random_uuid(),
 date date not null unique,
 cases jsonb not null,
 archived_at timestamptz not null default now()
);
create index if not exists cases_date_idx on public.surgery_cases(date);
create index if not exists archives_date_idx on public.surgery_archives(date);
alter table public.surgery_cases enable row level security;
alter table public.surgery_archives enable row level security;
-- Login is mandatory; turn OFF Supabase Auth public sign-ups and invite trusted users only.
drop policy if exists cases_authenticated on public.surgery_cases;
create policy cases_authenticated on public.surgery_cases for all to authenticated using (true) with check (true);
drop policy if exists archive_read on public.surgery_archives;
create policy archive_read on public.surgery_archives for select to authenticated using (true);
-- No direct user edits to archive table; mutations are exclusively via controlled RPC.
create or replace function public.archive_surgery_date(p_date date)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if exists (select 1 from public.surgery_archives where date=p_date) then raise exception 'Date already archived'; end if;
 if not exists (select 1 from public.surgery_cases where date=p_date) then raise exception 'No cases to archive'; end if;
 insert into public.surgery_archives(date,cases)
 select p_date,coalesce(jsonb_agg(to_jsonb(c) order by c.created_at),'[]'::jsonb)
 from public.surgery_cases c where c.date=p_date;
 delete from public.surgery_cases where date=p_date;
end;$$;
revoke all on function public.archive_surgery_date(date) from public,anon;
grant execute on function public.archive_surgery_date(date) to authenticated;

-- OPTIONAL automation at 14:00 Vietnam time:
-- Do not schedule until the date semantics have been confirmed by the operating room team.
-- Install pg_cron (Database > Extensions), then execute the following with SQL Editor.
-- PostgreSQL scheduled jobs run in UTC; 14:00 Asia/Ho_Chi_Minh = 07:00 UTC.
-- An archive of today's date is made only if there are cases, without overwriting existing history.
--
-- create or replace function public.auto_archive_today()
-- returns void language plpgsql security definer set search_path = '' as $$
-- declare d date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
-- begin
--   if not exists (select 1 from public.surgery_archives where date=d)
--      and exists (select 1 from public.surgery_cases where date=d) then
--     insert into public.surgery_archives(date,cases)
--     select d, jsonb_agg(to_jsonb(c) order by c.created_at) from public.surgery_cases c where c.date=d;
--     delete from public.surgery_cases where date=d;
--   end if;
-- end;$$;
-- select cron.schedule('ctch-archive-14h','0 7 * * *', 'select public.auto_archive_today();');
