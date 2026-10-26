-- Ariana Smart (EDUCATIONAL DEMO) - Supabase schema + RLS. Run in the Supabase SQL Editor.
create extension if not exists "pgcrypto";

create type app_status as enum
 ('draft','submitted','under_review','documents_required','approved_demo','rejected','cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user','admin')),
  language text not null default 'en' check (language in ('en','fa','ps')),
  theme text not null default 'light' check (theme in ('light','dark')),
  created_at timestamptz not null default now()
);

create sequence public.application_ref_seq start 1000;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique
    default ('ASM-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.application_ref_seq')::text,6,'0')),
  user_id uuid not null references auth.users(id) on delete cascade,
  status app_status not null default 'submitted',
  full_name text not null,
  date_of_birth date not null,
  nationality text not null,
  email text not null,
  phone text,
  id_document_number text,          -- sensitive: never sent to Sheets, AI, or logs
  origin text not null,
  destination text not null,
  trip_type text not null check (trip_type in ('one_way','return')),
  depart_date date not null,
  return_date date,
  passengers int not null default 1 check (passengers between 1 and 9),
  consent_accepted boolean not null check (consent_accepted),
  idempotency_key text,
  sheet_sync_status text not null default 'pending'
    check (sheet_sync_status in ('pending','syncing','synced','failed','disabled')),
  sheet_synced_at timestamptz,
  sheet_sync_attempts int not null default 0,
  sheet_sync_error text,
  sheet_sync_started_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (origin <> destination),
  check (return_date is null or return_date >= depart_date),
  unique (user_id, idempotency_key)
);
create index on public.applications(user_id, created_at desc);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  doc_type text not null,
  storage_path text not null unique,   -- server-generated; never the user's filename
  mime_type text not null,
  size_bytes int not null,
  created_at timestamptz not null default now()
);
create index on public.application_documents(application_id);

create table public.application_status_history (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  old_status app_status,
  new_status app_status not null,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as
$$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.application_status_history enable row level security;

-- Profiles: own row only; role cannot be self-escalated.
create policy profiles_select on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select p.role from public.profiles p where p.id = auth.uid()));

-- Applications: users read their own rows only.
-- No user INSERT/UPDATE/DELETE: creation and status changes go through the backend (service role) or admins.
create policy apps_select on public.applications for select using (user_id = auth.uid() or public.is_admin());
-- (No user INSERT policy: Stage 4 moved application creation to the backend; see the Stage 4 block below.)
create policy apps_admin_update on public.applications for update using (public.is_admin());

create policy docs_select on public.application_documents for select using (user_id = auth.uid() or public.is_admin());
create policy history_select on public.application_status_history for select using (
  exists (select 1 from public.applications a
          where a.id = application_id and (a.user_id = auth.uid() or public.is_admin())));

-- ---------------------------------------------------------------------------------------------
-- Stage 4: applications are created ONLY by the backend (service role), after validation.
-- Direct inserts from the browser are blocked, so nobody can bypass validation or set their own
-- status/reference. Users still READ their own rows through RLS (apps_select).
-- ---------------------------------------------------------------------------------------------
drop policy if exists apps_insert on public.applications;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists applications_updated_at on public.applications;
create trigger applications_updated_at before update on public.applications
  for each row execute function public.set_updated_at();

-- Every new application and every status change is recorded in application_status_history (atomic).
create or replace function public.log_application_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.application_status_history(application_id, old_status, new_status, changed_by)
    values (new.id, null, new.status, new.user_id);
  elsif new.status is distinct from old.status then
    insert into public.application_status_history(application_id, old_status, new_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists applications_status_log on public.applications;
create trigger applications_status_log after insert or update on public.applications
  for each row execute function public.log_application_status();




-- ---------------------------------------------------------------------------------------------
-- Stage 5: private document uploads (identical to migrations/stage5_documents.sql).
-- Writes happen ONLY in the backend (service role); users read their own metadata via docs_select.
-- ---------------------------------------------------------------------------------------------
-- 1) Database-level guards behind the backend validation (defence in depth).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'application_documents_doc_type_check') then
    alter table public.application_documents add constraint application_documents_doc_type_check
      check (doc_type in ('passport','national_id','visa','supporting'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'application_documents_mime_check') then
    alter table public.application_documents add constraint application_documents_mime_check
      check (mime_type in ('application/pdf','image/jpeg','image/png'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'application_documents_size_check') then
    alter table public.application_documents add constraint application_documents_size_check
      check (size_bytes > 0 and size_bytes <= 10485760);
  end if;
end $$;
create index if not exists application_documents_user_idx on public.application_documents(user_id);

-- 2) Ownership consistency: a document's user_id must equal the owner of its application.
create or replace function public.check_document_owner() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.applications a where a.id = new.application_id and a.user_id = new.user_id) then
    raise exception 'document owner must match application owner';
  end if;
  return new;
end $$;
drop trigger if exists application_documents_owner on public.application_documents;
create trigger application_documents_owner before insert or update on public.application_documents
  for each row execute function public.check_document_owner();

-- 3) Users can only READ their own document METADATA (existing docs_select policy). No insert/update/delete policy:
--    all writes go through the backend (service role) after validation. Make that explicit and idempotent:
drop policy if exists docs_insert on public.application_documents;
drop policy if exists docs_update on public.application_documents;
drop policy if exists docs_delete on public.application_documents;

-- 4) Private bucket with server-side size/type limits, and NO storage.objects policies for anon/authenticated:
--    files can only be read through short-lived signed URLs issued by the backend to the owner.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('application-documents','application-documents', false, 10485760, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do update set public = false, file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf','image/jpeg','image/png'];


-- ---------------------------------------------------------------------------------------------
-- Stage 6: Google Sheets sync bookkeeping (identical to migrations/stage6_sheets.sql; columns are above).
-- ---------------------------------------------------------------------------------------------
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

-- Make yourself admin manually, once:
-- update public.profiles set role='admin' where id = '<your-auth-user-uuid>';
