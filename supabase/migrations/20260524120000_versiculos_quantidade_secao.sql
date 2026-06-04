-- Preferências de versículos por música na playlist (revisão + teleprompter)

alter table public.versiculos_playlist
  add column if not exists quantidade_versiculos integer default 1;

alter table public.versiculos_playlist
  add column if not exists secao_id text;

-- Garantir valores válidos para registros existentes
update public.versiculos_playlist
set quantidade_versiculos = 1
where quantidade_versiculos is null;

alter table public.versiculos_playlist
  alter column quantidade_versiculos set default 1;

comment on column public.versiculos_playlist.quantidade_versiculos is
  'Quantos versículos exibir: 1=verso, 2=verso+refrão, 3=verso+refrão+ponte.';

comment on column public.versiculos_playlist.secao_id is
  'Opcional. Mapeamento de seção por versículo fica em versiculos (jsonb) → secao_id em cada item.';
