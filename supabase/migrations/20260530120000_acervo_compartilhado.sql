-- CRASH Cifras — Acervo global compartilhado (esquema-acervo-compartilhado.md)
-- Camada aditiva: acervo global + cópia pessoal congelada em musicas/secoes_musica.

-- ---------------------------------------------------------------------------
-- Acervo: uma entrada por música real (global, sem dono)
-- ---------------------------------------------------------------------------
create table if not exists public.acervo_musicas (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (char_length(trim(titulo)) > 0),
  artista text,
  titulo_norm text not null,
  artista_norm text not null default '',
  fonte_url text,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'ready', 'failed')),
  versao_top_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists acervo_musicas_norm_idx
  on public.acervo_musicas (titulo_norm, artista_norm);

create unique index if not exists acervo_musicas_fonte_url_unique_idx
  on public.acervo_musicas (fonte_url)
  where fonte_url is not null and fonte_url <> '';

-- ---------------------------------------------------------------------------
-- Versões ranqueadas da cifra no acervo
-- ---------------------------------------------------------------------------
create table if not exists public.acervo_versoes (
  id uuid primary key default gen_random_uuid(),
  acervo_musica_id uuid not null references public.acervo_musicas (id) on delete cascade,
  cifra jsonb not null,
  tom_original text,
  bpm integer check (bpm is null or (bpm > 0 and bpm < 400)),
  hash_norm text not null,
  origem text not null default 'motor'
    check (origem in ('motor', 'correcao')),
  criado_por uuid references auth.users (id) on delete set null,
  convergencia_count integer not null default 0 check (convergencia_count >= 0),
  aceitacao_count integer not null default 0 check (aceitacao_count >= 0),
  score numeric not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists acervo_versoes_musica_idx
  on public.acervo_versoes (acervo_musica_id, score desc, created_at desc);

create index if not exists acervo_versoes_hash_idx
  on public.acervo_versoes (acervo_musica_id, hash_norm);

alter table public.acervo_musicas
  drop constraint if exists acervo_musicas_versao_top_id_fkey;

alter table public.acervo_musicas
  add constraint acervo_musicas_versao_top_id_fkey
  foreign key (versao_top_id) references public.acervo_versoes (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Cópia pessoal: linhagem com o acervo
-- ---------------------------------------------------------------------------
alter table public.musicas
  add column if not exists acervo_versao_id uuid references public.acervo_versoes (id) on delete set null;

create index if not exists musicas_acervo_versao_id_idx
  on public.musicas (acervo_versao_id)
  where acervo_versao_id is not null;

-- ---------------------------------------------------------------------------
-- Fila de geração: liga job ao acervo
-- ---------------------------------------------------------------------------
alter table public.import_jobs
  add column if not exists acervo_musica_id uuid references public.acervo_musicas (id) on delete set null;

create index if not exists import_jobs_acervo_musica_id_idx
  on public.import_jobs (acervo_musica_id)
  where acervo_musica_id is not null;

-- ---------------------------------------------------------------------------
-- updated_at no acervo
-- ---------------------------------------------------------------------------
drop trigger if exists acervo_musicas_updated_at on public.acervo_musicas;
create trigger acervo_musicas_updated_at
  before update on public.acervo_musicas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: leitura pública; escrita só service role (sem policies de write)
-- ---------------------------------------------------------------------------
alter table public.acervo_musicas enable row level security;
alter table public.acervo_versoes enable row level security;

drop policy if exists "acervo_musicas_select_all" on public.acervo_musicas;
create policy "acervo_musicas_select_all"
  on public.acervo_musicas for select
  using (true);

drop policy if exists "acervo_versoes_select_all" on public.acervo_versoes;
create policy "acervo_versoes_select_all"
  on public.acervo_versoes for select
  using (true);

comment on table public.acervo_musicas is
  'Biblioteca global de músicas (uma entrada por música real).';
comment on table public.acervo_versoes is
  'Versões de cifra ranqueadas por convergência e aceitação.';
comment on column public.musicas.acervo_versao_id is
  'Versão do acervo da qual nasceu esta cópia pessoal congelada.';
comment on column public.import_jobs.acervo_musica_id is
  'Acervo em geração associado a este job (fila do motor).';
