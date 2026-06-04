-- CRASH Cifras — Sistema de indicação

alter table public.profiles
  add column if not exists referral_code varchar(12) unique,
  add column if not exists referred_by_user_id uuid references auth.users (id) on delete set null;

create index if not exists profiles_referral_code_idx
  on public.profiles (lower(referral_code));

create index if not exists profiles_referred_by_idx
  on public.profiles (referred_by_user_id);

alter table public.user_settings
  add column if not exists meses_bonus_restantes integer not null default 0
    check (meses_bonus_restantes >= 0),
  add column if not exists meses_bonus_acumulados integer not null default 0
    check (meses_bonus_acumulados >= 0),
  add column if not exists proxima_cobranca_em timestamptz,
  add column if not exists cobranca_pausada_ate timestamptz;

create table if not exists public.referral_conversions (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid not null references auth.users (id) on delete cascade,
  referred_user_id uuid not null references auth.users (id) on delete cascade,
  plano varchar(20) not null check (plano in ('solo', 'equipe')),
  meses_creditados integer not null check (meses_creditados > 0),
  assinatura_id uuid references public.assinaturas (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (referred_user_id)
);

create index if not exists referral_conversions_referrer_idx
  on public.referral_conversions (referrer_user_id, created_at desc);

alter table public.referral_conversions enable row level security;

drop policy if exists "referral_conversions_select_as_referrer" on public.referral_conversions;
create policy "referral_conversions_select_as_referrer"
  on public.referral_conversions for select
  using (auth.uid() = referrer_user_id);

create or replace function public.generate_referral_code()
returns text
language plpgsql
as $$
declare
  candidate text;
  tries integer := 0;
begin
  loop
    candidate := upper(substr(encode(gen_random_bytes(5), 'hex'), 1, 8));
    exit when not exists (
      select 1 from public.profiles where referral_code = candidate
    );
    tries := tries + 1;
    if tries > 20 then
      raise exception 'Não foi possível gerar código de indicação';
    end if;
  end loop;
  return candidate;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral_code text;
  v_referrer_id uuid;
begin
  insert into public.profiles (id, display_name, referral_code)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(new.email, '@', 1)
    ),
    public.generate_referral_code()
  )
  on conflict (id) do update
    set referral_code = coalesce(public.profiles.referral_code, public.generate_referral_code());

  v_referral_code := upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', '')));

  if v_referral_code <> '' then
    select id into v_referrer_id
    from public.profiles
    where referral_code = v_referral_code
      and id <> new.id
    limit 1;

    if v_referrer_id is not null then
      update public.profiles
      set referred_by_user_id = v_referrer_id
      where id = new.id
        and referred_by_user_id is null;
    end if;
  end if;

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

-- Códigos para perfis existentes
update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

grant execute on function public.generate_referral_code() to authenticated, service_role;
