-- CRASH Cifras — Trial gratuito de 10 dias

alter table public.user_settings
  add column if not exists data_inicio_trial timestamptz,
  add column if not exists data_fim_trial timestamptz,
  add column if not exists trial_email_2_dias_enviado_em timestamptz;

alter table public.user_settings
  drop constraint if exists user_settings_assinatura_status_check;

alter table public.user_settings
  add constraint user_settings_assinatura_status_check
  check (assinatura_status in ('inativa', 'trial', 'pendente', 'ativa', 'atrasada', 'cancelada'));

-- Ativa trial para usuários já existentes que ainda não têm assinatura ativa.
update public.user_settings
set
  assinatura_status = 'trial',
  data_inicio_trial = coalesce(data_inicio_trial, now()),
  data_fim_trial = coalesce(data_fim_trial, now() + interval '10 days'),
  assinatura_provider = coalesce(assinatura_provider, 'trial')
where assinatura_status is distinct from 'ativa'
  and data_inicio_trial is null;

create table if not exists public.trial_emails (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  tipo varchar(30) not null,
  destinatario text not null,
  assunto text not null,
  status varchar(20) not null default 'pendente',
  payload jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now(),
  enviado_em timestamptz,
  unique (user_id, tipo)
);

alter table public.trial_emails enable row level security;

drop policy if exists "trial_emails_select_own" on public.trial_emails;
create policy "trial_emails_select_own"
  on public.trial_emails for select
  using (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
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
    data_fim_trial
  )
  values (
    new.id,
    'trial',
    'trial',
    now(),
    now() + interval '10 days'
  )
  on conflict (user_id) do update
    set
      assinatura_status = case
        when public.user_settings.assinatura_status = 'ativa' then 'ativa'
        else 'trial'
      end,
      assinatura_provider = coalesce(public.user_settings.assinatura_provider, 'trial'),
      data_inicio_trial = coalesce(public.user_settings.data_inicio_trial, now()),
      data_fim_trial = coalesce(public.user_settings.data_fim_trial, now() + interval '10 days');

  return new;
end;
$$;

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
          then 'igreja'
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
