-- Remove tom padrão do ministro (obsoleto: tom é da canção, não da pasta).
alter table public.ministros
  drop column if exists tom_padrao;
