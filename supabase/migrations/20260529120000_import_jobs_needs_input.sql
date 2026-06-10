-- Permite status needs_input quando o YouTube bloqueia metadados e o usuário deve informar nome/artista.
alter table public.import_jobs
  drop constraint if exists import_jobs_status_check;

alter table public.import_jobs
  add constraint import_jobs_status_check
  check (status in ('pending', 'processing', 'needs_input', 'completed', 'failed'));
