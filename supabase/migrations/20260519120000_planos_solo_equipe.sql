-- Planos finais: Solo e Equipe (substitui Músico, Banda e Igreja)

update public.assinaturas
set plano = case
  when plano in ('musico', 'banda') then 'solo'
  when plano = 'igreja' then 'equipe'
  else plano
end
where plano in ('musico', 'banda', 'igreja');

update public.pagamentos_assinatura
set plano = case
  when plano in ('musico', 'banda') then 'solo'
  when plano = 'igreja' then 'equipe'
  else plano
end
where plano in ('musico', 'banda', 'igreja');

update public.user_settings
set plano = case
  when plano in ('musico', 'banda') then 'solo'
  when plano = 'igreja' then 'equipe'
  else plano
end
where plano in ('musico', 'banda', 'igreja');

alter table public.assinaturas
  drop constraint if exists assinaturas_plano_check;

alter table public.assinaturas
  add constraint assinaturas_plano_check
  check (plano in ('solo', 'equipe'));

alter table public.pagamentos_assinatura
  drop constraint if exists pagamentos_assinatura_plano_check;

alter table public.pagamentos_assinatura
  add constraint pagamentos_assinatura_plano_check
  check (plano in ('solo', 'equipe'));

create or replace function public.current_user_plan()
returns text
language sql
security definer
set search_path = public
as $$
  select coalesce(
    (
      select case
        when assinatura_status = 'trial'
          and data_fim_trial is not null
          and data_fim_trial > now()
          then 'equipe'
        when assinatura_status = 'ativa'
          and (assinatura_expira_em is null or assinatura_expira_em > now())
          then plano
        else null
      end
      from public.user_settings
      where user_id = auth.uid()
      limit 1
    ),
    'gratuito'
  );
$$;
