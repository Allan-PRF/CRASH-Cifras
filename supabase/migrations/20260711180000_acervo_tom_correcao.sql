-- Etapa B: auditoria de correção de tom_original em versões origem=motor (metadado only).

alter table public.acervo_versoes
  add column if not exists tom_original_corrigido_por uuid references auth.users (id) on delete set null,
  add column if not exists tom_original_corrigido_em timestamptz;

comment on column public.acervo_versoes.tom_original_corrigido_por is
  'Usuário que corrigiu tom_original da versão motor (cifra.secoes intacta).';

comment on column public.acervo_versoes.tom_original_corrigido_em is
  'Momento da correção de tom_original na versão motor.';
