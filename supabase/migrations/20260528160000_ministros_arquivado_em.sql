-- CRASH Cifras — soft-delete de ministros (arquivar/restaurar, acervo preservado)

alter table public.ministros
  add column if not exists arquivado_em timestamptz null;

comment on column public.ministros.arquivado_em is
  'Quando preenchido, o ministro está arquivado (oculto da lista principal). NULL = ativo. Arquivar não apaga músicas nem acervo.';

create index if not exists ministros_user_ativos_idx
  on public.ministros (user_id)
  where arquivado_em is null;
