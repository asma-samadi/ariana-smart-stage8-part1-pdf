-- Ariana Smart: Stage 6 MIGRATION (Google Sheets synchronisation bookkeeping).
-- Run ONLY if you already ran schema.sql from Stage 1-5. New projects: run the updated schema.sql instead.
-- Safe to run more than once. NOT yet run against a real Supabase project.
-- Supabase remains the primary database; the sheet is a one-way, minimal copy for administrators.

-- 1) Bookkeeping columns + the extra 'syncing' state (a row is "claimed" while one worker pushes it).
alter table public.applications add column if not exists sheet_synced_at timestamptz;
alter table public.applications add column if not exists sheet_sync_attempts int not null default 0;
alter table public.applications add column if not exists sheet_sync_error text;          -- short code only, never a raw error message
alter table public.applications add column if not exists sheet_sync_started_at timestamptz;

alter table public.applications drop constraint if exists applications_sheet_sync_status_check;
alter table public.applications add constraint applications_sheet_sync_status_check
  check (sheet_sync_status in ('pending','syncing','synced','failed','disabled'));

create index if not exists applications_sheet_sync_idx on public.applications(sheet_sync_status, created_at);

-- 2) Atomic claim = reliable duplicate prevention. Exactly one caller gets the row; everyone else gets nothing.
--    A claim older than 5 minutes is considered abandoned (worker crashed) and may be taken again.
--    It returns ONLY the columns that are allowed to reach Google Sheets (no name, email, phone, DOB, id number).
create or replace function public.claim_sheet_sync(p_id uuid)
returns table (reference text, created_at timestamptz, status app_status, origin text, destination text,
               trip_type text, depart_date date, return_date date, passengers int, nationality text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  update public.applications a
     set sheet_sync_status = 'syncing',
         sheet_sync_started_at = now(),
         sheet_sync_attempts = a.sheet_sync_attempts + 1
   where a.id = p_id
     and (a.sheet_sync_status in ('pending','failed','disabled')
          or (a.sheet_sync_status = 'syncing' and a.sheet_sync_started_at < now() - interval '5 minutes'))
  returning a.reference, a.created_at, a.status, a.origin, a.destination,
            a.trip_type, a.depart_date, a.return_date, a.passengers, a.nationality;
end $$;

-- Only the backend (service role) may call it. Browsers (anon/authenticated) can not.
revoke all on function public.claim_sheet_sync(uuid) from public, anon, authenticated;
grant execute on function public.claim_sheet_sync(uuid) to service_role;
