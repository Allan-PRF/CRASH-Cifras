-- Cifra editada só para este evento (não altera musicas / secoes_musica do ministro).
alter table public.playlist_itens
  add column if not exists cifra_evento jsonb;

comment on column public.playlist_itens.cifra_evento is
  'Snapshot opcional da cifra (intro + seções) usado no teleprompter deste evento.';
