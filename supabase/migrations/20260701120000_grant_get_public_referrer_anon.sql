-- CRASH Cifras — Restaura lookup público do indicador na landing /ref/:codigo
--
-- Contexto: 20260528150000 revogou EXECUTE de anon/authenticated (só service_role),
-- mas o frontend voltou a chamar get_public_referrer_by_code via Supabase client.
-- Visitantes não logados precisam de GRANT EXECUTE TO anon.
--
-- Segurança: SECURITY DEFINER + retorno limitado (referral_code, display_name apenas).
-- Sem user_id, e-mail ou outros campos sensíveis. Lookup exige código válido (4–20 chars).

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
