-- CRASH Cifras — Trial dinâmico por plano (Solo 10d, Equipe 20d)

alter table public.user_settings
  add column if not exists plano_trial varchar(20) default 'equipe';

-- Usuários existentes em trial mantêm o trial atual (equipe por padrão)
update public.user_settings
set plano_trial = 'equipe'
where assinatura_status = 'trial'
  and plano_trial is null;

-- Atualiza handle_new_user() para suportar trial dinâmico
-- Novos usuários recebem trial de equipe (20 dias) por padrão
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plano_trial varchar(20) := coalesce(
    new.raw_user_meta_data ->> 'plano_trial',
    'equipe'
  );
  v_trial_dias integer := case
    when v_plano_trial = 'solo' then 10
    else 20
  end;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.user_settings (
    user_id,
    assinatura_status,
    assinatura_provider,
    data_inicio_trial,
    data_fim_trial,
    plano_trial
  )
  values (
    new.id,
    'trial',
    'trial',
    now(),
    now() + (v_trial_dias || ' days')::interval,
    v_plano_trial
  )
  on conflict (user_id) do update
    set
      assinatura_status = case
        when public.user_settings.assinatura_status = 'ativa' then 'ativa'
        else 'trial'
      end,
      assinatura_provider = coalesce(public.user_settings.assinatura_provider, 'trial'),
      data_inicio_trial = coalesce(public.user_settings.data_inicio_trial, now()),
      data_fim_trial = coalesce(
        public.user_settings.data_fim_trial,
        now() + (v_trial_dias || ' days')::interval
      ),
      plano_trial = coalesce(public.user_settings.plano_trial, v_plano_trial);

  return new;
end;
$$;

-- Atualiza current_user_plan() para retornar o plano do trial
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
          then coalesce(plano_trial, 'equipe')
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
