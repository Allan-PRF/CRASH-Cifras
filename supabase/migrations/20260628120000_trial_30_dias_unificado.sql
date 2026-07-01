-- CRASH Cifras — Trial unificado: 30 dias para todos os novos cadastros
-- IMPORTANTE: esta migration NÃO executa UPDATE em user_settings.
-- Trials existentes (data_fim_trial já gravada) permanecem inalterados.
-- Apenas novos signups passam a receber 30 dias via handle_new_user().

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
  v_trial_dias integer := 30;
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
