-- Soft-unpublish do acervo: visibilidade no catálogo independente do status do motor.
-- status continua pending/processing/ready/failed; publicado controla busca/Explorar/atalho.
-- Rodar manualmente no Supabase SQL Editor se o deploy não aplicar migrations.

alter table public.acervo_musicas
  add column if not exists publicado boolean not null default true,
  add column if not exists despublicado_por uuid references auth.users (id) on delete set null,
  add column if not exists despublicado_em timestamptz,
  add column if not exists republicado_por uuid references auth.users (id) on delete set null,
  add column if not exists republicado_em timestamptz;

comment on column public.acervo_musicas.publicado is
  'Catálogo público: true = aparece em busca/Explorar/atalho por URL. Independente de status do motor. Soft-unpublish = false; não apaga versões nem cópias.';

comment on column public.acervo_musicas.despublicado_por is
  'Admin que tirou a entrada do catálogo (último soft-unpublish).';

comment on column public.acervo_musicas.despublicado_em is
  'Momento do último soft-unpublish.';

comment on column public.acervo_musicas.republicado_por is
  'Admin que devolveu a entrada ao catálogo (última republicação).';

comment on column public.acervo_musicas.republicado_em is
  'Momento da última republicação.';

-- Busca trigram: só entradas no catálogo (ready + publicadas)
drop index if exists public.acervo_musicas_titulo_norm_trgm_idx;
drop index if exists public.acervo_musicas_artista_norm_trgm_idx;

create extension if not exists pg_trgm with schema extensions;

set local search_path = public, extensions;

create index if not exists acervo_musicas_titulo_norm_trgm_idx
  on public.acervo_musicas
  using gin (titulo_norm gin_trgm_ops)
  where status = 'ready' and publicado = true;

create index if not exists acervo_musicas_artista_norm_trgm_idx
  on public.acervo_musicas
  using gin (artista_norm gin_trgm_ops)
  where status = 'ready' and publicado = true;
