-- Anotação por música só neste evento (não altera musica_anotacoes da pasta do ministro).
alter table public.playlist_itens
  add column if not exists anotacao_evento text;

comment on column public.playlist_itens.anotacao_evento is
  'Nota opcional desta música neste evento (ex.: tom do culto). Isolada da anotação pessoal em musica_anotacoes.';
