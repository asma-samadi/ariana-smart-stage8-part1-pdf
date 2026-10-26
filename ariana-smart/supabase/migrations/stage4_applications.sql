-- Ariana Smart: Stage 4 MIGRATION.
-- Run this ONLY if you already ran the Stage 1-3 schema.sql. New projects: run the updated schema.sql instead.
-- Safe to run more than once.

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
