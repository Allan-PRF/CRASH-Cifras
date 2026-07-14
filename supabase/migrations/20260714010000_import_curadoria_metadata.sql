-- Importação por arquivo (curadoria): metadata na cópia pessoal + origem no acervo.

alter table public.musicas
  add column if not exists origem_importacao text
    check (origem_importacao is null or origem_importacao in ('curadoria', 'youtube', 'manual')),
  add column if not exists importado_em timestamptz,
  add column if not exists arquivo_origem text;

comment on column public.musicas.origem_importacao is
  'Proveniência da cifra: curadoria (arquivo), youtube (motor), manual.';
comment on column public.musicas.importado_em is
  'Quando a música foi importada de arquivo.';
comment on column public.musicas.arquivo_origem is
  'Nome do arquivo original (ODT/PDF/DOCX/TXT).';

-- Acervo: permite versões de curadoria (admin / importação em lote)
alter table public.acervo_versoes
  drop constraint if exists acervo_versoes_origem_check;

alter table public.acervo_versoes
  add constraint acervo_versoes_origem_check
  check (origem in ('motor', 'correcao', 'curadoria'));
