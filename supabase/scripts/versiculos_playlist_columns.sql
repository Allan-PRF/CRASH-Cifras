-- Cole no Supabase Dashboard → SQL Editor → Run
-- Depois reinicie o backend (npm run dev na raiz ou npm run dev -w backend)

alter table public.versiculos_playlist
  add column if not exists quantidade_versiculos integer default 1;

alter table public.versiculos_playlist
  add column if not exists secao_id text;

update public.versiculos_playlist
set quantidade_versiculos = 1
where quantidade_versiculos is null;
