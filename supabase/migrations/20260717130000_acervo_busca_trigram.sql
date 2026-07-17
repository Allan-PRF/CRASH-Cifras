-- Busca unificada do acervo por trechos de título/artista.
--
-- O índice B-tree existente (titulo_norm, artista_norm) continua útil para
-- igualdade exata da anti-duplicata. Para ILIKE '%termo%' é necessário
-- pg_trgm + GIN, evitando varredura completa conforme o acervo crescer.

create extension if not exists pg_trgm with schema extensions;

set local search_path = public, extensions;

create index if not exists acervo_musicas_titulo_norm_trgm_idx
  on public.acervo_musicas
  using gin (titulo_norm gin_trgm_ops)
  where status = 'ready';

create index if not exists acervo_musicas_artista_norm_trgm_idx
  on public.acervo_musicas
  using gin (artista_norm gin_trgm_ops)
  where status = 'ready';
