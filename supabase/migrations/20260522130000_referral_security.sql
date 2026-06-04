-- CRASH Cifras — Endurecimento de segurança do sistema de indicação

-- Landing pública: expõe apenas código e nome (sem user_id)
create or replace function public.get_public_referrer_by_code(p_code text)
returns table (referral_code text, display_name text)
language sql
security definer
stable
set search_path = public
as $$
  select p.referral_code, p.display_name
  from public.profiles p
  where p.referral_code = upper(trim(p_code))
    and length(trim(p_code)) between 4 and 20
    and trim(p_code) ~ '^[a-zA-Z0-9-]+$'
  limit 1;
$$;

revoke all on function public.get_public_referrer_by_code(text) from public;
grant execute on function public.get_public_referrer_by_code(text) to anon, authenticated, service_role;

-- Crédito de bônus ao indicador (security definer — sem update direto exposto)
create or replace function public.credit_referrer_on_conversion(
  p_referred_user_id uuid,
  p_plano varchar,
  p_assinatura_id uuid,
  p_meses integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referrer_id uuid;
  v_existing_id uuid;
  v_restantes integer;
  v_acumulados integer;
  v_expira timestamptz;
  v_status varchar;
  v_proxima timestamptz;
  v_pausa timestamptz;
begin
  if p_meses is null or p_meses < 1 then
    return jsonb_build_object('credited', false, 'reason', 'invalid_months');
  end if;

  select referred_by_user_id into v_referrer_id
  from public.profiles
  where id = p_referred_user_id;

  if v_referrer_id is null or v_referrer_id = p_referred_user_id then
    return jsonb_build_object('credited', false, 'reason', 'no_referrer');
  end if;

  select id into v_existing_id
  from public.referral_conversions
  where referred_user_id = p_referred_user_id;

  if v_existing_id is not null then
    return jsonb_build_object('credited', false, 'reason', 'already_converted');
  end if;

  insert into public.referral_conversions (
    referrer_user_id,
    referred_user_id,
    plano,
    meses_creditados,
    assinatura_id
  ) values (
    v_referrer_id,
    p_referred_user_id,
    p_plano,
    p_meses,
    p_assinatura_id
  );

  select
    meses_bonus_restantes,
    meses_bonus_acumulados,
    assinatura_expira_em,
    assinatura_status,
    proxima_cobranca_em,
    cobranca_pausada_ate
  into v_restantes, v_acumulados, v_expira, v_status, v_proxima, v_pausa
  from public.user_settings
  where user_id = v_referrer_id;

  v_restantes := coalesce(v_restantes, 0) + p_meses;
  v_acumulados := coalesce(v_acumulados, 0) + p_meses;

  if v_status = 'ativa' and v_expira is not null then
    v_pausa := v_expira + (p_meses || ' months')::interval;
    v_proxima := v_pausa;
  end if;

  update public.user_settings
  set
    meses_bonus_restantes = v_restantes,
    meses_bonus_acumulados = v_acumulados,
    proxima_cobranca_em = coalesce(v_proxima, proxima_cobranca_em),
    cobranca_pausada_ate = coalesce(v_pausa, cobranca_pausada_ate),
    updated_at = now()
  where user_id = v_referrer_id;

  return jsonb_build_object(
    'credited', true,
    'referrer_id', v_referrer_id,
    'meses', p_meses,
    'proxima_cobranca', v_proxima
  );
end;
$$;

revoke all on function public.credit_referrer_on_conversion(uuid, varchar, uuid, integer) from public;
grant execute on function public.credit_referrer_on_conversion(uuid, varchar, uuid, integer) to service_role;

-- Contagem de indicações (security definer)
create or replace function public.count_referral_conversions(p_referrer_id uuid)
returns integer
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::integer
  from public.referral_conversions
  where referrer_user_id = p_referrer_id;
$$;

revoke all on function public.count_referral_conversions(uuid) from public;
grant execute on function public.count_referral_conversions(uuid) to authenticated, service_role;

-- Bloqueia leitura anônima direta em profiles para indicação
drop policy if exists "profiles_select_public_referral" on public.profiles;

-- Garante que referral_conversions não permite insert/update pelo cliente
drop policy if exists "referral_conversions_insert_own" on public.referral_conversions;
