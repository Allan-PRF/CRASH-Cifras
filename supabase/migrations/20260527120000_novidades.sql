-- CRASH Cifras — Novidades (banner + admin)

create table if not exists public.novidades (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) > 0),
  descricao text not null check (char_length(trim(descricao)) > 0),
  video_url text,
  ativo boolean not null default false,
  criado_em timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists novidades_ativo_criado_idx
  on public.novidades (ativo, criado_em desc);

alter table public.novidades enable row level security;

-- Leitura pública apenas de novidades ativas (opcional; API usa service role)
drop policy if exists "novidades_select_ativo" on public.novidades;
create policy "novidades_select_ativo"
  on public.novidades for select
  using (ativo = true);

drop trigger if exists novidades_updated_at on public.novidades;
create trigger novidades_updated_at
  before update on public.novidades
  for each row execute function public.set_updated_at();
