-- Etapa D: reportes de tom errado na fonte (após correção única).

create table if not exists public.report_tom (
  id uuid primary key default gen_random_uuid(),
  acervo_versao_id uuid not null references public.acervo_versoes (id) on delete cascade,
  musica_id uuid not null references public.musicas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  tom_sugerido text not null,
  comentario text,
  status text not null default 'pendente'
    check (status in ('pendente', 'resolvido')),
  created_at timestamptz not null default now()
);

create index if not exists report_tom_versao_status_idx
  on public.report_tom (acervo_versao_id, status);

create index if not exists report_tom_pendentes_idx
  on public.report_tom (status, created_at desc)
  where status = 'pendente';

alter table public.report_tom enable row level security;

drop policy if exists "report_tom_select_own" on public.report_tom;
create policy "report_tom_select_own"
  on public.report_tom for select
  using (auth.uid() = user_id);

drop policy if exists "report_tom_insert_own" on public.report_tom;
create policy "report_tom_insert_own"
  on public.report_tom for insert
  with check (auth.uid() = user_id);

comment on table public.report_tom is
  'Reportes de tom errado na fonte motor (após correção única na versão).';
