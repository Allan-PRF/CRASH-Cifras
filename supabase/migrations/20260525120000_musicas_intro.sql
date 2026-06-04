-- Card de Introdução (mão esquerda / mão direita) como JSONB na tabela musicas
alter table public.musicas
  add column if not exists intro jsonb;

comment on column public.musicas.intro is
  'Introdução: { "mao_esquerda": "...", "mao_direita": "..." }. Null = vazio = não exibir no teleprompter.';
