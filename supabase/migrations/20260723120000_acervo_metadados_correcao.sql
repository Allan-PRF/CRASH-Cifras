-- Auditoria de correção de metadados em acervo_musicas (fonte_url / titulo / artista).
-- Não altera acervo_versoes nem cifras. Rodar manualmente no Supabase SQL Editor se necessário.

alter table public.acervo_musicas
  add column if not exists metadados_corrigido_por uuid references auth.users (id) on delete set null,
  add column if not exists metadados_corrigido_em timestamptz,
  add column if not exists metadados_corrigido_antes jsonb;

comment on column public.acervo_musicas.metadados_corrigido_por is
  'Admin que corrigiu metadados (fonte_url/titulo/artista). Cifra das versões intacta.';

comment on column public.acervo_musicas.metadados_corrigido_em is
  'Momento da última correção de metadados da entrada.';

comment on column public.acervo_musicas.metadados_corrigido_antes is
  'Snapshot dos campos alterados antes da última correção (ex.: {fonte_url, titulo, artista}).';
