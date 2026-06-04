-- Preferências de versículos por música e momentos ativos por registro na playlist

alter table public.musicas
  add column if not exists versiculo_prefs jsonb;

alter table public.versiculos_playlist
  add column if not exists momentos_ativos jsonb default '{"verso":true,"refrao":true,"ponte":true}'::jsonb;

comment on column public.musicas.versiculo_prefs is
  'Padrão da música: versao_biblica, quantidade_versiculos (1-3), momentos_ativos {verso,refrao,ponte}.';

comment on column public.versiculos_playlist.momentos_ativos is
  'Quais momentos (verso/refrão/ponte) exibir no teleprompter para esta música no evento.';
