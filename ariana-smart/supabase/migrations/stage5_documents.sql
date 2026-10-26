-- Ariana Smart: Stage 5 MIGRATION (private document uploads).
-- Run ONLY if you already ran schema.sql from Stage 1-4. New projects: run the updated schema.sql instead.
-- Safe to run more than once. Reuses the existing public.application_documents table (no duplicate table).
-- NOT yet run against a real Supabase project.

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
